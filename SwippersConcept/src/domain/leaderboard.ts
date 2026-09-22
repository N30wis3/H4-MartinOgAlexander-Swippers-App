// Leaderboard (FK.06): ranks fighters by completed sparring sessions, with
// optional filters for martial art and local area.

import { distanceKm } from './geo';
import type { Profile, SeedProfile, SparringSession, Sport } from './types';

export interface LeaderboardRow {
  id: string;
  name: string;
  city: string;
  sports: Sport[];
  count: number;
  rank: number;
  isMe: boolean;
  photoUri?: string;
}

export function totalSparrings(counts: Partial<Record<Sport, number>>, sport: Sport | null): number {
  if (sport) return counts[sport] ?? 0;
  return Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);
}

interface BuildInput {
  profiles: SeedProfile[];
  me: Profile;
  mySessions: SparringSession[];
  sport: Sport | null;
  // Only include fighters within this many km of the user; null = everywhere.
  nearKm: number | null;
}

export function buildLeaderboard({ profiles, me, mySessions, sport, nearKm }: BuildInput): LeaderboardRow[] {
  const rows: Omit<LeaderboardRow, 'rank'>[] = [];

  for (const p of profiles) {
    if (nearKm !== null) {
      // Fighters whose location is unknown (other users' data is private) can
      // only be placed when the database gave us a distance.
      const known = p.distanceKm ?? (p.location.city ? distanceKm(me.location, p.location) : undefined);
      if (known === undefined || known > nearKm) continue;
    }
    const count = totalSparrings(p.sparrings, sport);
    if (count === 0) continue;
    rows.push({
      id: p.id,
      name: p.name,
      city: p.location.city,
      sports: p.sports,
      count,
      isMe: false,
      photoUri: p.photoUri,
    });
  }

  // The user is always listed, even with 0 sparrings, so they can see where
  // they stand.
  rows.push({
    id: me.id,
    name: me.name,
    city: me.location.city,
    sports: me.sports,
    count: mySessions.filter((s) => !sport || s.sport === sport).length,
    isMe: true,
    photoUri: me.photoUri,
  });

  rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Competition ranking: equal counts share a rank (1, 2, 2, 4).
  return rows.map((row) => ({
    ...row,
    rank: rows.findIndex((r) => r.count === row.count) + 1,
  }));
}
