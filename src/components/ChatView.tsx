import { useState, useRef, useEffect } from 'react';
import { Camera, Send, Mic, MicOff, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSpeech } from '@/hooks/useSpeech';
import BurgerMenu from './BurgerMenu';
import MathText from './MathText';
import ConfirmNewProblemDialog from './ConfirmNewProblemDialog';
import ImageEditor from './ImageEditor';
import SignupPrompt from './SignupPrompt';
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
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  
  // Image editing state
  const [isEditing, setIsEditing] = useState(false);
  const [rawImage, setRawImage] = useState<{ url: string; mode: 'coach' | 'check' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useSpeech();

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
          }
        },
        () => {
          console.error('Speech recognition error');
        }
      );
    }
  };

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
    <div className="flex flex-col h-full bg-background">
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
              <MathText text={message.content} />
              {message.isTyping && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
              
              {/* Error feedback */}
              {message.errorType && (
                <div className="mt-2 pt-2 border-t border-border/50 text-sm">
                  <span className="text-amber-500 font-medium">
                    {message.errorType === 'mechanical' ? '⚙️ Mechanical error' : '💡 Conceptual gap'}
                  </span>
                  {message.errorLocation && (
                    <span className="text-muted-foreground ml-2">
                      in {message.errorLocation}
                    </span>
                  )}
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
    </div>
  );
}
