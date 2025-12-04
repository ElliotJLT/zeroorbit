import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface PracticeStat {
  topic_id: string;
  attempts: number;
  correct_attempts: number;
}

type StrengthLevel = 'strong' | 'ok' | 'weak' | 'none';

function getStrengthLevel(attempts: number, correctAttempts: number): StrengthLevel {
  if (attempts === 0) return 'none';
  const percentage = (correctAttempts / attempts) * 100;
  if (percentage >= 70) return 'strong';
  if (percentage >= 40) return 'ok';
  return 'weak';
}

export default function Progress() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<PracticeStat[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const { data: topicsData } = await supabase
      .from('topics')
      .select('*')
      .order('name');
    
    if (topicsData) setTopics(topicsData);

    const { data: statsData } = await supabase
      .from('practice_stats')
      .select('*')
      .eq('user_id', user!.id);
    
    if (statsData) setStats(statsData);
  };

  const getStatForTopic = (topicId: string) => {
    return stats.find((s) => s.topic_id === topicId) || {
      attempts: 0,
      correct_attempts: 0,
    };
  };

  const totalAttempts = stats.reduce((sum, s) => sum + s.attempts, 0);
  const totalCorrect = stats.reduce((sum, s) => sum + s.correct_attempts, 0);
  const overallPercentage = totalAttempts > 0 
    ? Math.round((totalCorrect / totalAttempts) * 100) 
    : 0;

  const strongCount = topics.filter(t => {
    const stat = getStatForTopic(t.id);
    return getStrengthLevel(stat.attempts, stat.correct_attempts) === 'strong';
  }).length;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold font-display">Your Progress</h1>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <div className="glass-card rounded-2xl p-5 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-primary mb-3">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <p className="text-3xl font-bold">{overallPercentage}%</p>
            <p className="text-sm text-muted-foreground">accuracy</p>
          </div>
          
          <div className="glass-card rounded-2xl p-5 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-secondary mb-3">
              <Trophy className="h-6 w-6 text-secondary-foreground" />
            </div>
            <p className="text-3xl font-bold">{strongCount}</p>
            <p className="text-sm text-muted-foreground">topics mastered</p>
          </div>
        </div>

        {/* Topics Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold font-display">By Topic</h2>
          <div className="space-y-3">
            {topics.map((topic, index) => {
              const stat = getStatForTopic(topic.id);
              const level = getStrengthLevel(stat.attempts, stat.correct_attempts);
              const percentage = stat.attempts > 0
                ? Math.round((stat.correct_attempts / stat.attempts) * 100)
                : 0;

              return (
                <div
                  key={topic.id}
                  className="glass-card rounded-2xl p-4 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                        level === 'strong' && "bg-secondary/20",
                        level === 'ok' && "bg-warning/20",
                        level === 'weak' && "bg-destructive/20",
                        level === 'none' && "bg-muted"
                      )}>
                        {level === 'strong' && '💪'}
                        {level === 'ok' && '📈'}
                        {level === 'weak' && '📚'}
                        {level === 'none' && '🔒'}
                      </div>
                      <div>
                        <h3 className="font-medium">{topic.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {stat.attempts} attempt{stat.attempts !== 1 ? 's' : ''}
                          {stat.attempts > 0 && ` • ${percentage}% correct`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full font-medium",
                        level === 'strong' && "bg-secondary/15 text-secondary",
                        level === 'ok' && "bg-warning/15 text-warning",
                        level === 'weak' && "bg-destructive/15 text-destructive",
                        level === 'none' && "bg-muted text-muted-foreground"
                      )}
                    >
                      {level === 'strong' && 'Strong'}
                      {level === 'ok' && 'Getting there'}
                      {level === 'weak' && 'Needs work'}
                      {level === 'none' && 'Not started'}
                    </span>
                  </div>
                  
                  {stat.attempts > 0 && (
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          level === 'strong' && "bg-gradient-secondary",
                          level === 'ok' && "bg-warning",
                          level === 'weak' && "bg-destructive"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Encouragement */}
        {totalAttempts > 0 && (
          <div className="text-center p-6 glass-card rounded-2xl animate-fade-in">
            <p className="text-2xl mb-2">
              {overallPercentage >= 70 ? '🌟' : overallPercentage >= 40 ? '💪' : '📚'}
            </p>
            <p className="text-muted-foreground">
              {overallPercentage >= 70 
                ? "Amazing progress! You're crushing it!"
                : overallPercentage >= 40 
                ? "Good work! Keep practicing to improve."
                : "Every expert was once a beginner. Keep going!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
