import { BookOpen, GraduationCap, TrendingUp, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import MathText from '../MathText';
import { useAuth } from '@/hooks/useAuth';
import type { Source } from './types';

interface SourcesPanelMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: Source[];
  activeSourceId?: number;
}

export default function SourcesPanelMobile({ 
  open, 
  onOpenChange, 
  sources,
  activeSourceId,
}: SourcesPanelMobileProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            My Learning
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="p-4 space-y-4">
            {/* CTA for logged-in users */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/progress');
                }}
                className="w-full gap-2 border-primary/30 hover:bg-primary/10"
              >
                <TrendingUp className="h-4 w-4" />
                View My Progress
              </Button>
            )}

            {sources.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Sources and insights will appear here as you learn.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Ask questions to unlock helpful explanations and exam tips.
                </p>
              </div>
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
      </SheetContent>
    </Sheet>
  );
}
