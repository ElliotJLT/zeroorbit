import { BookOpen, GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import MathText from '../MathText';
import type { Source } from './types';

interface SourcesPanelDesktopProps {
  sources: Source[];
  activeSourceId?: number;
  onClose: () => void;
}

export default function SourcesPanelDesktop({ 
  sources,
  activeSourceId,
  onClose,
}: SourcesPanelDesktopProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - smaller, contextual */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" />
          Sources
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sources available for this message.
            </p>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                id={`source-${source.id}`}
                className={`rounded-lg border p-4 transition-all ${
                  activeSourceId === source.id 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                    {source.id}
                  </span>
                  <h3 className="font-semibold text-sm leading-6">
                    {source.title}
                  </h3>
                </div>
                
                <div className="text-sm text-muted-foreground leading-relaxed pl-9">
                  <MathText text={source.explanation} />
                </div>
                
                {source.exam_relevance && (
                  <div className="mt-3 pl-9">
                    <div className="flex items-start gap-2 p-2 rounded-md bg-accent/50 text-xs">
                      <GraduationCap className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      <span className="text-accent-foreground">
                        <strong>Exam tip:</strong> {source.exam_relevance}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
