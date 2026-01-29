import { cn } from '@/lib/utils';

interface MomentumIndicatorProps {
  exchangeCount: number;
  hasCorrectAnswer?: boolean;
  className?: string;
}

export default function MomentumIndicator({
  exchangeCount,
  hasCorrectAnswer,
  className,
}: MomentumIndicatorProps) {
  // Don't show if no exchanges yet
  if (exchangeCount === 0) return null;
  
  const maxDots = 5;
  const filledDots = Math.min(exchangeCount, maxDots);
  const extraCount = exchangeCount > maxDots ? exchangeCount - maxDots : 0;
  
  // Determine color based on progress
  const getColor = (index: number, isFilled: boolean) => {
    if (!isFilled) return 'bg-muted-foreground/20';
    if (hasCorrectAnswer) return 'bg-secondary';
    // Gradient from muted to primary as we progress
    if (index < 2) return 'bg-muted-foreground/60';
    if (index < 4) return 'bg-primary/70';
    return 'bg-primary';
  };
  
  return (
    <div className={cn(
      "flex items-center justify-center gap-1.5 py-2",
      className
    )}>
      <div className="flex items-center gap-1">
        {Array.from({ length: maxDots }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-all duration-300",
              getColor(i, i < filledDots),
              i < filledDots && "scale-110"
            )}
          />
        ))}
      </div>
      
      {extraCount > 0 && (
        <span className="text-[10px] text-muted-foreground ml-1">
          +{extraCount}
        </span>
      )}
      
      <span className="text-[10px] text-muted-foreground ml-2">
        {hasCorrectAnswer ? 'Solved!' : 'Making progress'}
      </span>
    </div>
  );
}
