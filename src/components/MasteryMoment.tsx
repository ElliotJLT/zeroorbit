import { CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MasteryMomentProps {
  exchangeCount: number;
  onTrySimilar?: () => void;
  onSeeAnotherApproach?: () => void;
  className?: string;
}

export default function MasteryMoment({
  exchangeCount,
  onTrySimilar,
  onSeeAnotherApproach,
  className,
}: MasteryMomentProps) {
  return (
    <div className={cn(
      "animate-fade-in p-4 rounded-2xl bg-secondary/10 border border-secondary/20",
      "success-glow",
      className
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <p className="font-semibold text-secondary">Nice work!</p>
          <p className="text-xs text-muted-foreground">
            Solved in {exchangeCount} {exchangeCount === 1 ? 'exchange' : 'exchanges'}
          </p>
        </div>
      </div>
      
      {(onTrySimilar || onSeeAnotherApproach) && (
        <div className="flex gap-2 mt-3">
          {onTrySimilar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTrySimilar}
              className="flex-1 gap-2 text-xs"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Try similar
            </Button>
          )}
          {onSeeAnotherApproach && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSeeAnotherApproach}
              className="flex-1 gap-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Another approach?
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
