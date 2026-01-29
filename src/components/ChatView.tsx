import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Camera, Send, Mic, MicOff, Loader2, Volume2, VolumeX, Copy, ThumbsUp, ThumbsDown, Check, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSpeech } from '@/hooks/useSpeech';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { supabase } from '@/integrations/supabase/client';
import CitationText from './CitationText';
import QuestionReviewScreen from './QuestionReviewScreen';
import SignupPrompt from './SignupPrompt';
import VoiceChatPrompt from './VoiceChatPrompt';
import MomentumIndicator from './MomentumIndicator';
import MasteryMoment from './MasteryMoment';
import ModeToggle, { type TutorMode } from './ModeToggle';
import tutorAvatar from '@/assets/tutor-avatar.png';
import type { Source } from './panels/types';
import type { Message } from '@/hooks/useChat';

interface ChatViewProps {
  messages: Message[];
  sending: boolean;
  guestExchangeCount: number;
  guestLimit: number;
  isAtLimit: boolean;
  onSendMessage: (content: string, inputMethod?: 'text' | 'voice') => void;
  onSendImageMessage: (imageUrl: string, mode: 'coach' | 'check') => void;
  isAuthenticated: boolean;
  onStartVoiceSession?: () => void;
  sessionId?: string;
  // Mode control
  currentMode?: TutorMode;
  onModeChange?: (mode: TutorMode) => void;
  // Sources callbacks
  onOpenSources?: (sources: Source[], activeId?: number) => void;
}

export default function ChatView({
  messages,
  sending,
  guestExchangeCount,
  guestLimit,
  isAtLimit,
  onSendMessage,
  onSendImageMessage,
  isAuthenticated,
  onStartVoiceSession,
  sessionId,
  currentMode = 'coach',
  onModeChange,
  onOpenSources,
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [voiceNoteCount, setVoiceNoteCount] = useState(0);
  const [showVoiceChatPrompt, setShowVoiceChatPrompt] = useState(false);
  const [voicePromptShownAt2, setVoicePromptShownAt2] = useState(false);
  
  // Image review state - uses QuestionReviewScreen
  const [reviewImage, setReviewImage] = useState<string | null>(null);
  
  // TTS state - track which message is being played
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  // Feedback state - track which messages have been rated
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'thumbs_up' | 'thumbs_down' | null>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useSpeech();

  const { speak, stop, isPlaying, isLoading } = useTextToSpeech();

  // Check if voice prompt was dismissed
  const isVoicePromptDismissed = localStorage.getItem('orbitVoiceChatDismissed') === 'true';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && !sending && !isAtLimit) {
      onSendMessage(newMessage, 'text');
      setNewMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Open QuestionReviewScreen
        setReviewImage(base64);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleReviewComplete = (croppedImageUrl: string, mode: 'coach' | 'check') => {
    setReviewImage(null);
    onSendImageMessage(croppedImageUrl, mode);
  };

  const handleReviewCancel = () => {
    setReviewImage(null);
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(
        (transcript) => {
          if (transcript.trim()) {
            onSendMessage(transcript, 'voice');
            
            // Track voice note count for prompt logic
            const newCount = voiceNoteCount + 1;
            setVoiceNoteCount(newCount);
            
            // Show voice chat prompt after 2nd and 5th voice note (if not dismissed)
            if (!isVoicePromptDismissed) {
              if (newCount === 2 && !voicePromptShownAt2) {
                setTimeout(() => setShowVoiceChatPrompt(true), 1500);
                setVoicePromptShownAt2(true);
              } else if (newCount === 5) {
                setTimeout(() => setShowVoiceChatPrompt(true), 1500);
              }
            }
          }
        },
        () => {
          console.error('Speech recognition error');
        }
      );
    }
  };

  const handlePlayTTS = async (messageId: string, content: string) => {
    // Track listen action
    if (sessionId) {
      trackFeedback(messageId, 'listen');
    }
    
    if (playingMessageId === messageId && isPlaying) {
      stop();
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(messageId);
      speak(content);
    }
  };

  // Track feedback action
  const trackFeedback = async (messageId: string, feedbackType: 'thumbs_up' | 'thumbs_down' | 'copy' | 'listen') => {
    if (!sessionId) return;
    
    try {
      await supabase.from('message_feedback').insert({
        message_id: messageId,
        session_id: sessionId,
        feedback_type: feedbackType,
      });
    } catch (error) {
      console.error('Error tracking feedback:', error);
    }
  };

  const handleThumbsUp = async (messageId: string) => {
    if (feedbackGiven[messageId]) return; // Already rated
    setFeedbackGiven(prev => ({ ...prev, [messageId]: 'thumbs_up' }));
    await trackFeedback(messageId, 'thumbs_up');
  };

  const handleThumbsDown = async (messageId: string) => {
    if (feedbackGiven[messageId]) return; // Already rated
    setFeedbackGiven(prev => ({ ...prev, [messageId]: 'thumbs_down' }));
    await trackFeedback(messageId, 'thumbs_down');
  };

  const handleCopy = async (messageId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    await trackFeedback(messageId, 'copy');
    setTimeout(() => setCopiedMessageId(null), 2000);
  };
  // Reset playing state when TTS stops
  useEffect(() => {
    if (!isPlaying && !isLoading) {
      setPlayingMessageId(null);
    }
  }, [isPlaying, isLoading]);

  const handleStartVoiceChat = () => {
    setShowVoiceChatPrompt(false);
    onStartVoiceSession?.();
  };

  // Handle citation click - emit to parent to open sources panel
  const handleCitationClick = useCallback((message: Message, sourceId: number) => {
    if (message.sources && message.sources.length > 0) {
      onOpenSources?.(message.sources, sourceId);
    }
  }, [onOpenSources]);

  // Open sources panel for a message
  const handleOpenSources = useCallback((message: Message) => {
    if (message.sources && message.sources.length > 0) {
      onOpenSources?.(message.sources);
    }
  }, [onOpenSources]);

  // QuestionReviewScreen fullscreen for adding working
  if (reviewImage) {
    return (
      <QuestionReviewScreen
        imageUrl={reviewImage}
        onComplete={handleReviewComplete}
        onCancel={handleReviewCancel}
      />
    );
  }

  // Calculate exchange count (pairs of student/tutor messages)
  const exchangeCount = useMemo(() => {
    return Math.floor(messages.filter(m => m.sender === 'student').length);
  }, [messages]);

  // Check if any message is marked as correct
  const hasCorrectAnswer = useMemo(() => {
    return messages.some(m => m.isCorrect);
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-base-100">
      
      {/* Momentum Indicator - shows when conversation is active */}
      {messages.length > 0 && (
        <MomentumIndicator 
          exchangeCount={exchangeCount}
          hasCorrectAnswer={hasCorrectAnswer}
          className="border-b border-base-300/50"
        />
      )}

      {/* Mode Toggle - shows during active sessions */}
      {messages.length > 0 && onModeChange && (
        <div className="flex justify-center py-2 border-b border-base-300/50">
          <ModeToggle
            mode={currentMode}
            onChange={onModeChange}
            disabled={sending}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-greeting">
            {/* Tutor Avatar with glow */}
            <div className="relative mb-4">
              <div className="absolute inset-0 logo-glow scale-150 opacity-50" />
              <img 
                src={tutorAvatar} 
                alt="Orbit tutor"
                className="relative h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
              />
            </div>
            
            {/* Greeting */}
            <div className="bg-base-200 rounded-2xl px-5 py-4 max-w-[280px]">
              <p className="text-sm font-medium text-primary mb-1">Orbit</p>
              <p className="text-sm leading-relaxed text-base-content">
                Hey! What are you working on? Snap a photo or describe what you're stuck on.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.sender === 'student' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                message.sender === 'student'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-base-content',
                message.isCorrect && 'ring-2 ring-green-500'
              )}
            >
              {message.imageUrl && (
                <img
                  src={message.imageUrl}
                  alt="Uploaded"
                  className="max-w-full rounded-lg mb-2"
                />
              )}
              <CitationText 
                text={message.content} 
                hasSources={!!message.sources?.length}
                onCitationClick={(sourceId) => handleCitationClick(message, sourceId)}
              />
              {message.isTyping && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
              
              {/* Sources badge for messages with sources */}
              {message.sources && message.sources.length > 0 && !message.isTyping && (
                <button
                  onClick={() => handleOpenSources(message)}
                  className="mt-3 block text-[10px] text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" />
                    {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                  </span>
                </button>
              )}

              {/* Feedback buttons for tutor messages */}
              {message.sender === 'tutor' && !message.isTyping && (
                <div className="mt-2 pt-2 border-t border-base-300/30 flex items-center justify-between">
                  {/* Left side: copy, thumbs */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-base-content/40 hover:text-base-content"
                      onClick={() => handleCopy(message.id, message.content)}
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0",
                        feedbackGiven[message.id] === 'thumbs_up' 
                          ? "text-success" 
                          : "text-base-content/40 hover:text-base-content"
                      )}
                      onClick={() => handleThumbsUp(message.id)}
                      disabled={!!feedbackGiven[message.id]}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0",
                        feedbackGiven[message.id] === 'thumbs_down' 
                          ? "text-error" 
                          : "text-base-content/40 hover:text-base-content"
                      )}
                      onClick={() => handleThumbsDown(message.id)}
                      disabled={!!feedbackGiven[message.id]}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  {/* Right side: listen */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1.5 text-xs text-base-content/40 hover:text-base-content"
                    onClick={() => handlePlayTTS(message.id, message.content)}
                    disabled={isLoading && playingMessageId === message.id}
                  >
                    {isLoading && playingMessageId === message.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isPlaying && playingMessageId === message.id ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                    {isPlaying && playingMessageId === message.id ? 'Stop' : 'Listen'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Mastery Moment - appears after correct answer */}
        {hasCorrectAnswer && (
          <MasteryMoment 
            exchangeCount={exchangeCount}
            className="mx-auto max-w-[85%]"
          />
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-base-content/60" />
              <span className="text-sm text-base-content/60">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Signup Prompt or Input Bar */}
      {isAtLimit ? (
        <SignupPrompt exchangeCount={guestExchangeCount} limit={guestLimit} />
      ) : (
        <div className="shrink-0 relative">
          {/* Subtle mint glow behind input */}
          <div className="absolute inset-x-0 -top-8 h-16 bg-gradient-to-t from-primary/8 via-primary/4 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-radial from-primary/6 via-transparent to-transparent pointer-events-none blur-xl" />
          
          <div className="relative border-t border-base-300 bg-base-100/95 backdrop-blur-sm p-4">
          {/* Guest exchange counter */}
          {!isAuthenticated && guestExchangeCount > 0 && (
            <div className="text-center mb-2">
              <span className="text-xs text-base-content/60">
                {guestExchangeCount}/{guestLimit} free messages
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {/* Photo button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Camera className="h-5 w-5" />
            </Button>

            {/* Text input */}
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you stuck on?"
              disabled={sending}
              className="flex-1"
            />

            {/* Voice button */}
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={handleMicClick}
              disabled={sending}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          </div>
        </div>
      )}

      {/* Voice Chat Prompt */}
      <VoiceChatPrompt
        open={showVoiceChatPrompt}
        onOpenChange={setShowVoiceChatPrompt}
        onStartVoiceChat={handleStartVoiceChat}
        showDontShowAgain={voiceNoteCount >= 5}
      />
    </div>
  );
}
