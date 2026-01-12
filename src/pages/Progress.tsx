import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Zap, Clock, HelpCircle, Target, TrendingDown, Info, Instagram, Check, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WeeklyStreak } from '@/components/WeeklyStreak';
import { StatCard } from '@/components/StatCard';
import { getLocalStats, formatTime, LocalStats } from '@/hooks/useLocalProgress';
import { getTokenData, claimSocialFollow, TokenData } from '@/hooks/useTokens';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import orbitLogo from '@/assets/orbit-logo.png';

const PURCHASE_OPTIONS = [
  { id: 'starter', tokens: 100, price: '£0.99', popular: false },
  { id: 'value', tokens: 500, price: '£3.99', popular: true },
  { id: 'pro', tokens: 1500, price: '£9.99', popular: false },
];

const DEFAULT_STATS: LocalStats = {
  questionsAttempted: 0,
  questionsCorrect: 0,
  sessionsCompleted: 0,
  currentStreak: 0,
  topicBreakdown: {},
  totalHintsUsed: 0,
  totalTimeSec: 0,
};

interface ProfileData {
  full_name: string | null;
  year_group: string | null;
  exam_board: string | null;
  target_grade: string | null;
}

const triggerConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4CAF50', '#2196F3'],
  });
};

export default function ProgressPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LocalStats>(DEFAULT_STATS);
  const [tokenData, setTokenData] = useState<TokenData>(getTokenData());
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [claimingIG, setClaimingIG] = useState(false);
  const [claimingTikTok, setClaimingTikTok] = useState(false);

  useEffect(() => {
    const localStats = getLocalStats();
    setStats(localStats);
    
    // Fetch profile if logged in
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, year_group, exam_board, target_grade')
          .eq('user_id', user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleClaimIG = () => {
    if (tokenData.followedIG) return;
    setClaimingIG(true);
    setTimeout(() => {
      const claimed = claimSocialFollow('ig');
      if (claimed) {
        setTokenData(getTokenData());
        triggerConfetti();
        toast.success('+20 tokens claimed!', { icon: '✨' });
      }
      setClaimingIG(false);
    }, 800);
  };

  const handleClaimTikTok = () => {
    if (tokenData.followedTikTok) return;
    setClaimingTikTok(true);
    setTimeout(() => {
      const claimed = claimSocialFollow('tiktok');
      if (claimed) {
        setTokenData(getTokenData());
        triggerConfetti();
        toast.success('+20 tokens claimed!', { icon: '✨' });
      }
      setClaimingTikTok(false);
    }, 800);
  };

  const handlePurchase = (option: typeof PURCHASE_OPTIONS[0]) => {
    toast.info('Purchases coming soon!', {
      description: `${option.tokens} tokens for ${option.price}`,
    });
  };

  // Calculate derived stats
  const avgTimeSec = stats.questionsAttempted > 0 
    ? Math.round(stats.totalTimeSec / stats.questionsAttempted) 
    : 0;
  const hintsPerQuestion = stats.questionsAttempted > 0 
    ? (stats.totalHintsUsed / stats.questionsAttempted).toFixed(1) 
    : '0';

  // Get topics sorted by attempts
  const topicEntries = Object.entries(stats.topicBreakdown);
  const sortedTopics = topicEntries.sort((a, b) => b[1].attempts - a[1].attempts);
  
  // Find focus areas (weakest topics with at least 2 attempts)
  const focusAreas = topicEntries
    .filter(([, data]) => data.attempts >= 2)
    .map(([name, data]) => ({
      name,
      accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
      attempts: data.attempts,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  const hasData = stats.questionsAttempted > 0;
  const firstName = profile?.full_name?.split(' ')[0] || null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={orbitLogo} alt="Orbit" className="h-8 w-8" />
            <span className="font-semibold">My Progress</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        {/* Profile Summary */}
        {profile && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {firstName?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{profile.full_name || 'Student'}</p>
                  <p className="text-sm text-muted-foreground">
                    {[profile.year_group, profile.exam_board, profile.target_grade && `Target ${profile.target_grade}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Balance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">Your Tokens</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <p className="text-sm">Tokens are used for AI tutoring sessions. Earn more by practicing daily or following us!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-2xl font-bold">{tokenData.balance}</span>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Streak */}
        <Card>
          <CardContent className="p-4">
            <WeeklyStreak streak={tokenData.weeklyStreak} />
            <p className="text-xs text-muted-foreground mt-3">
              Practice daily for +5 tokens each day
            </p>
          </CardContent>
        </Card>

        {/* Start Tracking Fluency - shown when no data, positioned under profile */}
        {!hasData && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">Start tracking your fluency</h3>
                <p className="text-sm text-muted-foreground">
                  Test yourself in the Practice Arena to see your stats and improvement over time.
                </p>
              </div>
              <Button onClick={() => navigate('/practice-arena')} size="sm" variant="outline">
                Go to Practice Arena
              </Button>
            </CardContent>
          </Card>
        )}

        {hasData && (
          <>
            {/* Fluency Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Flame className="h-6 w-6 text-orange-500" />}
                value={stats.currentStreak}
                label="day streak"
              />
              <StatCard
                icon={<Zap className="h-6 w-6 text-blue-500" />}
                value={stats.questionsAttempted}
                label="attempts"
              />
              <StatCard
                icon={<Clock className="h-6 w-6 text-green-500" />}
                value={avgTimeSec > 0 ? formatTime(avgTimeSec) : '—'}
                label="avg per Q"
              />
              <StatCard
                icon={<HelpCircle className="h-6 w-6 text-purple-500" />}
                value={hintsPerQuestion}
                label="hints per Q"
              />
            </div>

            {/* Focus Areas */}
            {focusAreas.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-amber-500" />
                    Focus Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {focusAreas.map((area) => (
                    <div key={area.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{area.name}</span>
                        <span className="text-muted-foreground">{area.accuracy}%</span>
                      </div>
                      <Progress value={area.accuracy} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* All Topics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">All Topics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedTopics.map(([name, data]) => {
                  const accuracy = data.attempts > 0 
                    ? Math.round((data.correct / data.attempts) * 100) 
                    : 0;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{name}</span>
                        <span className="text-muted-foreground">
                          {data.correct}/{data.attempts} ({accuracy}%)
                        </span>
                      </div>
                      <Progress value={accuracy} className="h-2" />
                    </div>
                  );
                })}
                {sortedTopics.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No topic data yet
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Earn Free Tokens */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🎁 Earn Free Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Instagram */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Instagram className="h-5 w-5" />
                <span className="text-sm font-medium">@orbit_maths</span>
              </div>
              <Button
                size="sm"
                variant={tokenData.followedIG ? "secondary" : "default"}
                onClick={handleClaimIG}
                disabled={tokenData.followedIG || claimingIG}
                className={cn(
                  "min-w-[80px] transition-all",
                  claimingIG && "animate-pulse"
                )}
              >
                {tokenData.followedIG ? (
                  <><Check className="h-4 w-4 mr-1" /> Claimed</>
                ) : claimingIG ? (
                  "Claiming..."
                ) : (
                  "+20"
                )}
              </Button>
            </div>

            {/* TikTok */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                <span className="text-sm font-medium">@orbit_maths</span>
              </div>
              <Button
                size="sm"
                variant={tokenData.followedTikTok ? "secondary" : "default"}
                onClick={handleClaimTikTok}
                disabled={tokenData.followedTikTok || claimingTikTok}
                className={cn(
                  "min-w-[80px] transition-all",
                  claimingTikTok && "animate-pulse"
                )}
              >
                {tokenData.followedTikTok ? (
                  <><Check className="h-4 w-4 mr-1" /> Claimed</>
                ) : claimingTikTok ? (
                  "Claiming..."
                ) : (
                  "+20"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Get More Tokens */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Get More Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {PURCHASE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handlePurchase(option)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-center transition-all hover:scale-105",
                    option.popular
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {option.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Best
                    </span>
                  )}
                  <div className="text-2xl font-bold">{option.tokens}</div>
                  <div className="text-sm text-muted-foreground">{option.price}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
