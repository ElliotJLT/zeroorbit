import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, TrendingUp, LogOut, Shield, ChevronRight, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { TopicChip } from '@/components/TopicChip';
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

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const totalAttempts = stats.reduce((sum, s) => sum + s.attempts, 0);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link to="/admin">
                <Shield className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        {/* Greeting */}
        <div className="space-y-1 animate-fade-in">
          <h1 className="text-3xl font-bold font-display">
            Hey {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Ready to tackle some maths?
          </p>
        </div>

        {/* Primary CTA */}
        <Button
          onClick={() => navigate('/ask')}
          className="w-full h-16 text-lg rounded-2xl btn-primary animate-fade-in"
          style={{ animationDelay: '100ms' }}
        >
          <Plus className="h-6 w-6 mr-2" />
          Ask a question
        </Button>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4 text-warning" />
              <span className="text-xs">This week</span>
            </div>
            <p className="text-2xl font-bold">{weeklyCount}</p>
            <p className="text-xs text-muted-foreground">questions</p>
          </div>
          
          <div className="glass-card rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">topics practiced</p>
          </div>
        </div>

        {/* Profile info */}
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
              {firstName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {profile.year_group} • {profile.exam_board} • Target: {profile.target_grade}
              </p>
            </div>
          </div>
        </div>

        {/* Topics */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display">Your Topics</h2>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/progress">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            {topics.slice(0, 4).map((topic) => {
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
