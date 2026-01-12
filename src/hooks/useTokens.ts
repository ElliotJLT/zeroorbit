export interface TokenData {
  balance: number;
  weeklyStreak: boolean[]; // 7 days, index 0 = Monday
  lastEngagementDate?: string;
  followedIG: boolean;
  followedTikTok: boolean;
}

const DEFAULT_TOKEN_DATA: TokenData = {
  balance: 50, // Start with 50 free tokens
  weeklyStreak: [false, false, false, false, false, false, false],
  followedIG: false,
  followedTikTok: false,
};

const STORAGE_KEY = 'orbitTokens';

export function getTokenData(): TokenData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_TOKEN_DATA;
  try {
    return { ...DEFAULT_TOKEN_DATA, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_TOKEN_DATA;
  }
}

function saveTokenData(data: TokenData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addTokens(amount: number): void {
  const data = getTokenData();
  data.balance += amount;
  saveTokenData(data);
}

export function spendTokens(amount: number): boolean {
  const data = getTokenData();
  if (data.balance < amount) return false;
  data.balance -= amount;
  saveTokenData(data);
  return true;
}

export function recordDailyEngagement(): void {
  const data = getTokenData();
  const today = new Date();
  const todayStr = today.toDateString();
  
  // Get day of week (0 = Sunday, we want 0 = Monday)
  let dayIndex = today.getDay() - 1;
  if (dayIndex < 0) dayIndex = 6; // Sunday becomes 6
  
  // Check if it's a new week (Monday reset)
  const lastDate = data.lastEngagementDate ? new Date(data.lastEngagementDate) : null;
  const isNewWeek = !lastDate || (
    today.getDay() === 1 && lastDate.getDay() !== 1 && 
    today.getTime() - lastDate.getTime() > 0
  );
  
  if (isNewWeek) {
    // Reset weekly streak
    data.weeklyStreak = [false, false, false, false, false, false, false];
  }
  
  // Mark today as engaged
  if (data.lastEngagementDate !== todayStr) {
    data.weeklyStreak[dayIndex] = true;
    data.lastEngagementDate = todayStr;
    // Daily bonus tokens
    data.balance += 5;
    saveTokenData(data);
  }
}

export function claimSocialFollow(platform: 'ig' | 'tiktok'): boolean {
  const data = getTokenData();
  
  if (platform === 'ig' && !data.followedIG) {
    data.followedIG = true;
    data.balance += 20;
    saveTokenData(data);
    return true;
  }
  
  if (platform === 'tiktok' && !data.followedTikTok) {
    data.followedTikTok = true;
    data.balance += 20;
    saveTokenData(data);
    return true;
  }
  
  return false;
}
