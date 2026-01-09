import { useRef, useEffect, useState } from 'react';
import { Camera, X, Send, Mic, Lightbulb, RefreshCw, CheckCircle, XCircle, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import orbitIcon from '@/assets/orbit-icon.png';
import BurgerMenu from '@/components/BurgerMenu';
import NewProblemModal from '@/components/NewProblemModal';
import MathText from '@/components/MathText';
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
  onBrowseSyllabus,
  onSettings,
  betaMode = true,
}: GuestChatProps) {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
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
    } finally {
      setModalAnalyzing(false);
      setShowNewProblemModal(false); // Always close modal after submit
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
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-[140px]">
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
          {messages.map((message, index) => {
            const isLastTutorMessage = message.sender === 'tutor' && index === messages.length - 1;
            const isCorrectAnswer = message.studentBehavior === 'correct_answer';
            const showAlternativeButton = isLastTutorMessage && message.nextAction === 'offer_alternative' && message.alternativeMethod;
            const showStillStuckButton = isLastTutorMessage && message.errorAnalysis?.needs_reteach;
            const showJustShowAnswerButton = isLastTutorMessage && (message.stuckCount ?? 0) >= 2 && !isCorrectAnswer;
            
            return (
              <div key={message.id} className="space-y-2">
                <div 
                  className={`rounded-2xl p-4 ${message.sender === 'tutor' ? 'bg-card border border-border' : 'bg-primary/10 ml-8'} ${isCorrectAnswer && message.sender === 'tutor' ? 'ring-2 ring-green-500/30 bg-green-50/50 dark:bg-green-950/20' : ''}`}
                >
                  {message.sender === 'tutor' && (
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src={orbitIcon} 
                        alt="Orbit" 
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs text-muted-foreground">Orbit</span>
                      {isCorrectAnswer && message.content && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Correct!
                        </span>
                      )}
                    </div>
                  )}
                  {message.imageUrl && (
                    <img src={message.imageUrl} alt="Uploaded" className="w-full max-h-32 object-contain rounded-lg mb-2" />
                  )}
                  <div className={`text-sm leading-relaxed ${message.sender === 'student' ? 'text-right' : ''}`}>
                    {message.content ? (
                      <MathText text={message.content} />
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>
                  
                  {/* Marks Analysis Card (for check mode) - only show if actual marks exist */}
                  {message.marksAnalysis && message.content && 
                   message.marksAnalysis.estimated_marks && 
                   !message.marksAnalysis.estimated_marks.toLowerCase().includes('n/a') && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-primary">{message.marksAnalysis.estimated_marks}</span>
                        <span className="text-xs text-muted-foreground">estimated marks</span>
                      </div>
                      {message.marksAnalysis.method_marks && 
                       !message.marksAnalysis.method_marks.toLowerCase().includes('n/a') && (
                        <div className="text-xs space-y-1">
                          <p className="text-muted-foreground">{message.marksAnalysis.method_marks}</p>
                        </div>
                      )}
                      {message.marksAnalysis.accuracy_marks && 
                       !message.marksAnalysis.accuracy_marks.toLowerCase().includes('n/a') && (
                        <div className="text-xs mt-1">
                          <p className="text-muted-foreground">{message.marksAnalysis.accuracy_marks}</p>
                        </div>
                      )}
                      {message.marksAnalysis.errors && message.marksAnalysis.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.marksAnalysis.errors.map((err, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {err.type === 'mechanical' ? (
                                <XCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                              )}
                              <span>
                                <span className="font-medium">{err.line}:</span> {err.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Error badge for conceptual errors */}
                  {message.errorAnalysis?.type === 'conceptual' && message.content && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs">
                      <Lightbulb className="w-3 h-3" />
                      Conceptual — different approach needed
                    </div>
                  )}
                </div>
                
                {/* Post-message action buttons */}
                {message.content && (showAlternativeButton || showStillStuckButton || showJustShowAnswerButton) && (
                  <div className="flex flex-wrap gap-2 pl-2">
                    {showAlternativeButton && message.alternativeMethod && (
                      <button
                        onClick={() => onSendMessage(`Show me another way: ${message.alternativeMethod!.method_name}`, 'text')}
                        disabled={sending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        See another approach
                      </button>
                    )}
                    {/* Post-correct: Try similar problem */}
                    {isCorrectAnswer && (
                      <button
                        onClick={() => onSendMessage("Give me a similar problem to try", 'text')}
                        disabled={sending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        Try a similar problem
                      </button>
                    )}
                    {showStillStuckButton && (
                      <button
                        onClick={() => onSendMessage("I'm still confused, can you explain it differently?", 'text')}
                        disabled={sending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Lightbulb className="w-3 h-3" />
                        Still stuck?
                      </button>
                    )}
                    {showJustShowAnswerButton && (
                      <button
                        onClick={() => onSendMessage("Just show me the answer", 'text')}
                        disabled={sending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Eye className="w-3 h-3" />
                        Just show me the answer
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom input bar - native chat style */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
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
              
              {/* Two clear mode options for any image upload */}
              <div className="w-full space-y-3">
                <button 
                  onClick={() => onConfirmImage("Coach me through this step by step")}
                  className="w-full min-h-[56px] px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-medium">Coach me through it</p>
                    <p className="text-xs text-primary-foreground/70">Step-by-step guidance</p>
                  </div>
                  <Send className="h-5 w-5" />
                </button>
                
                <button 
                  onClick={() => onConfirmImage("Check my working - validate correctness, identify errors, give marks estimate. No Socratic questions, just direct feedback.")}
                  className="w-full min-h-[56px] px-5 py-3 rounded-2xl border-2 border-border bg-card text-foreground font-medium hover:bg-muted active:scale-[0.98] transition-all flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-medium">Check my working</p>
                    <p className="text-xs text-muted-foreground">Quick validation & marks</p>
                  </div>
                  <Send className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ) : (
            /* Native chat input with integrated icons */
            <div className="flex items-center gap-2">
              {/* Photo button */}
              <button 
                onClick={() => workingFileInputRef.current?.click()} 
                disabled={sending}
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all hover:bg-muted/80"
                title="Add photo"
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
              </button>
              
              {/* Text input */}
              <div className="flex-1 relative">
                <Input
                  placeholder="Message Orbit..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        onSendMessage(newMessage, 'text');
                        setNewMessage('');
                      }
                    }
                  }}
                  disabled={sending}
                  className="w-full rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-11 pr-12"
                />
                
                {/* Mic button inside input */}
                {!newMessage.trim() && (
                  <button 
                    onClick={() => {
                      toast({
                        title: "Voice mode coming soon",
                        description: "OpenAI Realtime voice is in development.",
                      });
                    }}
                    disabled={sending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all hover:bg-background/50"
                    title="Voice input"
                  >
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              
              {/* Send button - only shows when there's text */}
              {newMessage.trim() && (
                <button 
                  onClick={() => {
                    if (newMessage.trim()) {
                      onSendMessage(newMessage, 'text');
                      setNewMessage('');
                    }
                  }}
                  disabled={sending}
                  className="w-11 h-11 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
                >
                  <Send className="h-5 w-5 text-primary-foreground" />
                </button>
              )}
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
