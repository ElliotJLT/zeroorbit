import { BookOpen, GraduationCap } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import MathText from './MathText';

export interface Source {
  id: number;
  title: string;
  explanation: string;
  exam_relevance?: string;
}

interface SourcesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: Source[];
  activeSourceId?: number;
}

export default function SourcesPanel({ 
  open, 
  onOpenChange, 
  sources,
  activeSourceId 
}: SourcesPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Sources
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-60px)]">
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
                  {/* Source number badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                      {source.id}
                    </span>
                    <h3 className="font-semibold text-sm leading-6">
                      {source.title}
                    </h3>
                  </div>
                  
                  {/* Explanation with LaTeX */}
                  <div className="text-sm text-muted-foreground leading-relaxed pl-9">
                    <MathText text={source.explanation} />
                  </div>
                  
                  {/* Exam relevance tip */}
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
      </SheetContent>
    </Sheet>
  );
}
