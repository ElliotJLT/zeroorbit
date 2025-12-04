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
    case 'ok': return 'Improving';
    case 'weak': return 'Needs work';
    case 'none': return 'Not started';
  }
}

export function TopicChip({ name, attempts, correctAttempts, className }: TopicChipProps) {
  const level = getStrengthLevel(attempts, correctAttempts);
  
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl bg-muted transition-colors hover:bg-accent",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-1.5 h-6 rounded-full",
          level === 'strong' && "bg-secondary",
          level === 'ok' && "bg-warning",
          level === 'weak' && "bg-destructive",
          level === 'none' && "bg-border"
        )} />
        <span className="font-medium">{name}</span>
      </div>
      <span className={cn(
        "text-xs px-2.5 py-1 rounded-full font-medium",
        level === 'strong' && "bg-secondary/15 text-secondary",
        level === 'ok' && "bg-warning/15 text-warning",
        level === 'weak' && "bg-destructive/15 text-destructive",
        level === 'none' && "text-muted-foreground"
      )}>
        {getStrengthLabel(level)}
      </span>
    </div>
  );
}
