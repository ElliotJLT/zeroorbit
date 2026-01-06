import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat, RealtimeChatConfig, RealtimeEvent } from '@/utils/RealtimeAudio';
import orbitIcon from '@/assets/orbit-icon.png';

interface VoiceSessionProps {
  config: RealtimeChatConfig;
  onEnd: () => void;
  onSwitchToText: () => void;
}

interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isPartial?: boolean;
}

const VoiceSession: React.FC<VoiceSessionProps> = ({ config, onEnd, onSwitchToText }) => {
  const { toast } = useToast();
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const chatRef = useRef<RealtimeChat | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);
  const currentTranscriptRef = useRef('');

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentTranscript]);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    console.log('VoiceSession received event:', event.type);
    
    switch (event.type) {
      case 'session.created':
        console.log('Session created, waiting for conversation');
        break;
        
      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        setIsSpeaking(false);
        break;
        
      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        if (event.transcript) {
          const id = event.item_id || `user-${Date.now()}`;
          setTranscript(prev => {
            const existing = prev.find(t => t.id === id);
            if (existing) {
              return prev.map(t => t.id === id ? { ...t, content: event.transcript as string, isPartial: false } : t);
            }
            return [...prev, { id, role: 'user', content: event.transcript as string }];
          });
        }
        break;
        
      case 'response.audio_transcript.delta':
        // AI is speaking - accumulate transcript
        if (event.delta) {
          currentTranscriptRef.current += event.delta;
          setCurrentTranscript(currentTranscriptRef.current);
          setIsSpeaking(true);
        }
        break;
        
      case 'response.audio_transcript.done':
        // AI finished speaking this segment
        if (currentTranscriptRef.current || event.transcript) {
          const content = (event.transcript as string) || currentTranscriptRef.current;
          const id = event.item_id || `assistant-${Date.now()}`;
          setTranscript(prev => [...prev, { id, role: 'assistant', content }]);
          currentTranscriptRef.current = '';
          setCurrentTranscript('');
        }
        break;
        
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
        
      case 'response.done':
        setIsSpeaking(false);
        setCurrentTranscript('');
        break;
        
      case 'error':
        console.error('Realtime API error:', event);
        toast({
          variant: 'destructive',
          title: 'Voice Error',
          description: 'Something went wrong. Try again.',
        });
        break;
    }
  }, [toast]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      setConnectionState('connected');
      toast({
        title: 'Voice connected',
        description: 'You can now talk naturally with your tutor.',
      });
    } else if (connectionState === 'connected') {
      // Was connected, now disconnected
      setConnectionState('error');
    }
  }, [connectionState, toast]);

  // Initialize realtime chat - only once
  useEffect(() => {
    // Prevent multiple initializations
    if (initializingRef.current || chatRef.current) {
      return;
    }
    initializingRef.current = true;

    const initChat = async () => {
      try {
        chatRef.current = new RealtimeChat(handleEvent, handleConnectionChange);
        await chatRef.current.init(config);
      } catch (error) {
        console.error('Failed to initialize voice session:', error);
        setConnectionState('error');
        toast({
          variant: 'destructive',
          title: 'Connection failed',
          description: error instanceof Error ? error.message : 'Could not start voice session.',
        });
      }
    };

    initChat();

    return () => {
      chatRef.current?.disconnect();
      chatRef.current = null;
      initializingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = () => {
    chatRef.current?.disconnect();
    onEnd();
  };

  // Render based on connection state
  if (connectionState === 'connecting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative">
            <div 
              className="absolute w-32 h-32 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
              style={{ background: 'radial-gradient(circle, rgba(0,250,215,0.4) 0%, transparent 70%)' }}
            />
            <img src={orbitIcon} alt="Orbit" className="relative w-20 h-20 mx-auto" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Connecting...</h2>
            <p className="text-muted-foreground">Setting up your voice session</p>
          </div>
          <div className="flex justify-center">
            <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-[shimmer_1.5s_infinite]" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (connectionState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <PhoneOff className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Connection Failed</h2>
            <p className="text-muted-foreground">
              Couldn't establish a voice connection. This might be due to microphone permissions or network issues.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={onSwitchToText} variant="default">
              <MessageSquare className="w-4 h-4 mr-2" />
              Switch to Text Chat
            </Button>
            <Button onClick={onEnd} variant="ghost">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={orbitIcon} 
              alt="Orbit" 
              className={`w-10 h-10 rounded-full ${isSpeaking ? 'animate-pulse' : ''}`}
            />
            {isSpeaking && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">Voice Session</p>
            <p className="text-xs text-muted-foreground">
              {isSpeaking ? 'Orbit is speaking...' : isListening ? 'Listening...' : 'Ready to help'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onSwitchToText}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Text
        </Button>
      </div>

      {/* Visual feedback area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div 
          className={`absolute w-64 h-64 blur-3xl transition-all duration-500 ${
            isSpeaking ? 'opacity-60 scale-110' : isListening ? 'opacity-40 scale-100' : 'opacity-20 scale-90'
          }`}
          style={{ background: 'radial-gradient(circle, rgba(0,250,215,0.5) 0%, transparent 70%)' }}
        />
        
        {/* Main visual */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Audio visualization */}
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isSpeaking ? 'bg-primary/20 scale-110' : isListening ? 'bg-primary/30 scale-105' : 'bg-muted'
          }`}>
            {isListening ? (
              <Mic className="w-12 h-12 text-primary animate-pulse" />
            ) : (
              <img src={orbitIcon} alt="Orbit" className={`w-16 h-16 ${isSpeaking ? 'animate-pulse' : ''}`} />
            )}
          </div>
          
          {/* Current transcript (what AI is saying) */}
          {currentTranscript && (
            <div className="max-w-md text-center animate-fade-in">
              <p className="text-lg leading-relaxed">{currentTranscript}</p>
            </div>
          )}
          
          {/* Instructions */}
          {!isSpeaking && !isListening && !currentTranscript && (
            <p className="text-muted-foreground text-center max-w-xs">
              Just start speaking naturally. I'm listening and ready to help with your question.
            </p>
          )}
        </div>
      </div>

      {/* Transcript history */}
      {transcript.length > 0 && (
        <div className="px-4 py-2 border-t border-border max-h-40 overflow-y-auto">
          <div className="space-y-2 max-w-2xl mx-auto">
            {transcript.slice(-5).map((item) => (
              <div 
                key={item.id}
                className={`text-sm ${item.role === 'user' ? 'text-right text-muted-foreground' : 'text-left'}`}
              >
                <span className={item.role === 'user' ? 'bg-primary/10 px-2 py-1 rounded-lg inline-block' : ''}>
                  {item.content}
                </span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="p-6 border-t border-border">
        <div className="flex items-center justify-center gap-4">
          {/* Mic indicator */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isListening 
              ? 'bg-primary text-background animate-pulse' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </div>
          
          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 transition-colors"
          >
            <PhoneOff className="w-7 h-7 text-destructive-foreground" />
          </button>
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          {isListening ? 'Listening...' : 'Speak naturally • I\'ll respond automatically'}
        </p>
      </div>
    </div>
  );
};

export default VoiceSession;
