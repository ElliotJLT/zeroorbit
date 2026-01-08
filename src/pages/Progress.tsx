import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Flame, Clock, HelpCircle, TrendingDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import orbitLogo from '@/assets/orbit-logo.png';
import { StatCard } from '@/components/StatCard';
import { 
  getLocalStats, 
  formatTime,
  type LocalStats 
} from '@/hooks/useLocalProgress';

const DEFAULT_STATS: LocalStats = {
  questionsAttempted: 0,
  questionsCorrect: 0,
  sessionsCompleted: 0,
  currentStreak: 0,
  topicBreakdown: {},
  totalHintsUsed: 0,
  totalTimeSec: 0,
};

export default function Progress() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LocalStats>(DEFAULT_STATS);

  useEffect(() => {
    setStats(getLocalStats());
  }, []);

  const avgTimePerQuestion = stats.questionsAttempted > 0 
    ? Math.round(stats.totalTimeSec / stats.questionsAttempted) 
    : 0;
  
  const avgHintsPerQuestion = stats.questionsAttempted > 0 
    ? (stats.totalHintsUsed / stats.questionsAttempted).toFixed(1) 
    : '0';

  // Get weak skills (lowest accuracy with at least 2 attempts)
  const weakSkills = Object.entries(stats.topicBreakdown)
    .filter(([_, data]) => data.attempts >= 2)
    .map(([name, data]) => ({
      name,
      attempts: data.attempts,
      correct: data.correct,
      accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
      avgHints: data.attempts > 0 ? (data.totalHints / data.attempts).toFixed(1) : '0',
      avgTime: data.attempts > 0 ? Math.round(data.totalTimeSec / data.attempts) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  // All topics sorted by attempts for fluency view
  const allTopics = Object.entries(stats.topicBreakdown)
    .map(([name, data]) => ({
      name,
      attempts: data.attempts,
      correct: data.correct,
      accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
      avgHints: data.attempts > 0 ? (data.totalHints / data.attempts).toFixed(1) : '0',
      avgTime: data.attempts > 0 ? Math.round(data.totalTimeSec / data.attempts) : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const hasData = stats.questionsAttempted > 0;

  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={orbitLogo} alt="Orbit" className="h-6 w-auto" />
        <h1 className="text-lg font-semibold">Fluency Progress</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {!hasData ? (
          // Empty state - encourage testing
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">No progress yet</h2>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Test yourself in the Practice Arena to start tracking your fluency and see your weak spots.
              </p>
            </div>
            <Button onClick={() => navigate('/practice-arena')} className="mt-4">
              Go to Practice Arena
            </Button>
          </div>
        ) : (
          <>
            {/* Fluency Stats */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <StatCard 
                icon={<Flame className="h-6 w-6 text-primary" />}
                value={stats.currentStreak}
                label="day streak"
              />
              <StatCard 
                icon={<Zap className="h-6 w-6 text-primary" />}
                value={stats.questionsAttempted}
                label="attempts"
              />
              <StatCard 
                icon={<Clock className="h-6 w-6 text-primary" />}
                value={avgTimePerQuestion > 0 ? formatTime(avgTimePerQuestion) : '—'}
                label="avg per Q"
              />
              <StatCard 
                icon={<HelpCircle className="h-6 w-6 text-primary" />}
                value={avgHintsPerQuestion}
                label="hints per Q"
              />
            </div>

            {/* Weak Skills - Focus Area */}
            {weakSkills.length > 0 && (
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <h2 className="text-lg font-semibold">Focus Areas</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-1">
                  Topics where you're struggling most
                </p>
                <div className="space-y-2">
                  {weakSkills.map((topic, index) => (
                    <div
                      key={topic.name}
                      className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 animate-fade-in"
                      style={{ animationDelay: `${(index + 1) * 50}ms` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm">{topic.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                          {topic.accuracy}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{topic.attempts} attempts</span>
                        <span>•</span>
                        <span>{topic.avgHints} hints/Q</span>
                        {topic.avgTime > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatTime(topic.avgTime)}/Q</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Topics */}
            {allTopics.length > 0 && (
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <h2 className="text-lg font-semibold">All Topics</h2>
                <div className="space-y-2">
                  {allTopics.map((topic, index) => (
                    <div
                      key={topic.name}
                      className="bg-muted rounded-xl p-4 border border-border animate-fade-in"
                      style={{ animationDelay: `${(index + 1) * 30}ms` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm">{topic.name}</h3>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          topic.accuracy >= 70 ? "bg-secondary/15 text-secondary" :
                          topic.accuracy >= 40 ? "bg-warning/15 text-warning" :
                          "bg-destructive/15 text-destructive"
                        )}>
                          {topic.accuracy}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{topic.correct}/{topic.attempts}</span>
                        <span>•</span>
                        <span>{topic.avgHints} hints</span>
                        {topic.avgTime > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatTime(topic.avgTime)}</span>
                          </>
                        )}
                      </div>
                      <div className="h-1 rounded-full bg-accent overflow-hidden mt-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            topic.accuracy >= 70 ? "bg-secondary" :
                            topic.accuracy >= 40 ? "bg-warning" :
                            "bg-destructive"
                          )}
                          style={{ width: `${topic.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fluency Tip */}
            <div className="text-center p-5 bg-muted rounded-xl animate-fade-in border border-border" style={{ animationDelay: '200ms' }}>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Fluency tip:</span> Aim to reduce hints needed and time per question over time.
              </p>
            </div>

            {/* CTA */}
            <Button 
              onClick={() => navigate('/practice-arena')} 
              className="w-full h-12 text-base font-medium"
            >
              Continue Practicing
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
