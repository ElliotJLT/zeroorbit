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
    <div className="min-h-screen bg-[#0F1114]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0F1114]/95 backdrop-blur border-b border-[#23272E]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={orbitLogo} alt="Orbit" className="h-8 w-8" />
            <span className="font-semibold text-white">My Progress</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        {/* Profile Summary */}
        {profile && (
          <div className="bg-[#1A1D21] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-[#0F1114] font-bold text-lg">
                {firstName?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-white">{profile.full_name || 'Student'}</p>
                <p className="text-sm text-[#9CA3AF]">
                  {[profile.year_group, profile.exam_board, profile.target_grade && `Target ${profile.target_grade}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Token Balance */}
        <div className="bg-[#1A1D21] rounded-2xl p-4 border border-[#23272E]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="font-medium text-white">Your Tokens</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-[#9CA3AF]" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] bg-[#23272E] border-[#23272E] text-white">
                    <p className="text-sm">Tokens are used for AI tutoring sessions. Earn more by practicing daily or following us!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-2xl font-bold text-white">{tokenData.balance}</span>
          </div>
        </div>

        {/* Weekly Streak */}
        <div className="bg-[#1A1D21] rounded-2xl p-4 border border-[#23272E]">
          <WeeklyStreak streak={tokenData.weeklyStreak} />
          <p className="text-xs text-[#9CA3AF] mt-3">
            Practice daily for +5 tokens each day
          </p>
        </div>

        {/* Start Tracking Fluency - shown when no data, positioned under profile */}
        {!hasData && (
          <div className="bg-[#1A1D21] rounded-2xl border border-dashed border-[#23272E] p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#23272E] flex items-center justify-center mx-auto">
              <Target className="h-6 w-6 text-[#9CA3AF]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-white">Start tracking your fluency</h3>
              <p className="text-sm text-[#9CA3AF]">
                Test yourself in the Practice Arena to see your stats and improvement over time.
              </p>
            </div>
            <Button onClick={() => navigate('/practice-arena')} size="sm" variant="outline" className="border-[#23272E] bg-transparent text-white hover:bg-[#23272E]">
              Go to Practice Arena
            </Button>
          </div>
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
              <div className="bg-[#1A1D21] rounded-2xl border border-[#23272E]">
                <div className="p-4 pb-3">
                  <h3 className="text-base font-semibold flex items-center gap-2 text-white">
                    <TrendingDown className="h-4 w-4 text-amber-500" />
                    Focus Areas
                  </h3>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  {focusAreas.map((area) => (
                    <div key={area.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate text-white">{area.name}</span>
                        <span className="text-[#9CA3AF]">{area.accuracy}%</span>
                      </div>
                      <Progress value={area.accuracy} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Topics */}
            <div className="bg-[#1A1D21] rounded-2xl border border-[#23272E]">
              <div className="p-4 pb-3">
                <h3 className="text-base font-semibold text-white">All Topics</h3>
              </div>
              <div className="px-4 pb-4 space-y-3">
                {sortedTopics.map(([name, data]) => {
                  const accuracy = data.attempts > 0 
                    ? Math.round((data.correct / data.attempts) * 100) 
                    : 0;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate text-white">{name}</span>
                        <span className="text-[#9CA3AF]">
                          {data.correct}/{data.attempts} ({accuracy}%)
                        </span>
                      </div>
                      <Progress value={accuracy} className="h-2" />
                    </div>
                  );
                })}
                {sortedTopics.length === 0 && (
                  <p className="text-sm text-[#9CA3AF] text-center py-4">
                    No topic data yet
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Earn Free Tokens */}
        <div className="bg-[#1A1D21] rounded-2xl border border-[#23272E]">
          <div className="p-4 pb-3">
            <h3 className="text-base font-semibold flex items-center gap-2 text-white">
              🎁 Earn Free Tokens
            </h3>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {/* Instagram */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#23272E]">
              <div className="flex items-center gap-3">
                <Instagram className="h-5 w-5 text-white" />
                <span className="text-sm font-medium text-white">@orbit_maths</span>
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#23272E]">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                <span className="text-sm font-medium text-white">@orbit_maths</span>
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
          </div>
        </div>

        {/* Get More Tokens */}
        <div className="bg-[#1A1D21] rounded-2xl border border-[#23272E]">
          <div className="p-4 pb-3">
            <h3 className="text-base font-semibold text-white">Get More Tokens</h3>
          </div>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-3">
              {PURCHASE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handlePurchase(option)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-center transition-all hover:scale-105",
                    option.popular
                      ? "border-primary bg-primary/5"
                      : "border-[#23272E] hover:border-primary/50"
                  )}
                >
                  {option.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-[#0F1114] text-xs font-medium rounded-full">
                      Best
                    </span>
                  )}
                  <div className="text-2xl font-bold text-white">{option.tokens}</div>
                  <div className="text-sm text-[#9CA3AF]">{option.price}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
