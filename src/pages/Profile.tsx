import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, Info, Instagram, Gift, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WeeklyStreak } from '@/components/WeeklyStreak';
import { 
  getTokenData, 
  claimSocialFollow, 
  recordDailyEngagement,
  type TokenData 
} from '@/hooks/useTokens';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import orbitLogo from '@/assets/orbit-logo.png';
import confetti from 'canvas-confetti';

const PURCHASE_OPTIONS = [
  { id: 'starter', tokens: 100, price: '£0.99', popular: false },
  { id: 'value', tokens: 500, price: '£3.99', popular: true },
  { id: 'pro', tokens: 1500, price: '£9.99', popular: false },
];

const triggerConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4CAF50', '#2196F3'],
  });
};

export default function Profile() {
  const navigate = useNavigate();
  const [tokenData, setTokenData] = useState<TokenData>(getTokenData());
  const [claimingIG, setClaimingIG] = useState(false);
  const [claimingTikTok, setClaimingTikTok] = useState(false);

  useEffect(() => {
    // Record engagement when viewing profile
    recordDailyEngagement();
    setTokenData(getTokenData());
  }, []);

  const handleClaimIG = () => {
    if (tokenData.followedIG || claimingIG) return;
    
    setClaimingIG(true);
    
    // Animate then claim
    setTimeout(() => {
      const claimed = claimSocialFollow('ig');
      if (claimed) {
        setTokenData(getTokenData());
        triggerConfetti();
        toast.success('+20 tokens claimed!', { icon: '✨' });
      }
      setClaimingIG(false);
    }, 600);
  };

  const handleClaimTikTok = () => {
    if (tokenData.followedTikTok || claimingTikTok) return;
    
    setClaimingTikTok(true);
    
    setTimeout(() => {
      const claimed = claimSocialFollow('tiktok');
      if (claimed) {
        setTokenData(getTokenData());
        triggerConfetti();
        toast.success('+20 tokens claimed!', { icon: '✨' });
      }
      setClaimingTikTok(false);
    }, 600);
  };

  const handlePurchase = (option: typeof PURCHASE_OPTIONS[0]) => {
    toast.info(`Purchase ${option.tokens} tokens for ${option.price} - coming soon!`);
  };

  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={orbitLogo} alt="Orbit" className="h-6 w-auto" />
        <h1 className="text-lg font-semibold">Profile</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Token Balance */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Tokens</p>
                  <p className="text-3xl font-bold">{tokenData.balance}</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-muted transition-colors">
                    <Info className="h-5 w-5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[250px]">
                  <p className="text-sm">
                    Tokens let you chat with Orbit. Earn them by practicing daily, 
                    following us on social media, or purchasing more.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Streak */}
        <Card>
          <CardContent className="p-6">
            <WeeklyStreak streak={tokenData.weeklyStreak} />
            <p className="text-sm text-muted-foreground mt-3">
              Practice daily to earn <span className="text-primary font-medium">+5 tokens</span> per day
            </p>
          </CardContent>
        </Card>

        {/* Earn Free Tokens */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Earn Free Tokens
          </h2>
          
          <div className="space-y-2">
            {/* Follow Instagram */}
            <button
              onClick={handleClaimIG}
              disabled={tokenData.followedIG}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300",
                tokenData.followedIG 
                  ? "bg-primary/10 border-2 border-primary" 
                  : "bg-muted hover:bg-muted/80 border-2 border-transparent",
                claimingIG && "scale-95"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300",
                  "bg-gradient-to-br from-purple-500 to-pink-500",
                  claimingIG && "animate-pulse scale-110"
                )}>
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Follow on Instagram</p>
                  <p className="text-sm text-muted-foreground">@orbit_maths</p>
                </div>
              </div>
              {tokenData.followedIG ? (
                <div className="flex items-center gap-1.5 text-primary animate-scale-in">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold">Claimed</span>
                </div>
              ) : claimingIG ? (
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              ) : (
                <span className="text-primary font-bold text-lg">+20</span>
              )}
            </button>

            {/* Follow TikTok */}
            <button
              onClick={handleClaimTikTok}
              disabled={tokenData.followedTikTok}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300",
                tokenData.followedTikTok 
                  ? "bg-primary/10 border-2 border-primary" 
                  : "bg-muted hover:bg-muted/80 border-2 border-transparent",
                claimingTikTok && "scale-95"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-black flex items-center justify-center transition-transform duration-300",
                  claimingTikTok && "animate-pulse scale-110"
                )}>
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium">Follow on TikTok</p>
                  <p className="text-sm text-muted-foreground">@orbit_maths</p>
                </div>
              </div>
              {tokenData.followedTikTok ? (
                <div className="flex items-center gap-1.5 text-primary animate-scale-in">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold">Claimed</span>
                </div>
              ) : claimingTikTok ? (
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              ) : (
                <span className="text-primary font-bold text-lg">+20</span>
              )}
            </button>
          </div>
        </div>

        {/* Purchase Tokens */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Get More Tokens</h2>
          
          <div className="grid gap-3">
            {PURCHASE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handlePurchase(option)}
                className="relative flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors border border-transparent hover:border-primary"
              >
                {option.popular && (
                  <span className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Best Value
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{option.tokens} tokens</span>
                </div>
                <span className="font-bold text-lg">{option.price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
