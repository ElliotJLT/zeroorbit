import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, X, Volume2, VolumeX, Mic, MicOff, Send, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import orbitLogo from '@/assets/orbit-logo.png';
import orbitIcon from '@/assets/orbit-icon.png';

interface QuestionAnalysis {
  questionSummary: string;
  topic: string;
  difficulty: string;
  socraticOpening: string;
}

interface Message {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  imageUrl?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;
const MAX_FREE_EXCHANGES = 4;

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'upload' | 'preview' | 'chat'>('intro');
  const [questionText, setQuestionText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);
  const [level, setLevel] = useState<'gcse' | 'a-level'>('gcse');
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-GB';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          sendMessage(transcript);
        }
        setIsRecording(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        toast({
          variant: 'destructive',
          title: 'Voice not recognized',
          description: 'Please try again or type your message.',
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      stopSpeaking();
      recognitionRef.current.start();
    } else if (!recognitionRef.current) {
      // Fallback to text input if speech recognition not available
      setShowInput(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakText = useCallback(async (text: string, messageId?: string) => {
    if (!voiceEnabled) {
      setSpeakingMessageId(null);
      return;
    }
    
    try {
      setIsSpeaking(true);
      if (messageId) setSpeakingMessageId(messageId);
      
      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        return;
      }

      const { audioContent } = await response.json();
      
      if (audioRef.current) audioRef.current.pause();
      
      const audio = new Audio(`data:audio/mpeg;base64,${audioContent}`);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };
      await audio.play();
    } catch (error) {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setStep('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && step === 'chat') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImageUrl = reader.result as string;
        // Add image as a student message
        const imageMessage: Message = {
          id: `msg-${Date.now()}`,
          sender: 'student',
          content: 'Here\'s another part of my question:',
          imageUrl: newImageUrl,
        };
        setMessages(prev => [...prev, imageMessage]);
        // Send to AI
        sendMessage('I\'ve uploaded another image related to my question. Can you help me with this part too?');
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeAndStartChat = async () => {
    if (!imagePreview) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64: imagePreview,
          questionText: questionText 
        }
      });

      if (response.error) throw new Error(response.error.message);

      const analysisData = response.data as QuestionAnalysis;
      setAnalysis(analysisData);
      
      const initialMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: 'tutor',
        content: analysisData.socraticOpening,
      };
      
      setMessages([initialMessage]);
      setStep('chat');
      speakText(analysisData.socraticOpening, initialMessage.id);
      
    } catch (error) {
      console.error('Analysis error:', error);
      const fallbackMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: 'tutor',
        content: "Hey! I can see your question. Let me help you work through it step by step. What have you tried so far?",
      };
      setMessages([fallbackMessage]);
      setStep('chat');
      speakText(fallbackMessage.content, fallbackMessage.id);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const streamChat = async (allMessages: Message[]): Promise<string> => {
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
        questionContext: `Student level: ${level.toUpperCase()}. ${questionText || 'See attached image'}`,
      }),
    });

    if (!response.ok || !response.body) throw new Error('Failed to stream');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let fullResponse = '';
    let streamDone = false;

    const placeholderId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: placeholderId,
      sender: 'tutor',
      content: '',
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
              m.id === placeholderId ? { ...m, content: fullResponse } : m
            ));
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    setMessages(prev => prev.map(m => 
      m.id === placeholderId ? { ...m, id: `msg-${Date.now()}`, content: fullResponse } : m
    ));

    return fullResponse;
  };

  const sendMessage = async (content?: string) => {
    const messageContent = content || newMessage.trim();
    if (!messageContent || sending) return;

    if (exchangeCount >= MAX_FREE_EXCHANGES) {
      sessionStorage.setItem('pendingQuestion', JSON.stringify({
        text: questionText || 'See attached image',
        image: imagePreview,
        analysis,
        messages,
      }));
      navigate('/auth');
      return;
    }

    setSending(true);
    stopSpeaking();
    setNewMessage('');
    setShowInput(false);

    const studentMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      content: messageContent,
    };

    setMessages(prev => [...prev, studentMessage]);

    try {
      const allMessages = [...messages, studentMessage];
      const response = await streamChat(allMessages);
      setExchangeCount(prev => prev + 1);
      
      // Get the last tutor message ID for voice-first mode
      setMessages(prev => {
        const lastTutorMsg = [...prev].reverse().find(m => m.sender === 'tutor');
        if (lastTutorMsg) {
          speakText(response, lastTutorMsg.id);
        }
        return prev;
      });
      
      if (exchangeCount + 1 >= MAX_FREE_EXCHANGES) {
        setTimeout(() => {
          toast({
            title: "You're doing great!",
            description: "Sign up free to keep chatting with Orbit",
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please try again.',
      });
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    }

    setSending(false);
  };

  const clearImage = () => {
    setImagePreview(null);
    setAnalysis(null);
    setIsAnalyzing(false);
    setStep('upload');
  };

  // Intro screen
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-lg w-full space-y-12 animate-fade-in">
            <div className="relative flex flex-col items-center mb-8">
              <div 
                className="absolute w-48 h-48 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ background: 'radial-gradient(circle, rgba(0,250,215,0.35) 0%, transparent 70%)' }}
              />
              <img src={orbitLogo} alt="Orbit" className="relative h-44 w-auto" />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl tracking-tight leading-[1.15]" style={{ textShadow: '0 0 40px rgba(0,250,215,0.08)' }}>
                <span className="font-semibold">Stuck on a maths question?</span>
                <br />
                <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Show Orbit.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Get a step-by-step walkthrough made for AQA, Edexcel and OCR students.
              </p>
            </div>

            <Button
              onClick={() => setStep('upload')}
              className="w-full max-w-xs mx-auto h-14 text-base rounded-full font-medium transition-all text-white"
              style={{ background: '#111416', border: '1px solid #00FAD7' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(0,250,215,0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <Camera className="h-5 w-5 mr-2" />
              Snap a Question
            </Button>

            <div className="pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                24/7 • Step-by-step GCSE & A-Level help • No sign-up to try
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Built with Zero Gravity mentors
              </p>
            </div>
          </div>
        </main>

        <footer className="p-6 text-center space-y-6">
          <button onClick={() => navigate('/auth')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Already have an account? <span className="text-primary">Sign in</span>
          </button>
          <div className="pt-2">
            <img src={orbitIcon} alt="Zero Gravity" className="h-10 w-auto mx-auto opacity-50" />
          </div>
        </footer>
      </div>
    );
  }

  // Camera screen
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => setStep('intro')} className="text-sm text-white/70 hover:text-white transition-colors">← Back</button>
          <h2 className="text-lg font-medium text-white">Snap your question</h2>
          <div className="w-12" />
        </div>

        {/* Level selector */}
        <div className="flex justify-center gap-2 px-4 pb-4">
          <button
            onClick={() => setLevel('gcse')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              level === 'gcse' 
                ? 'bg-primary text-background' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            GCSE
          </button>
          <button
            onClick={() => setLevel('a-level')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              level === 'a-level' 
                ? 'bg-primary text-background' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            A-Level
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-sm aspect-[3/4] rounded-3xl border-2 border-white/20 bg-white/5 flex flex-col items-center justify-center gap-6 transition-all hover:border-primary/50 hover:bg-white/10"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,250,215,0.2)' }}>
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-medium">Tap to open camera</p>
              <p className="text-white/50 text-sm">Make sure the whole question is in frame and in focus</p>
            </div>
          </button>
          <p className="text-white/40 text-xs mt-4 text-center max-w-xs">
            Works best on printed or clearly written questions
          </p>
        </div>

        <div className="p-6">
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                    setStep('preview');
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white transition-colors py-2"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>
    );
  }

  // Preview screen with shimmer
  if (step === 'preview') {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => !isAnalyzing && setStep('upload')}
              className={`text-sm transition-colors ${isAnalyzing ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ← Back
            </button>
          </div>

          <div className="flex-1 flex flex-col space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {isAnalyzing ? 'Analysing...' : 'Review your question'}
              </h2>
              <p className="text-muted-foreground">
                {isAnalyzing ? 'Orbit is figuring out how to help' : 'Add details to get better help'}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-xl">
              <img
                src={imagePreview!}
                alt="Question"
                className={`w-full border border-border rounded-xl transition-all duration-300 ${isAnalyzing ? 'opacity-70' : ''}`}
              />
              {isAnalyzing && (
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <div 
                    className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,250,215,0.15) 50%, transparent 100%)' }}
                  />
                </div>
              )}
              {!isAnalyzing && (
                <button onClick={clearImage} className="absolute top-3 right-3 p-2 rounded-full bg-background/90 backdrop-blur-sm hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className={`transition-opacity duration-300 ${isAnalyzing ? 'opacity-30 pointer-events-none' : ''}`}>
              <Textarea
                placeholder="Add context or specify what you need help with (optional)"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="min-h-[100px] rounded-xl bg-muted border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary"
                disabled={isAnalyzing}
              />
            </div>

            <div className="space-y-3 pt-2">
              <Button onClick={analyzeAndStartChat} disabled={isAnalyzing} className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-70">
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Thinking...
                  </span>
                ) : (
                  <>Get Help<ArrowRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">No sign-up required</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat screen
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => setStep('preview')} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
          <img src={orbitLogo} alt="Orbit" className="h-12 w-auto" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setVoiceEnabled(!voiceEnabled);
            }}
            className={`rounded-full ${isSpeaking ? 'text-primary' : ''}`}
          >
            {voiceEnabled ? <Volume2 className={`h-5 w-5 ${isSpeaking ? 'animate-pulse' : ''}`} /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Question Card */}
          {imagePreview && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-background font-bold text-sm">O</span>
                </div>
                <div>
                  <span className="font-medium text-sm">Joe</span>
                  {analysis?.difficulty && <span className="text-xs text-muted-foreground ml-2">{analysis.difficulty}</span>}
                </div>
              </div>
              <img src={imagePreview} alt="Question" className="w-full max-h-48 object-contain bg-muted/30" />
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`rounded-2xl p-4 ${message.sender === 'tutor' ? 'bg-card border border-border' : 'bg-primary/10 ml-8'}`}
            >
              {message.sender === 'tutor' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full bg-primary flex items-center justify-center ${speakingMessageId === message.id ? 'animate-pulse' : ''}`}>
                    <span className="text-background font-bold text-xs">O</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {speakingMessageId === message.id ? 'Orbit is speaking...' : 'Orbit'}
                  </span>
                </div>
              )}
              {message.imageUrl && (
                <img src={message.imageUrl} alt="Uploaded" className="w-full max-h-32 object-contain rounded-lg mb-2" />
              )}
              <p className={`text-sm leading-relaxed ${message.sender === 'student' ? 'text-right' : ''}`}>
                {speakingMessageId === message.id && message.sender === 'tutor' ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : message.content || (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </p>
            </div>
          ))}

          {/* Signup prompt after limit */}
          {exchangeCount >= MAX_FREE_EXCHANGES && (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 text-center space-y-4 animate-fade-in">
              <h3 className="font-semibold text-lg">You&apos;re doing great! 🎉</h3>
              <p className="text-sm text-muted-foreground">Sign up free to keep chatting with Orbit and save your progress</p>
              <Button onClick={() => {
                sessionStorage.setItem('pendingQuestion', JSON.stringify({ text: questionText, image: imagePreview, analysis, messages }));
                navigate('/auth');
              }} className="rounded-full">
                Continue Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Free exchanges counter */}
      <div className="text-center py-2 text-xs text-muted-foreground">
        {exchangeCount < MAX_FREE_EXCHANGES ? (
          `${MAX_FREE_EXCHANGES - exchangeCount} free messages left`
        ) : (
          'Sign up to continue'
        )}
      </div>

      {/* Click outside to close input */}
      {showInput && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowInput(false)} 
        />
      )}

      {/* Bottom action bar */}
      {exchangeCount < MAX_FREE_EXCHANGES && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
          <div className="max-w-2xl mx-auto">
            {/* Hidden file input for chat image upload */}
            <input 
              ref={chatFileInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleChatImageUpload} 
            />
            
            <div className="flex items-center justify-center gap-3">
              {/* Camera button - hidden when input shown */}
              {!showInput && (
                <button 
                  onClick={() => chatFileInputRef.current?.click()} 
                  disabled={sending} 
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-all duration-300 disabled:opacity-50"
                >
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </button>
              )}

              {/* Mic button - hidden when input shown */}
              {!showInput && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={sending}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 ${
                    isRecording ? 'animate-pulse' : ''
                  }`}
                  style={{ 
                    background: isRecording 
                      ? 'linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%)' 
                      : 'linear-gradient(135deg, #00FAD7 0%, #00C4AA 100%)', 
                    boxShadow: isRecording 
                      ? '0 0 30px rgba(255,107,107,0.5)' 
                      : isSpeaking 
                        ? '0 0 30px rgba(0,250,215,0.5)' 
                        : '0 4px 20px rgba(0,250,215,0.3)' 
                  }}
                >
                  {sending ? (
                    <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-6 w-6 text-white" />
                  ) : (
                    <Mic className="h-6 w-6 text-background" />
                  )}
                </button>
              )}

              {/* Text input - appears when showInput is true */}
              <div className={`flex-1 transition-all duration-300 overflow-hidden ${
                showInput ? 'max-w-md opacity-100' : 'max-w-0 opacity-0'
              }`}>
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={sending}
                  autoFocus={showInput}
                  className="rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                />
              </div>

              {/* Send button - transforms position */}
              <button 
                onClick={() => {
                  if (showInput && newMessage.trim()) {
                    sendMessage();
                  } else {
                    setShowInput(true);
                  }
                }}
                disabled={sending || (showInput && !newMessage.trim())}
                className={`rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 ${
                  showInput 
                    ? 'w-12 h-12 bg-primary' 
                    : 'w-12 h-12 bg-muted hover:bg-muted/80'
                }`}
              >
                <Send className={`h-5 w-5 transition-colors ${showInput ? 'text-background' : 'text-muted-foreground'}`} />
              </button>
            </div>
            
            <p className={`text-center text-xs text-muted-foreground mt-3 transition-opacity duration-300 ${showInput ? 'opacity-0' : ''}`}>
              {isRecording ? 'Listening... tap to stop' : 'Tap mic to speak • Camera for more images'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
