export interface TopicStats {
  attempts: number;
  correct: number;
  totalHints: number;
  totalTimeSec: number;
}

export interface LocalStats {
  questionsAttempted: number;
  questionsCorrect: number;
  sessionsCompleted: number;
  currentStreak: number;
  topicBreakdown: Record<string, TopicStats>;
  lastPracticeDate?: string;
  totalHintsUsed: number;
  totalTimeSec: number;
}

const DEFAULT_STATS: LocalStats = {
  questionsAttempted: 0,
  questionsCorrect: 0,
  sessionsCompleted: 0,
  currentStreak: 0,
  topicBreakdown: {},
  totalHintsUsed: 0,
  totalTimeSec: 0,
};

const STORAGE_KEY = 'orbitProgress';

export function getLocalStats(): LocalStats {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_STATS;
  try {
    return { ...DEFAULT_STATS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_STATS;
  }
}

export function updateLocalStats(update: Partial<LocalStats>): void {
  const current = getLocalStats();
  const updated = { ...current, ...update };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function recordAttempt(
  topicName: string, 
  isCorrect: boolean, 
  hintsUsed: number = 0, 
  timeSec: number = 0
): void {
  const stats = getLocalStats();
  const today = new Date().toDateString();
  
  // Update totals
  stats.questionsAttempted += 1;
  if (isCorrect) stats.questionsCorrect += 1;
  stats.totalHintsUsed += hintsUsed;
  stats.totalTimeSec += timeSec;
  
  // Update topic breakdown
  if (!stats.topicBreakdown[topicName]) {
    stats.topicBreakdown[topicName] = { attempts: 0, correct: 0, totalHints: 0, totalTimeSec: 0 };
  }
  stats.topicBreakdown[topicName].attempts += 1;
  if (isCorrect) stats.topicBreakdown[topicName].correct += 1;
  stats.topicBreakdown[topicName].totalHints += hintsUsed;
  stats.topicBreakdown[topicName].totalTimeSec += timeSec;
  
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
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function recordSessionComplete(): void {
  const stats = getLocalStats();
  stats.sessionsCompleted += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
