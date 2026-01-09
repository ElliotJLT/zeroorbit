import { useState, useRef, useEffect } from 'react';
import { Camera, Send, Eye, ArrowRight, RotateCcw, Mic, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import MathText from '@/components/MathText';
import { useSpeech } from '@/hooks/useSpeech';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type SkipReason = 'too_hard' | 'too_easy' | 'unclear' | 'not_interested';

interface ArenaQuestionProps {
  question: {
    id: string;
    question_text: string;
    final_answer: string;
    marking_points: string[];
    worked_solution: string;
  };
  topicName?: string;
  isEvaluating: boolean;
  attemptCount: number;
  showSolution: boolean;
  onSubmitAnswer: (answer?: string, imageUrl?: string) => void;
  onShowSolution: () => void;
  onNext: () => void;
  onSkip: (reason?: SkipReason) => void;
  feedback?: {
    status: 'correct' | 'partial' | 'incorrect';
    marks_estimate: string;
    feedback_summary: string;
    next_prompt?: string;
  } | null;
}

export default function ArenaQuestion({
  question,
  topicName,
  isEvaluating,
  attemptCount,
  showSolution,
  onSubmitAnswer,
  onShowSolution,
  onNext,
  onSkip,
  feedback,
  isFirstQuestion,
}: ArenaQuestionProps & { isFirstQuestion?: boolean }) {
  const [answer, setAnswer] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice input
  const { isRecording, startRecording, stopRecording } = useSpeech();
  
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(
        (transcript) => {
          // Submit the voice transcript directly
          if (transcript.trim()) {
            onSubmitAnswer(transcript, undefined);
          }
        },
        () => {
          // Error callback - do nothing
        }
      );
    }
  };
  
  // Swipe/drag gesture state
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show swipe tutorial on first question (once per session) - animates the card itself twice
  useEffect(() => {
    const hasSeenTutorial = sessionStorage.getItem('arenaSwipeTutorial');
    if (isFirstQuestion && !hasSeenTutorial) {
      setShowSwipeTutorial(true);
      sessionStorage.setItem('arenaSwipeTutorial', 'true');
      
      let repeatCount = 0;
      const maxRepeats = 2;
      
      const runAnimation = () => {
        let frame = 0;
        const totalFrames = 90; // Slower animation
        
        const animateSwipe = () => {
          frame++;
          const progress = frame / totalFrames;
          // Smoother ease in-out
          const eased = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          
          if (progress < 0.5) {
            setSwipeX(-80 * (eased * 2));
          } else {
            setSwipeX(-80 * (1 - (eased - 0.5) * 2));
          }
          
          if (frame < totalFrames) {
            requestAnimationFrame(animateSwipe);
          } else {
            setSwipeX(0);
            repeatCount++;
            if (repeatCount < maxRepeats) {
              // Pause between repeats
              setTimeout(runAnimation, 600);
            } else {
              setShowSwipeTutorial(false);
            }
          }
        };
        
        requestAnimationFrame(animateSwipe);
      };
      
      const timer = setTimeout(runAnimation, 800);
      return () => clearTimeout(timer);
    }
  }, [isFirstQuestion]);

  // Touch handlers (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX.current;
    if (deltaX < 0) {
      setSwipeX(Math.max(deltaX, -150));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX < -80) {
      setShowSkipDialog(true);
    }
    setSwipeX(0);
    setIsDragging(false);
  };

  // Mouse handlers (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX.current;
    if (deltaX < 0) {
      setSwipeX(Math.max(deltaX, -150));
    }
  };

  const handleMouseUp = () => {
    if (swipeX < -80) {
      setShowSkipDialog(true);
    }
    setSwipeX(0);
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setSwipeX(0);
      setIsDragging(false);
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!answer.trim() && !imagePreview) return;
    onSubmitAnswer(answer || undefined, imagePreview || undefined);
    setAnswer('');
    setImagePreview(null);
  };

  const handleSkipClick = () => {
    setShowSkipDialog(true);
  };

  const handleSkipWithReason = (reason: SkipReason) => {
    setShowSkipDialog(false);
    onSkip(reason);
  };

  const handleSkipWithoutReason = () => {
    setShowSkipDialog(false);
    onSkip();
  };

  const isCompleted = feedback?.status === 'correct' || showSolution;

  const skipReasons: { id: SkipReason; label: string; emoji: string }[] = [
    { id: 'too_hard', label: 'Too difficult', emoji: '😓' },
    { id: 'too_easy', label: 'Too easy', emoji: '🥱' },
    { id: 'unclear', label: "Doesn't make sense", emoji: '🤔' },
    { id: 'not_interested', label: 'Not relevant to me', emoji: '🙅' },
  ];

  // Calculate visual feedback for swipe
  const swipeProgress = Math.abs(swipeX) / 80; // 0 to 1+
  const cardRotation = swipeX / 20; // subtle rotation
  const showSkipHint = swipeProgress > 0.3;
  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full relative select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >

      {/* Skip hint overlay (during active swipe) */}
      {showSkipHint && (
        <div 
          className="absolute inset-0 z-10 flex items-center justify-end pr-8 pointer-events-none"
          style={{ opacity: Math.min(swipeProgress, 1) }}
        >
          <div className="bg-muted/90 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Skip</span>
            <span className="text-xl">→</span>
          </div>
        </div>
      )}

      {/* Question - with swipe transform - fills available space */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 pb-[140px]"
        style={{ 
          transform: `translateX(${swipeX}px) rotate(${cardRotation}deg)`,
          transition: isDragging || showSwipeTutorial ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Question</p>
            {topicName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {topicName}
              </span>
            )}
          </div>
          <div className="border-t border-border pt-3">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed">
                <MathText text={question.question_text} />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={cn(
            "rounded-xl p-4 border",
            feedback.status === 'correct' 
              ? "bg-green-500/10 border-green-500/30" 
              : feedback.status === 'partial'
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-red-500/10 border-red-500/30"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                feedback.status === 'correct' 
                  ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                  : feedback.status === 'partial'
                    ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    : "bg-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {feedback.status === 'correct' ? '✓ Correct' : feedback.status === 'partial' ? '~ Partial' : '✗ Incorrect'}
              </span>
              <span className="text-sm text-muted-foreground">{feedback.marks_estimate}</span>
            </div>
            <p className="text-sm">{feedback.feedback_summary}</p>
            {feedback.next_prompt && !isCompleted && (
              <p className="text-sm text-muted-foreground mt-2 italic">{feedback.next_prompt}</p>
            )}
          </div>
        )}

        {/* Solution (if revealed) */}
        {showSolution && (
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
            <p className="text-sm font-medium text-primary mb-2">Model Solution</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Final Answer</p>
                <div className="font-mono text-sm">
                  <MathText text={question.final_answer} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Working</p>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  <MathText text={question.worked_solution} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area - fixed at bottom for mobile - matches GuestChat style */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
        {isCompleted ? (
          // Completed state - show next button
          <Button 
            onClick={onNext}
            className="w-full h-12 text-base font-medium gap-2"
          >
            Next Question
            <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          // Input state - native chat style like GuestChat
          <div className="space-y-3">
            {/* Image preview */}
            {imagePreview && (
              <div className="flex justify-center">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Your working" 
                    className="max-h-32 rounded-xl border border-border"
                  />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
              />
              
              {/* Photo button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isEvaluating}
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all hover:bg-muted/80"
                title="Add photo"
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
              </button>
              
              {/* Text input */}
              <div className="flex-1 relative">
                <Input
                  placeholder="Type your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (answer.trim() || imagePreview) {
                        handleSubmit();
                      }
                    }
                  }}
                  disabled={isEvaluating}
                  className="w-full rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary h-11 pr-12"
                />
                
                {/* Mic button inside input */}
                {!answer.trim() && !imagePreview && (
                  <button 
                    onClick={handleMicClick}
                    disabled={isEvaluating}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all",
                      isRecording 
                        ? "bg-destructive text-destructive-foreground animate-pulse" 
                        : "hover:bg-background/50"
                    )}
                    title={isRecording ? "Stop recording" : "Voice note"}
                  >
                    {isRecording ? (
                      <Square className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Mic className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              
              {/* Send button - only shows when there's content */}
              {(answer.trim() || imagePreview) && (
                <button 
                  onClick={handleSubmit}
                  disabled={isEvaluating}
                  className="w-11 h-11 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isEvaluating ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-5 w-5 text-primary-foreground" />
                  )}
                </button>
              )}
            </div>

            {attemptCount >= 2 && !showSolution && (
              <Button
                variant="outline"
                onClick={onShowSolution}
                className="w-full gap-2"
              >
                <Eye className="h-4 w-4" />
                Show solution
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Skip reason dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Why are you skipping?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {skipReasons.map((reason) => (
              <button
                key={reason.id}
                onClick={() => handleSkipWithReason(reason.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <span className="text-xl">{reason.emoji}</span>
                <span className="font-medium">{reason.label}</span>
              </button>
            ))}
            <button
              onClick={handleSkipWithoutReason}
              className="w-full p-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Just skip
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
