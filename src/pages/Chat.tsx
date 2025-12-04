import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from '@/components/ChatBubble';
import { ImageViewer } from '@/components/ImageViewer';
import { ConfidenceRating } from '@/components/ConfidenceRating';
import { useToast } from '@/hooks/use-toast';
import orbitLogo from '@/assets/orbit-logo.png';

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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confidenceSubmitted, setConfidenceSubmitted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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
    if (!voiceEnabled) return;
    
    try {
      setIsSpeaking(true);
      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, voice: 'Sarah' }),
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
    setConfidenceSubmitted(sessionData.confidence_after !== null);

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesData && messagesData.length > 0) {
      setMessages(messagesData);
    } else {
      // Check for pre-analyzed opening from session storage
      const pendingData = sessionStorage.getItem('pendingQuestion');
      let initialMessage = "Hey! I can see your question. Let's work through this together! What part would you like to start with?";
      
      if (pendingData) {
        try {
          const parsed = JSON.parse(pendingData);
          if (parsed.analysis?.socraticOpening) {
            initialMessage = parsed.analysis.socraticOpening;
          }
          sessionStorage.removeItem('pendingQuestion');
        } catch (e) {
          console.error('Failed to parse pending question:', e);
        }
      }

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
        // Speak the initial message
        speakText(initialMessage);
      }
    }

    setLoading(false);
  };

  const streamChat = async (allMessages: Message[]) => {
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
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let fullResponse = '';
    let streamDone = false;

    // Create placeholder message
    const placeholderId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: placeholderId,
      sender: 'tutor',
      content: '',
      created_at: new Date().toISOString(),
    }]);

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            setMessages(prev => prev.map(m => 
              m.id === placeholderId 
                ? { ...m, content: fullResponse }
                : m
            ));
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    return { fullResponse, placeholderId };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId || sending) return;

    setSending(true);
    stopSpeaking();
    const messageContent = newMessage;
    setNewMessage('');

    // Add student message
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

    try {
      const allMessages = [...messages, studentMessage];
      const { fullResponse, placeholderId } = await streamChat(allMessages);

      // Save the tutor response to DB
      const { data: tutorMessage } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender: 'tutor',
          content: fullResponse,
        })
        .select()
        .single();

      if (tutorMessage) {
        // Replace placeholder with real message
        setMessages(prev => prev.map(m => 
          m.id === placeholderId ? tutorMessage : m
        ));
        
        // Speak the response
        speakText(fullResponse);
      }
    } catch (error) {
      console.error('Stream error:', error);
      toast({
        variant: 'destructive',
        title: 'Error getting response',
        description: 'Please try again.',
      });
      // Remove placeholder on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    }

    setSending(false);
  };

  const handleConfidenceChange = async (value: number) => {
    if (!session || !user) return;

    await supabase
      .from('sessions')
      .update({ confidence_after: value })
      .eq('id', session.id);

    if (session.topic_id) {
      const { data: existingStat } = await supabase
        .from('practice_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', session.topic_id)
        .maybeSingle();

      if (existingStat) {
        await supabase
          .from('practice_stats')
          .update({
            attempts: existingStat.attempts + 1,
            correct_attempts: value >= 4 
              ? existingStat.correct_attempts + 1 
              : existingStat.correct_attempts,
          })
          .eq('id', existingStat.id);
      } else {
        await supabase
          .from('practice_stats')
          .insert({
            user_id: user.id,
            topic_id: session.topic_id,
            attempts: 1,
            correct_attempts: value >= 4 ? 1 : 0,
          });
      }
    }

    setConfidenceSubmitted(true);
    toast({
      title: 'Progress saved!',
      description: 'Keep up the amazing work.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src={orbitLogo} alt="Orbit" className="h-6 w-auto" />
              <span className="font-medium text-muted-foreground">Chat</span>
            </div>
          </div>
          
          {/* Voice toggle */}
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

      {/* Question Preview */}
      {(session?.question_image_url || session?.working_image_url) && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {session?.question_image_url && (
                <ImageViewer
                  src={session.question_image_url}
                  alt="Question"
                  className="w-20 h-20 flex-shrink-0"
                />
              )}
              {session?.working_image_url && (
                <ImageViewer
                  src={session.working_image_url}
                  alt="Working"
                  className="w-20 h-20 flex-shrink-0"
                />
              )}
            </div>
            {session?.question_text && session.question_text !== 'See attached image' && (
              <p className="text-sm text-muted-foreground mt-2">
                {session.question_text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              sender={message.sender}
              content={message.content}
              timestamp={new Date(message.created_at)}
            />
          ))}
          
          {sending && messages[messages.length - 1]?.sender === 'student' && (
            <div className="flex justify-start">
              <div className="bubble-tutor p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />

          {/* Confidence Rating */}
          {messages.length > 2 && !confidenceSubmitted && (
            <div className="bg-muted rounded-2xl p-4 mt-6 animate-fade-in border border-border">
              <ConfidenceRating
                value={null}
                onChange={handleConfidenceChange}
              />
            </div>
          )}

          {confidenceSubmitted && (
            <div className="text-center text-sm text-primary animate-fade-in">
              ✓ Progress saved
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={sending}
            className="rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="rounded-2xl px-6"
            style={{ 
              background: '#00FAD7',
              color: '#0B0D0F',
            }}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
