import { cn } from '@/lib/utils';

interface ConfidenceRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const emojis = ['😰', '😕', '🤔', '😊', '🎯'];

export function ConfidenceRating({ value, onChange, disabled }: ConfidenceRatingProps) {
  return (
    <div className="space-y-4">
      <p className="font-medium text-center">
        How confident do you feel now? 
      </p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            disabled={disabled}
            className={cn(
              "w-14 h-14 rounded-2xl font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
              value === rating
                ? "bg-primary text-primary-foreground scale-110"
                : "glass-card hover:scale-105",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-lg">{emojis[rating - 1]}</span>
            <span className="text-xs">{rating}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>Still confused</span>
        <span>Got it!</span>
      </div>
    </div>
  );
}
