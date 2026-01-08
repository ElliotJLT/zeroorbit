import { cn } from '@/lib/utils';
import MathText from '@/components/MathText';

interface ChatBubbleProps {
  sender: 'student' | 'tutor';
  content: string;
  timestamp?: Date;
}

export function ChatBubble({ sender, content, timestamp }: ChatBubbleProps) {
  const isStudent = sender === 'student';
  
  return (
    <div className={cn(
      "flex w-full animate-fade-in",
      isStudent ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] p-4",
        isStudent ? "bubble-student" : "bubble-tutor"
      )}>
        {!isStudent && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-primary">Orbit</span>
          </div>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          <MathText text={content} />
        </div>
        {timestamp && (
          <p className={cn(
            "text-xs mt-2",
            isStudent ? "text-primary-foreground/60" : "text-muted-foreground"
          )}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}