import { cn } from '@/lib/utils';

interface ConfidenceRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const options = [
  { value: 1, emoji: '😰', label: 'Lost' },
  { value: 2, emoji: '😕', label: 'Confused' },
  { value: 3, emoji: '🤔', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🎯', label: 'Got it' },
];

export function ConfidenceRating({ value, onChange, disabled }: ConfidenceRatingProps) {
  return (
    <div className="space-y-4">
      <p className="font-medium text-center">
        How confident do you feel now?
      </p>
      <div className="flex justify-center gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "w-14 h-14 rounded-2xl font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 border",
              value === option.value
                ? "border-primary bg-primary/15 scale-110"
                : "bg-background border-transparent hover:bg-accent hover:scale-105",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-lg">{option.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}