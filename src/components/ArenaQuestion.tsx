import { useState, useRef } from 'react';
import { Camera, Send, Eye, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import MathText from '@/components/MathText';
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
}: ArenaQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Swipe gesture state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    // Only allow left swipe (negative)
    if (deltaX < 0) {
      setSwipeX(Math.max(deltaX, -150));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX < -80) {
      // Trigger skip
      setShowSkipDialog(true);
    }
    setSwipeX(0);
    setIsSwiping(false);
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
      className="flex flex-col h-full relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip hint overlay */}
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

      {/* Question - with swipe transform */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 transition-transform"
        style={{ 
          transform: `translateX(${swipeX}px) rotate(${cardRotation}deg)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
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

        {/* Image preview */}
        {imagePreview && (
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Your working" 
              className="w-full rounded-xl border border-border"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border space-y-3">
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
          // Input state
          <>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Camera className="h-5 w-5" />
              </Button>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer or add working..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                onClick={handleSubmit}
                disabled={isEvaluating || (!answer.trim() && !imagePreview)}
                size="icon"
                className="shrink-0"
              >
                {isEvaluating ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              {attemptCount >= 2 && !showSolution && (
                <Button
                  variant="outline"
                  onClick={onShowSolution}
                  className="flex-1 gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Show solution
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleSkipClick}
                className="flex-1 text-muted-foreground"
              >
                Skip
              </Button>
            </div>
          </>
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
