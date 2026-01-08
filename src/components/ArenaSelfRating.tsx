import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ArenaSelfRatingProps {
  onRate: (rating: 'easy' | 'ok' | 'hard') => void;
  className?: string;
}

export default function ArenaSelfRating({ onRate, className }: ArenaSelfRatingProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm text-center text-muted-foreground">How did that feel?</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => onRate('easy')}
          className="flex-1 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
        >
          😊 Easy
        </Button>
        <Button
          variant="outline"
          onClick={() => onRate('ok')}
          className="flex-1 border-yellow-500/30 hover:bg-yellow-500/10 hover:border-yellow-500/50"
        >
          🤔 OK
        </Button>
        <Button
          variant="outline"
          onClick={() => onRate('hard')}
          className="flex-1 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
        >
          😓 Hard
        </Button>
      </div>
    </div>
  );
}
