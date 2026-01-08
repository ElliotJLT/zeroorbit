import { cn } from '@/lib/utils';

interface ArenaProgressProps {
  current: number;
  total: number;
  className?: string;
}

export default function ArenaProgress({ current, total, className }: ArenaProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Question {Math.min(current + 1, total)} of {total}
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
