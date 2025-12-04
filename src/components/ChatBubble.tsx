import { cn } from '@/lib/utils';

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
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <p className="text-xs text-muted-foreground mt-2">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
