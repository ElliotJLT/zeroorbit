import { cn } from '@/lib/utils';

interface TopicChipProps {
  name: string;
  attempts: number;
  correctAttempts: number;
  className?: string;
}

type StrengthLevel = 'strong' | 'ok' | 'weak' | 'none';

function getStrengthLevel(attempts: number, correctAttempts: number): StrengthLevel {
  if (attempts === 0) return 'none';
  const percentage = (correctAttempts / attempts) * 100;
  if (percentage >= 70) return 'strong';
  if (percentage >= 40) return 'ok';
  return 'weak';
}

function getStrengthLabel(level: StrengthLevel): string {
  switch (level) {
    case 'strong': return 'Strong';
    case 'ok': return 'OK';
    case 'weak': return 'Weak';
    case 'none': return 'Not started';
  }
}

export function TopicChip({ name, attempts, correctAttempts, className }: TopicChipProps) {
  const level = getStrengthLevel(attempts, correctAttempts);
  
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
      level === 'strong' && "bg-secondary/10 border-secondary/30",
      level === 'ok' && "bg-warning/10 border-warning/30",
      level === 'weak' && "bg-destructive/10 border-destructive/30",
      level === 'none' && "bg-surface-2 border-border",
      className
    )}>
      <span className="font-medium">{name}</span>
      <span className={cn(
        "text-sm px-3 py-1 rounded-full font-medium",
        level === 'strong' && "bg-secondary/20 text-secondary",
        level === 'ok' && "bg-warning/20 text-warning",
        level === 'weak' && "bg-destructive/20 text-destructive",
        level === 'none' && "bg-muted text-muted-foreground"
      )}>
        {getStrengthLabel(level)}
      </span>
    </div>
  );
}
