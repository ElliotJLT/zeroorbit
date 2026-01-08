import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, Target, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ArenaAttempt {
  status: 'correct' | 'partial' | 'incorrect' | null;
  marks_estimate: string | null;
}

interface ArenaSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempts: ArenaAttempt[];
  questionCount: number;
}

export default function ArenaSignupModal({ 
  isOpen, 
  onClose, 
  attempts,
  questionCount 
}: ArenaSignupModalProps) {
  const navigate = useNavigate();
  
  const correctCount = attempts.filter(a => a.status === 'correct').length;
  const partialCount = attempts.filter(a => a.status === 'partial').length;
  const incorrectCount = attempts.filter(a => a.status === 'incorrect').length;
  
  const scorePercentage = questionCount > 0 
    ? Math.round(((correctCount + partialCount * 0.5) / questionCount) * 100) 
    : 0;

  const handleSignUp = () => {
    navigate('/auth?mode=signup&from=arena');
  };

  const handleContinue = () => {
    onClose();
    navigate('/');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-primary" />
            Session Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Score Summary */}
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold text-primary">{scorePercentage}%</div>
            <p className="text-muted-foreground">
              {correctCount} correct • {partialCount} partial • {incorrectCount} missed
            </p>
          </div>

          {/* Benefits of signing up */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-sm">Get A-Level ready:</p>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Track your progress</p>
                  <p className="text-xs text-muted-foreground">Monitor your improvement across topics</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Target weak spots</p>
                  <p className="text-xs text-muted-foreground">AI adapts to focus on your gaps</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Exam-ready revision</p>
                  <p className="text-xs text-muted-foreground">Spaced practice for long-term retention</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button 
              onClick={handleSignUp}
              className="w-full h-12 text-base font-medium"
            >
              Create free account
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleContinue}
              className="w-full text-muted-foreground"
            >
              Continue without saving
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
