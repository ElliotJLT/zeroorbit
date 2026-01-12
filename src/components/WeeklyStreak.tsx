import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface WeeklyStreakProps {
  streak: boolean[];
  className?: string;
}

export function WeeklyStreak({ streak, className }: WeeklyStreakProps) {
  const streakCount = streak.filter(Boolean).length;
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-primary" />
        <span className="font-semibold">{streakCount} day streak this week</span>
      </div>
      
      <div className="flex justify-between gap-2">
        {DAYS.map((day, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                streak[index]
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {streak[index] ? '✓' : day}
            </div>
            <span className="text-xs text-muted-foreground">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
