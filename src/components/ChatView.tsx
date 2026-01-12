import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Send, Mic, MicOff, Loader2, Sparkles, X, Volume2, VolumeX, Copy, ThumbsUp, ThumbsDown, Check, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSpeech } from '@/hooks/useSpeech';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { supabase } from '@/integrations/supabase/client';
import BurgerMenu from './BurgerMenu';
import CitationText from './CitationText';
import ConfirmNewProblemDialog from './ConfirmNewProblemDialog';
import ImageEditor from './ImageEditor';
import SignupPrompt from './SignupPrompt';
import VoiceChatPrompt from './VoiceChatPrompt';
import SourcesPanel, { Source } from './SourcesPanel';
import type { Message } from '@/hooks/useChat';

interface ChatViewProps {
  messages: Message[];
  sending: boolean;
  pendingImage: { url: string; mode: 'coach' | 'check' } | null;
  guestExchangeCount: number;
  guestLimit: number;
  isAtLimit: boolean;
  onSendMessage: (content: string, inputMethod?: 'text' | 'voice') => void;
  onImageUpload: (imageUrl: string, mode: 'coach' | 'check') => void;
  onConfirmImage: (additionalContext?: string) => void;
  onCancelImage: () => void;
  onNewProblem: () => void;
  onSettings: () => void;
  isAuthenticated: boolean;
  onStartVoiceSession?: () => void;
  sessionId?: string;
}

export default function ChatView({
  messages,
  sending,
  pendingImage,
  guestExchangeCount,
  guestLimit,
  isAtLimit,
  onSendMessage,
  onImageUpload,
  onConfirmImage,
  onCancelImage,
  onNewProblem,
  onSettings,
  isAuthenticated,
  onStartVoiceSession,
  sessionId,
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [voiceNoteCount, setVoiceNoteCount] = useState(0);
  const [showVoiceChatPrompt, setShowVoiceChatPrompt] = useState(false);
  const [voicePromptShownAt2, setVoicePromptShownAt2] = useState(false);
  
  // Image editing state
  const [isEditing, setIsEditing] = useState(false);
  const [rawImage, setRawImage] = useState<{ url: string; mode: 'coach' | 'check' } | null>(null);
  
  // TTS state - track which message is being played
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  // Feedback state - track which messages have been rated
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'thumbs_up' | 'thumbs_down' | null>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // Sources panel state
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<number | undefined>();
  
  // Swipe gesture tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'coach' | 'check') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Open editor
        setRawImage({ url: base64, mode });
        setIsEditing(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleEditorComplete = (editedUrl: string) => {
    if (rawImage) {
      onImageUpload(editedUrl, rawImage.mode);
    }
    setIsEditing(false);
    setRawImage(null);
  };

  const handleEditorCancel = () => {
    setIsEditing(false);
    setRawImage(null);
  };

  const handleConfirmWithContext = () => {
    onConfirmImage(additionalContext || undefined);
    setAdditionalContext('');
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

  // Handle citation click - open sources panel
  const handleCitationClick = useCallback((message: Message, sourceId: number) => {
    if (message.sources && message.sources.length > 0) {
      setCurrentSources(message.sources);
      setActiveSourceId(sourceId);
      setSourcesOpen(true);
      
      // Scroll to the source after panel opens
      setTimeout(() => {
        const sourceEl = document.getElementById(`source-${sourceId}`);
        sourceEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, []);

  // Open sources panel for a message
  const handleOpenSources = useCallback((message: Message) => {
    if (message.sources && message.sources.length > 0) {
      setCurrentSources(message.sources);
      setActiveSourceId(undefined);
      setSourcesOpen(true);
    }
  }, []);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Only trigger on horizontal swipes (deltaX > deltaY) with minimum distance
    const minSwipeDistance = 80;
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && currentSources.length > 0) {
        // Swipe left - open sources panel (if we have sources)
        setSourcesOpen(true);
      }
      // Swipe right could open burger menu but it's already accessible via button
    }
    
    touchStartRef.current = null;
  }, [currentSources]);

  // Image editor fullscreen
  if (isEditing && rawImage) {
    return (
      <ImageEditor
        imageUrl={rawImage.url}
        onComplete={handleEditorComplete}
        onCancel={handleEditorCancel}
      />
    );
  }

  return (
    <div 
      ref={chatContainerRef}
      className="flex flex-col h-full bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <BurgerMenu onSettings={onSettings} />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirmDialog(true)}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          New Problem
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !pendingImage && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4">
            <Sparkles className="h-12 w-12 text-primary/50" />
            <div>
              <p className="text-lg font-medium">Ready to help!</p>
              <p className="text-sm">Snap a question or type your problem</p>
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
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted',
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
                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                </button>
              )}

              {/* Feedback buttons for tutor messages */}
              {message.sender === 'tutor' && !message.isTyping && (
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
                  {/* Left side: copy, thumbs */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(message.id, message.content)}
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
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
                          ? "text-green-500" 
                          : "text-muted-foreground hover:text-foreground"
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
                          ? "text-red-500" 
                          : "text-muted-foreground hover:text-foreground"
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
                    className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
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

        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Image Preview */}
      {pendingImage && (
        <div className="border-t border-border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={pendingImage.url}
              alt="To upload"
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">
                {pendingImage.mode === 'check' ? '📝 Check my working' : '🎓 Coach me through it'}
              </p>
              <Input
                ref={contextInputRef}
                placeholder="Add context (optional)"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmWithContext()}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancelImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleConfirmWithContext}
            disabled={sending}
            className="w-full"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </div>
      )}

      {/* Signup Prompt or Input Bar */}
      {isAtLimit ? (
        <SignupPrompt exchangeCount={guestExchangeCount} limit={guestLimit} />
      ) : !pendingImage && (
        <div className="sticky bottom-0 border-t border-border bg-background p-4">
          {/* Guest exchange counter */}
          {!isAuthenticated && guestExchangeCount > 0 && (
            <div className="text-center mb-2">
              <span className="text-xs text-muted-foreground">
                {guestExchangeCount}/{guestLimit} free messages
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {/* Photo buttons */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleImageChange(e, 'coach')}
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
              placeholder="Type your question..."
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
      )}

      {/* Confirm New Problem Dialog */}
      <ConfirmNewProblemDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={onNewProblem}
      />

      {/* Voice Chat Prompt */}
      <VoiceChatPrompt
        open={showVoiceChatPrompt}
        onOpenChange={setShowVoiceChatPrompt}
        onStartVoiceChat={handleStartVoiceChat}
        showDontShowAgain={voiceNoteCount >= 5}
      />

      {/* Sources Panel */}
      <SourcesPanel
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        sources={currentSources}
        activeSourceId={activeSourceId}
      />
    </div>
  );
}
