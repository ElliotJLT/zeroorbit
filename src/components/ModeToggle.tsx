import { cn } from '@/lib/utils';

export type TutorMode = 'coach' | 'check';

interface ModeToggleProps {
  mode: TutorMode;
  onChange: (mode: TutorMode) => void;
  disabled?: boolean;
  className?: string;
}

export default function ModeToggle({
  mode,
  onChange,
  disabled,
  className,
}: ModeToggleProps) {
  return (
    <div className={cn(
      "inline-flex items-center p-0.5 rounded-full bg-muted/50 border border-border/50",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      <button
        onClick={() => onChange('coach')}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
          mode === 'coach'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        disabled={disabled}
      >
        Coach me
      </button>
      <button
        onClick={() => onChange('check')}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
          mode === 'check'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        disabled={disabled}
      >
        Check my work
      </button>
    </div>
  );
}
