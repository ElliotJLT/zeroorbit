import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PostSessionSurveyProps {
  open: boolean;
  onComplete: (data: {
    confidence: number;
    wouldUseAgain: 'yes' | 'no' | 'maybe';
    feedback: string;
  }) => void;
}

export default function PostSessionSurvey({ open, onComplete }: PostSessionSurveyProps) {
  const [confidence, setConfidence] = useState(0);
  const [wouldUseAgain, setWouldUseAgain] = useState<'yes' | 'no' | 'maybe' | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (confidence > 0 && wouldUseAgain) {
      onComplete({
        confidence,
        wouldUseAgain,
        feedback,
      });
    }
  };

  const canSubmit = confidence > 0 && wouldUseAgain !== null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Quick Feedback 📝</DialogTitle>
          <DialogDescription className="text-base">
            Help us improve Orbit with your thoughts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Confidence Rating */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Could you solve a similar problem now?
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setConfidence(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= confidence
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {confidence === 0 && 'Tap to rate'}
              {confidence === 1 && 'Not at all'}
              {confidence === 2 && 'Probably not'}
              {confidence === 3 && 'Maybe'}
              {confidence === 4 && 'Yes, mostly'}
              {confidence === 5 && 'Definitely!'}
            </p>
          </div>

          {/* Would Use Again */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Would you use Orbit again when stuck?
            </label>
            <div className="flex gap-2">
              {(['yes', 'maybe', 'no'] as const).map((option) => (
                <Button
                  key={option}
                  variant={wouldUseAgain === option ? 'default' : 'outline'}
                  onClick={() => setWouldUseAgain(option)}
                  className="flex-1 capitalize"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Optional Feedback */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Any other feedback? <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="What worked? What didn't?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12"
          >
            Submit & Finish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
