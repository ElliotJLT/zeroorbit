import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h2">Your Progress</h1>
        </div>

        {/* Overall Stats */}
        <Card className="corner-glow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-primary/20">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall accuracy</p>
                <p className="text-3xl font-bold">{overallPercentage}%</p>
                <p className="text-sm text-muted-foreground">
                  {totalCorrect} / {totalAttempts} questions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics Grid */}
        <div className="space-y-3">
          <h2 className="text-h3">By Topic</h2>
          <div className="grid gap-3">
            {topics.map((topic) => {
              const stat = getStatForTopic(topic.id);
              const level = getStrengthLevel(stat.attempts, stat.correct_attempts);
              const percentage = stat.attempts > 0
                ? Math.round((stat.correct_attempts / stat.attempts) * 100)
                : 0;

              return (
                <Card
                  key={topic.id}
                  className={cn(
                    "transition-all duration-200",
                    level === 'strong' && "border-secondary/30",
                    level === 'ok' && "border-warning/30",
                    level === 'weak' && "border-destructive/30"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{topic.name}</h3>
                      <span
                        className={cn(
                          "text-sm px-3 py-1 rounded-full font-medium",
                          level === 'strong' && "bg-secondary/20 text-secondary",
                          level === 'ok' && "bg-warning/20 text-warning",
                          level === 'weak' && "bg-destructive/20 text-destructive",
                          level === 'none' && "bg-muted text-muted-foreground"
                        )}
                      >
                        {level === 'strong' && 'Strong'}
                        {level === 'ok' && 'OK'}
                        {level === 'weak' && 'Weak'}
                        {level === 'none' && 'Not started'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{stat.attempts} attempts</span>
                      {stat.attempts > 0 && <span>{percentage}% correct</span>}
                    </div>
                    {stat.attempts > 0 && (
                      <div className="mt-2 h-2 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-500",
                            level === 'strong' && "bg-secondary",
                            level === 'ok' && "bg-warning",
                            level === 'weak' && "bg-destructive"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
