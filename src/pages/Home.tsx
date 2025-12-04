import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, TrendingUp, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TopicChip } from '@/components/TopicChip';

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

export default function Home() {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<PracticeStat[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && profile && !profile.onboarding_completed) {
      navigate('/onboarding');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch topics
    const { data: topicsData } = await supabase
      .from('topics')
      .select('*')
      .order('name');
    
    if (topicsData) setTopics(topicsData);

    // Fetch practice stats
    const { data: statsData } = await supabase
      .from('practice_stats')
      .select('*')
      .eq('user_id', user!.id);
    
    if (statsData) setStats(statsData);

    // Fetch weekly session count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .gte('created_at', weekAgo.toISOString());
    
    setWeeklyCount(count || 0);
  };

  const getStatForTopic = (topicId: string) => {
    return stats.find((s) => s.topic_id === topicId) || {
      attempts: 0,
      correct_attempts: 0,
    };
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h2">
              Hi{profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm">
              {profile.year_group} • {profile.exam_board} • Target: {profile.target_grade}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin">
                  <Shield className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Primary CTA */}
        <Button
          variant="hero"
          size="pill-xl"
          className="w-full"
          onClick={() => navigate('/ask')}
        >
          <Plus className="h-5 w-5" />
          Ask a maths question
        </Button>

        {/* This Week Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-secondary/20">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This week</p>
                <p className="text-xl font-semibold">
                  {weeklyCount} question{weeklyCount !== 1 ? 's' : ''} solved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h3">Topics</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/progress">View all</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {topics.map((topic) => {
              const stat = getStatForTopic(topic.id);
              return (
                <TopicChip
                  key={topic.id}
                  name={topic.name}
                  attempts={stat.attempts}
                  correctAttempts={stat.correct_attempts}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
