import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, Zap, Target, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import orbitLogo from '@/assets/orbit-logo.png';

interface LocalStats {
  questionsAttempted: number;
  questionsCorrect: number;
  sessionsCompleted: number;
  currentStreak: number;
  topicBreakdown: Record<string, { attempts: number; correct: number }>;
  lastPracticeDate?: string;
}

const DEFAULT_STATS: LocalStats = {
  questionsAttempted: 0,
  questionsCorrect: 0,
  sessionsCompleted: 0,
  currentStreak: 0,
  topicBreakdown: {},
};

function getLocalStats(): LocalStats {
  const stored = localStorage.getItem('orbitProgress');
  if (!stored) return DEFAULT_STATS;
  try {
    return { ...DEFAULT_STATS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_STATS;
  }
}

export function updateLocalStats(update: Partial<LocalStats>) {
  const current = getLocalStats();
  const updated = { ...current, ...update };
  localStorage.setItem('orbitProgress', JSON.stringify(updated));
}

export function recordAttempt(topicName: string, isCorrect: boolean) {
  const stats = getLocalStats();
  const today = new Date().toDateString();
  
  // Update totals
  stats.questionsAttempted += 1;
  if (isCorrect) stats.questionsCorrect += 1;
  
  // Update topic breakdown
  if (!stats.topicBreakdown[topicName]) {
    stats.topicBreakdown[topicName] = { attempts: 0, correct: 0 };
  }
  stats.topicBreakdown[topicName].attempts += 1;
  if (isCorrect) stats.topicBreakdown[topicName].correct += 1;
  
  // Update streak
  if (stats.lastPracticeDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastPracticeDate === yesterday.toDateString()) {
      stats.currentStreak += 1;
    } else if (stats.lastPracticeDate !== today) {
      stats.currentStreak = 1;
    }
    stats.lastPracticeDate = today;
  }
  
  localStorage.setItem('orbitProgress', JSON.stringify(stats));
}

export function recordSessionComplete() {
  const stats = getLocalStats();
  stats.sessionsCompleted += 1;
  localStorage.setItem('orbitProgress', JSON.stringify(stats));
}

export default function Progress() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LocalStats>(DEFAULT_STATS);

  useEffect(() => {
    setStats(getLocalStats());
  }, []);

  const accuracy = stats.questionsAttempted > 0 
    ? Math.round((stats.questionsCorrect / stats.questionsAttempted) * 100) 
    : 0;

  const topTopics = Object.entries(stats.topicBreakdown)
    .map(([name, data]) => ({
      name,
      attempts: data.attempts,
      correct: data.correct,
      accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5);

  const hasData = stats.questionsAttempted > 0;

  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={orbitLogo} alt="Orbit" className="h-6 w-auto" />
        <h1 className="text-lg font-semibold">Your Progress</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {!hasData ? (
          // Empty state
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Start your journey</h2>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Complete practice sessions in the Arena to track your progress here.
              </p>
            </div>
            <Button onClick={() => navigate('/practice-arena')} className="mt-4">
              Start Practicing
            </Button>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <StatCard 
                icon={<TrendingUp className="h-6 w-6 text-primary" />}
                value={`${accuracy}%`}
                label="accuracy"
              />
              <StatCard 
                icon={<Zap className="h-6 w-6 text-primary" />}
                value={stats.questionsAttempted}
                label="questions"
              />
              <StatCard 
                icon={<Trophy className="h-6 w-6 text-primary" />}
                value={stats.sessionsCompleted}
                label="sessions"
              />
              <StatCard 
                icon={<Flame className="h-6 w-6 text-primary" />}
                value={stats.currentStreak}
                label="day streak"
              />
            </div>

            {/* Top Topics */}
            {topTopics.length > 0 && (
              <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <h2 className="text-lg font-semibold">Topics Practiced</h2>
                <div className="space-y-3">
                  {topTopics.map((topic, index) => (
                    <div
                      key={topic.name}
                      className="bg-muted rounded-2xl p-4 border border-border animate-fade-in"
                      style={{ animationDelay: `${(index + 1) * 50}ms` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{topic.name}</h3>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          topic.accuracy >= 70 ? "bg-secondary/15 text-secondary" :
                          topic.accuracy >= 40 ? "bg-warning/15 text-warning" :
                          "bg-destructive/15 text-destructive"
                        )}>
                          {topic.accuracy}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{topic.correct}/{topic.attempts} correct</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-accent overflow-hidden mt-2">
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

            {/* Motivation */}
            <div className="text-center p-6 bg-muted rounded-2xl animate-fade-in border border-border" style={{ animationDelay: '200ms' }}>
              <p className="text-2xl mb-2">
                {accuracy >= 70 ? '🌟' : accuracy >= 40 ? '💪' : '📚'}
              </p>
              <p className="text-muted-foreground">
                {accuracy >= 70 
                  ? "You're doing amazing! Keep up the great work."
                  : accuracy >= 40 
                  ? "Good progress! Practice makes perfect."
                  : "Every expert was once a beginner. Keep going!"}
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

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="bg-muted rounded-2xl p-5 text-center border border-border">
      <div 
        className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
        style={{ background: 'rgba(0,250,215,0.15)' }}
      >
        {icon}
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}