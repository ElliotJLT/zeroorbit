import { useRef, useEffect, useState } from 'react';
import { Camera, X, Send, LogOut, Mic, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import orbitIcon from '@/assets/orbit-icon.png';
import BurgerMenu from '@/components/BurgerMenu';
import NewProblemModal from '@/components/NewProblemModal';
import { useToast } from '@/hooks/use-toast';
import { type Message, type QuestionAnalysis } from '@/hooks/useGuestChat';

interface GuestChatProps {
  messages: Message[];
  sending: boolean;
  pendingImage: { url: string; mode: 'working' | 'question' } | null;
  imagePreview: string | null;
  analysis: QuestionAnalysis | null;
  betaTesterName: string | null;
  onSendMessage: (content: string, inputMethod?: 'text' | 'voice' | 'photo') => void;
  onConfirmImage: (intent: string) => void;
  onCancelImage: () => void;
  onImageUpload: (imageUrl: string, mode: 'working' | 'question') => void;
  onNewProblem: (imageUrl: string | null, questionText: string) => Promise<void>;
  onEndSession: () => void;
  onBrowseSyllabus: () => void;
  onSettings: () => void;
  betaMode?: boolean;
}

export function GuestChat({
  messages,
  sending,
  pendingImage,
  imagePreview,
  analysis,
  betaTesterName,
  onSendMessage,
  onConfirmImage,
  onCancelImage,
  onImageUpload,
  onNewProblem,
  onEndSession,
  onBrowseSyllabus,
  onSettings,
  betaMode = true,
}: GuestChatProps) {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showNewProblemModal, setShowNewProblemModal] = useState(false);
  const [modalAnalyzing, setModalAnalyzing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workingFileInputRef = useRef<HTMLInputElement>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'working' | 'question') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string, mode);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleNewProblemSubmit = async (imageUrl: string | null, questionText: string) => {
    setModalAnalyzing(true);
    try {
      await onNewProblem(imageUrl, questionText);
      setShowNewProblemModal(false);
    } finally {
      setModalAnalyzing(false);
    }
  };

  const handleVoiceResult = (transcript: string) => {
    if (transcript.trim()) {
      onSendMessage(transcript, 'voice');
    }
  };

  const handleVoiceError = () => {
    toast({
      variant: 'destructive',
      title: 'Voice not recognized',
      description: 'Please try again or type your message.',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <BurgerMenu
            onBrowseSyllabus={onBrowseSyllabus}
            onSettings={onSettings}
          />
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => setShowNewProblemModal(true)}
              className="h-11 rounded-full text-muted-foreground hover:text-foreground active:scale-95 gap-1.5 px-4 transition-all"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">New Problem</span>
            </Button>
            {betaMode && messages.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEndSession}
                className="w-11 h-11 rounded-full text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                title="End Session"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-[180px]">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Question Card */}
          {imagePreview && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-background font-bold text-sm">
                    {betaTesterName?.charAt(0).toUpperCase() || 'S'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-sm">{betaTesterName || 'Student'}</span>
                  {analysis?.difficulty && <span className="text-xs text-muted-foreground ml-2">{analysis.difficulty}</span>}
                </div>
              </div>
              <img src={imagePreview} alt="Question" className="w-full max-h-48 object-contain bg-muted/30" />
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`rounded-2xl p-4 ${message.sender === 'tutor' ? 'bg-card border border-border' : 'bg-primary/10 ml-8'}`}
            >
              {message.sender === 'tutor' && (
                <div className="flex items-center gap-2 mb-2">
                  <img 
                    src={orbitIcon} 
                    alt="Orbit" 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs text-muted-foreground">Orbit</span>
                </div>
              )}
              {message.imageUrl && (
                <img src={message.imageUrl} alt="Uploaded" className="w-full max-h-32 object-contain rounded-lg mb-2" />
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

      {/* Click outside to close input */}
      {showInput && (
        <div className="fixed inset-0 z-10" onClick={() => setShowInput(false)} />
      )}

      {/* Bottom action bar - fixed at bottom for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
        <div className="max-w-2xl mx-auto">
          {/* Hidden file inputs */}
          <input 
            ref={workingFileInputRef} 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={(e) => handleImageChange(e, 'working')} 
          />
          <input 
            ref={questionFileInputRef} 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={(e) => handleImageChange(e, 'question')} 
          />
          
          {/* Pending image with intent chips */}
          {pendingImage ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="relative">
                <img 
                  src={pendingImage.url} 
                  alt="Your upload" 
                  className="max-h-32 rounded-xl border border-border"
                />
                <button
                  onClick={onCancelImage}
                  className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-destructive flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="h-4 w-4 text-destructive-foreground" />
                </button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {pendingImage.mode === 'working' ? (
                  <>
                    <button onClick={() => onConfirmImage("Check my working")} className="min-h-[44px] px-5 py-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 active:scale-95 transition-all">Check my working</button>
                    <button onClick={() => onConfirmImage("Is this right?")} className="min-h-[44px] px-5 py-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 active:scale-95 transition-all">Is this right?</button>
                    <button onClick={() => onConfirmImage("What's next?")} className="min-h-[44px] px-5 py-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 active:scale-95 transition-all">What's next?</button>
                    <button onClick={() => onConfirmImage("I'm stuck here")} className="min-h-[44px] px-5 py-3 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 active:scale-95 transition-all">I'm stuck here</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onConfirmImage("Help me solve this")} className="min-h-[44px] px-5 py-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 active:scale-95 transition-all">Help me solve this</button>
                    <button onClick={() => onConfirmImage("Where do I start?")} className="min-h-[44px] px-5 py-3 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 active:scale-95 transition-all">Where do I start?</button>
                    <button onClick={() => onConfirmImage("Explain the question")} className="min-h-[44px] px-5 py-3 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/80 active:scale-95 transition-all">Explain the question</button>
                  </>
                )}
              </div>
              
              <div className="w-full flex items-center gap-2">
                <Input
                  placeholder="Add context (optional)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onConfirmImage(newMessage.trim() || (pendingImage.mode === 'working' ? "Check my working" : "Help me with this"));
                      setNewMessage('');
                    }
                  }}
                  className="flex-1 rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                />
                <button 
                  onClick={() => {
                    onConfirmImage(newMessage.trim() || (pendingImage.mode === 'working' ? "Check my working" : "Help me with this"));
                    setNewMessage('');
                  }}
                  disabled={sending}
                  className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #00FAD7 0%, #00C4AA 100%)' }}
                >
                  <Send className="h-5 w-5 text-background" />
                </button>
              </div>
            </div>
          ) : showInput ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim()) {
                      onSendMessage(newMessage, 'text');
                      setNewMessage('');
                      setShowInput(false);
                    }
                  }
                }}
                disabled={sending}
                autoFocus
                className="flex-1 rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
              />
              <button 
                onClick={() => {
                  if (newMessage.trim()) {
                    onSendMessage(newMessage, 'text');
                    setNewMessage('');
                    setShowInput(false);
                  }
                }}
                disabled={sending || !newMessage.trim()}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
              >
                <Send className="h-5 w-5 text-primary-foreground" />
              </button>
              <button 
                onClick={() => setShowInput(false)}
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-all"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              {/* Three equally weighted action buttons for beta testing */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                <button 
                  onClick={() => workingFileInputRef.current?.click()} 
                  disabled={sending} 
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border-2 border-primary/30 disabled:opacity-50 transition-all active:scale-95 hover:border-primary/60"
                >
                  <Camera className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium text-foreground">Add working</span>
                </button>
                
                <button 
                  onClick={() => onSendMessage('[VOICE_MODE]', 'voice')}
                  disabled={sending}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border-2 border-primary/30 disabled:opacity-50 transition-all active:scale-95 hover:border-primary/60"
                >
                  <Mic className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium text-foreground">Voice mode</span>
                </button>
                
                <button 
                  onClick={() => setShowInput(true)}
                  disabled={sending}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border-2 border-primary/30 disabled:opacity-50 transition-all active:scale-95 hover:border-primary/60"
                >
                  <Keyboard className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium text-foreground">Type a line</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <NewProblemModal
        open={showNewProblemModal}
        onOpenChange={setShowNewProblemModal}
        onSubmit={handleNewProblemSubmit}
        isAnalyzing={modalAnalyzing}
      />
    </div>
  );
}
