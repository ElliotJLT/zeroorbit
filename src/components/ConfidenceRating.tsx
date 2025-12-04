import { cn } from '@/lib/utils';

interface ConfidenceRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ConfidenceRating({ value, onChange, disabled }: ConfidenceRatingProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        How confident do you feel on this type of question now?
      </p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            disabled={disabled}
            className={cn(
              "w-12 h-12 rounded-xl font-semibold transition-all duration-200",
              value === rating
                ? "bg-primary text-primary-foreground btn-glow"
                : "bg-surface-2 border border-border hover:border-primary hover:bg-surface-3",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {rating}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Not confident</span>
        <span>Very confident</span>
      </div>
    </div>
  );
}
