import { useState } from 'react';
import { BookOpen, GraduationCap, TrendingUp, Sparkles, ChevronDown, ChevronUp, Layers, Swords, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import MathText from '../MathText';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Source } from './types';

interface SourcesPanelDesktopProps {
  sources: Source[];
  activeSourceId?: number;
}

// Example key insights (mock data for now)
const exampleInsights = [
  {
    id: 1,
    title: "Rearranging equations",
    summary: "Always do the same operation to both sides",
    explanation: "When rearranging equations, whatever you do to one side, you must do to the other. This keeps the equation balanced. For example, to isolate $x$ in $2x + 5 = 11$, subtract 5 from both sides first, then divide both sides by 2.",
  },
  {
    id: 2,
    title: "Reading graphs carefully",
    summary: "Check the axis scales before answering",
    explanation: "Many students lose marks by misreading graph scales. Always check: What does each axis represent? What are the units? Does the scale start at zero? A quick 5-second check can save you from silly mistakes.",
  },
];

export default function SourcesPanelDesktop({ 
  sources,
  activeSourceId,
}: SourcesPanelDesktopProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const toggleInsight = (id: number) => {
    setExpandedInsight(expandedInsight === id ? null : id);
  };

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
          {/* Study Actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              Study with your insights
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => toast.info("Flash cards would use spaced repetition (SM-2 algorithm) to create cards from key insights, storing review intervals in Supabase for optimal retention.")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
              >
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Flash Cards</span>
              </button>
              <button
                onClick={() => toast.info("Arena test would generate questions from your weak spots identified in insights, using the existing generate-arena-question edge function with topic filtering.")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
              >
                <Swords className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Test in Arena</span>
              </button>
              <button
                onClick={() => toast.info("Podcast would use NotebookLM-style audio generation: send insights to Gemini for script creation, then use ElevenLabs or Google TTS for conversational audio synthesis.")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
              >
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Podcast</span>
              </button>
            </div>
          </div>

          {/* Key Insights Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Key Insights
            </div>
            {exampleInsights.map((insight) => (
              <button
                key={insight.id}
                onClick={() => toggleInsight(insight.id)}
                className={`w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50 ${
                  expandedInsight === insight.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-card/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.summary}</p>
                  </div>
                  {expandedInsight === insight.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
                {expandedInsight === insight.id && (
                  <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground leading-relaxed">
                    <MathText text={insight.explanation} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Divider if we have sources */}
          {sources.length > 0 && (
            <div className="border-t border-border my-4" />
          )}

          {sources.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-muted-foreground/70">
                More sources will appear here as you learn.
              </p>
              
              {/* CTA for logged-in users - below placeholder */}
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/progress')}
                  className="mt-2 gap-2 border-primary/30 hover:bg-primary/10"
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
