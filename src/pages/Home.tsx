import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, LogOut, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { TopicChip } from '@/components/TopicChip';
import orbitLogo from '@/assets/orbit-logo.png';

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
  const totalAttempts = stats.reduce((sum, s) => sum + (s.attempts || 0), 0);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <img src={orbitLogo} alt="Orbit" className="h-8 w-auto" />
          {isAdmin && (
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link to="/admin">
                <Shield className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full text-muted-foreground">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
        {/* Greeting */}
        <div className="space-y-1 animate-fade-in">
          <h1 className="text-3xl font-semibold tracking-tight">
            Hi, {firstName}
          </h1>
          <p className="text-muted-foreground">
            What would you like to work on?
          </p>
        </div>

        {/* Primary CTA */}
        <Button
          onClick={() => navigate('/ask')}
          className="w-full h-14 text-base rounded-full font-medium transition-all text-white animate-fade-in"
          style={{ 
            background: '#111416',
            border: '1px solid #00FAD7',
            animationDelay: '100ms'
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(0,250,215,0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <Plus className="h-5 w-5 mr-2" />
          New Question
        </Button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="bg-muted rounded-2xl p-5 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">This week</p>
            <p className="text-3xl font-semibold">{weeklyCount}</p>
            <p className="text-sm text-muted-foreground">questions</p>
          </div>
          
          <div className="bg-muted rounded-2xl p-5 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-3xl font-semibold">{totalAttempts}</p>
            <p className="text-sm text-muted-foreground">practiced</p>
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-muted rounded-2xl p-4 flex items-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg"
            style={{ background: '#00FAD7', color: '#0B0D0F' }}
          >
            {firstName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{profile.full_name}</p>
            <p className="text-sm text-muted-foreground">
              {profile.year_group} · {profile.exam_board} · Target {profile.target_grade}
            </p>
          </div>
        </div>

        {/* Topics */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Topics</h2>
            <Button variant="ghost" size="sm" asChild className="text-primary -mr-2">
              <Link to="/progress">
                See all
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
                  attempts={stat.attempts || 0}
                  correctAttempts={stat.correct_attempts || 0}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}