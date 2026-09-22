// Numbers for the profile overview (FK.05).

import type { Match, SparringSession, SwipeDirection } from './types';

export interface ProfileStats {
  swipes: number;
  likes: number;
  matches: number;
  sparrings: number;
  // Share of likes that turned into a match (0–100), or null before any like.
  matchRate: number | null;
}

export function computeStats(
  swipes: Record<string, SwipeDirection>,
  matches: Match[],
  sessions: SparringSession[],
): ProfileStats {
  const directions = Object.values(swipes);
  const likes = directions.filter((d) => d === 'like').length;
  return {
    swipes: directions.length,
    likes,
    matches: matches.length,
    sparrings: sessions.length,
    matchRate: likes === 0 ? null : Math.round((matches.length / likes) * 100),
  };
}

export interface WeekBucket {
  label: string;
  count: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Sparring sessions per week for the last `weeks` weeks, oldest first. Week
// buckets are rolling 7-day windows ending at `now`.
export function weeklyActivity(sessions: SparringSession[], now: Date, weeks = 6): WeekBucket[] {
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i;
    return { label: weeksAgo === 0 ? 'Now' : `${weeksAgo}w`, count: 0 };
  });

  for (const session of sessions) {
    const age = now.getTime() - new Date(session.at).getTime();
    if (age < 0) continue;
    const weeksAgo = Math.floor(age / WEEK_MS);
    if (weeksAgo < weeks) buckets[weeks - 1 - weeksAgo].count += 1;
  }

  return buckets;
}
