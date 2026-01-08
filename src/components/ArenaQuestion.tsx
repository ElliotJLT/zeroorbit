import { useState, useRef } from 'react';
import { Camera, Send, Eye, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import MathText from '@/components/MathText';

interface ArenaQuestionProps {
  question: {
    id: string;
    question_text: string;
    final_answer: string;
    marking_points: string[];
    worked_solution: string;
  };
  isEvaluating: boolean;
  attemptCount: number;
  showSolution: boolean;
  onSubmitAnswer: (answer?: string, imageUrl?: string) => void;
  onShowSolution: () => void;
  onNext: () => void;
  onSkip: () => void;
  feedback?: {
    status: 'correct' | 'partial' | 'incorrect';
    marks_estimate: string;
    feedback_summary: string;
    next_prompt?: string;
  } | null;
}

export default function ArenaQuestion({
  question,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isCompleted = feedback?.status === 'correct' || showSolution;


  return (
    <div className="flex flex-col h-full">
      {/* Question */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2">Question</p>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed">
              <MathText text={question.question_text} />
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
                onClick={onSkip}
                className="flex-1 text-muted-foreground"
              >
                Skip
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
