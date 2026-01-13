import { BookOpen, GraduationCap, TrendingUp, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import MathText from '../MathText';
import { useAuth } from '@/hooks/useAuth';
import type { Source } from './types';

interface SourcesPanelDesktopProps {
  sources: Source[];
  activeSourceId?: number;
}

export default function SourcesPanelDesktop({ 
  sources,
  activeSourceId,
}: SourcesPanelDesktopProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - smaller, contextual */}
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" />
          My Learning
        </span>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
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
              
              {/* CTA for logged-in users - below placeholder */}
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/progress')}
                  className="mt-4 gap-2 border-primary/30 hover:bg-primary/10"
                >
                  <TrendingUp className="h-4 w-4" />
                  View My Progress
                </Button>
              )}
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
    </div>
  );
}
