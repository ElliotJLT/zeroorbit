import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Mic, X, Volume2, VolumeX, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import orbitIcon from '@/assets/orbit-icon.png';

interface Session {
  id: string;
  question_text: string;
  question_image_url: string | null;
  working_image_url: string | null;
  confidence_after: number | null;
  topic_id: string | null;
}

interface Message {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  created_at: string;
}

interface QuestionAnalysis {
  questionSummary: string;
  topic: string;
  difficulty: string;
  socraticOpening: string;
}

interface TutorResponse {
  reply_text: string;
  short_title?: string;
  topic: string;
  difficulty: string;
  mode: string;
  next_action: string;
}

interface UserContext {
  level: string;
  board: string;
  tier?: string;
  targetGrade?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('');
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch user profile for context
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('year_group, exam_board, tier, target_grade')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const isGCSE = profile.year_group === 'Y10' || profile.year_group === 'Y11';
        setUserContext({
          level: isGCSE ? 'GCSE' : 'A-Level',
          board: profile.exam_board || 'Unknown',
          tier: isGCSE ? profile.tier || undefined : undefined,
          targetGrade: profile.target_grade || undefined,
        });
      }
    };
    
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (sessionId && user) {
      fetchSession();
    }
  }, [sessionId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || !text || !text.trim()) return;
    
    try {
      setIsSpeaking(true);
      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error('TTS error:', response.status);
        setIsSpeaking(false);
        return;
      }

      const { audioContent } = await response.json();
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(`data:audio/mpeg;base64,${audioContent}`);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const fetchSession = async () => {
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      toast({
        variant: 'destructive',
        title: 'Session not found',
        description: 'This session may have been deleted.',
      });
      navigate('/home');
      return;
    }

    setSession(sessionData);

    // Check for pre-analyzed data from session storage
    const pendingData = sessionStorage.getItem('pendingQuestion');
    let initialMessage = "Right, let's see what you've got. What have you tried so far?";
    
    if (pendingData) {
      try {
        const parsed = JSON.parse(pendingData);
        if (parsed.analysis) {
          setAnalysis(parsed.analysis);
          initialMessage = parsed.analysis.socraticOpening;
          if (parsed.analysis.topic) setCurrentTopic(parsed.analysis.topic);
          if (parsed.analysis.difficulty) setCurrentDifficulty(parsed.analysis.difficulty);
        }
        sessionStorage.removeItem('pendingQuestion');
      } catch (e) {
        console.error('Failed to parse pending question:', e);
      }
    }

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesData && messagesData.length > 0) {
      setMessages(messagesData);
    } else {
      const { data: newMsg } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender: 'tutor',
          content: initialMessage,
        })
        .select()
        .single();

      if (newMsg) {
        setMessages([newMsg]);
        speakText(initialMessage);
      }
    }

    setLoading(false);
  };

  const fetchTutorResponse = async (allMessages: Message[]): Promise<TutorResponse> => {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: allMessages.map(m => ({
          role: m.sender,
          content: m.content,
        })),
        questionContext: session?.question_text,
        userContext: userContext,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please try again later.');
      }
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data as TutorResponse;
  };

  const sendMessage = async (content?: string) => {
    const messageContent = content || newMessage.trim();
    if (!messageContent || !sessionId || sending) return;

    setSending(true);
    stopSpeaking();
    setNewMessage('');
    setShowInput(false);

    const { data: studentMessage, error: studentError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        sender: 'student',
        content: messageContent,
      })
      .select()
      .single();

    if (studentError) {
      toast({
        variant: 'destructive',
        title: 'Error sending message',
        description: studentError.message,
      });
      setSending(false);
      return;
    }

    setMessages(prev => [...prev, studentMessage]);

    // Add placeholder for tutor response
    const placeholderId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: placeholderId,
      sender: 'tutor',
      content: '',
      created_at: new Date().toISOString(),
    }]);

    try {
      const allMessages = [...messages, studentMessage];
      const tutorResponse = await fetchTutorResponse(allMessages);

      // Update metadata from response
      if (tutorResponse.topic) setCurrentTopic(tutorResponse.topic);
      if (tutorResponse.difficulty) setCurrentDifficulty(tutorResponse.difficulty);

      const replyText = tutorResponse?.reply_text?.trim() || "I'm having trouble responding. Could you try again?";
      
      const { data: tutorMessage, error: msgError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender: 'tutor',
          content: replyText,
        })
        .select()
        .single();

      if (msgError) {
        console.error('Message save error:', msgError);
      }

      // Always replace placeholder with actual message or fallback
      setMessages(prev => prev.map(m => 
        m.id === placeholderId 
          ? (tutorMessage || { ...m, content: replyText }) 
          : m
      ));
      
      // Speak the response (TTS errors are handled internally)
      if (replyText) {
        speakText(replyText);
      }
    } catch (error) {
      console.error('Response error:', error);
      // Replace placeholder with error message instead of removing
      setMessages(prev => prev.map(m => 
        m.id === placeholderId 
          ? { ...m, content: "Sorry, I couldn't respond. Please try again." }
          : m
      ));
      toast({
        variant: 'destructive',
        title: 'Error getting response',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }

    setSending(false);
  };

  const handleNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage("I have another question to show you (new image uploaded)");
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div 
            className="absolute w-16 h-16 blur-xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'radial-gradient(circle, rgba(0,250,215,0.4) 0%, transparent 70%)' }}
          />
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <img src={orbitIcon} alt="Orbit" className="h-10 w-auto" />
              <span className="font-semibold text-lg">Orbit</span>
            </div>
            {currentTopic && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {currentTopic} {currentDifficulty && `• ${currentDifficulty}`}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setVoiceEnabled(!voiceEnabled);
            }}
            className={`rounded-full ${isSpeaking ? 'text-primary' : ''}`}
          >
            {voiceEnabled ? (
              <Volume2 className={`h-5 w-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Question Card */}
          {session?.question_image_url && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs text-primary font-medium">?</span>
                </div>
                <span className="font-medium text-sm">
                  {analysis?.topic || currentTopic || 'Maths Question'}
                </span>
                {(analysis?.difficulty || currentDifficulty) && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {analysis?.difficulty || currentDifficulty}
                  </span>
                )}
              </div>
              <img
                src={session.question_image_url}
                alt="Question"
                className="w-full max-h-64 object-contain bg-muted/30"
              />
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`rounded-2xl p-4 ${
                message.sender === 'tutor' 
                  ? 'bg-card border border-border' 
                  : 'bg-primary/10 ml-8'
              }`}
            >
              {message.sender === 'tutor' && (
                <div className="flex items-center gap-3 mb-3">
                  <img src={orbitIcon} alt="Orbit" className="w-10 h-10 object-contain" />
                  <span className="text-sm font-medium text-foreground">Orbit</span>
                </div>
              )}
              <p className={`text-sm leading-relaxed ${message.sender === 'student' ? 'text-right' : ''}`}>
                {message.content || (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </p>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Text input overlay */}
      {showInput && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-end">
          <div className="w-full p-4 bg-background border-t border-border">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Type your response</span>
                <button 
                  onClick={() => setShowInput(false)}
                  className="ml-auto p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question or explain your thinking..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={sending}
                  autoFocus
                  className="rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={sending || !newMessage.trim()}
                  className="rounded-2xl px-6"
                  style={{ background: '#00FAD7', color: '#0B0D0F' }}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            {/* Camera button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleNewImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Main mic/record button */}
            <button
              onClick={() => setShowInput(true)}
              disabled={sending}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
              style={{ 
                background: 'linear-gradient(135deg, #00FAD7 0%, #00C4AA 100%)',
                boxShadow: isSpeaking ? '0 0 30px rgba(0,250,215,0.5)' : '0 4px 20px rgba(0,250,215,0.3)'
              }}
            >
              {sending ? (
                <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Mic className="h-6 w-6 text-background" />
              )}
            </button>

            {/* Close/stop button */}
            <button
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                } else {
                  navigate('/home');
                }
              }}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          
          <p className="text-center text-xs text-muted-foreground mt-3">
            Tap mic to type • Camera for new question
          </p>
        </div>
      </div>
    </div>
  );
}