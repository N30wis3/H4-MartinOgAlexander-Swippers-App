// Core domain types. Nothing in src/domain imports React or Expo, so this
// layer can be unit tested and reused by any client (or moved to the backend).

// Martial arts are plain names. The list below is the offline default; when the
// app is connected to the database, applyRemoteLookups() replaces its contents
// with the sports stored there (same array instance, so imports stay valid).
export type Sport = string;
export const SPORTS: Sport[] = [
  'Boxing',
  'MMA',
  'Wrestling',
  'Judo',
  'Kickboxing',
  'Muay Thai',
  'BJJ',
  'Karate',
];

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Competitor'] as const;
export type Level = (typeof LEVELS)[number];

// Account roles (database mode only). An account can hold more than one.
export type Role = 'fighter' | 'judge' | 'admin';

// A real, judged fight between two matched fighters (database mode only) —
// distinct from the local/demo "sparring session", which has no judge.
export type FightStatus = 'pending_judge' | 'scheduled' | 'completed';
export type FightResult = 'win' | 'loss' | 'draw';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Location extends Coordinates {
  city: string;
}

export interface Profile {
  id: string;
  name: string;
  bio: string;
  // Not stored in the database, so it is null for other fighters.
  level: Level | null;
  sports: Sport[];
  // Height, weight and age are collected as classes (approximate ranges), not
  // exact numbers. That keeps matches fair without storing sensitive detail.
  // An empty string means "unknown" (the database only lets you read your own).
  heightClassId: string;
  weightClassId: string;
  ageGroupId: string;
  location: Location;
  photoUri?: string;
  // Only used when connected to the database (user_config.is_complete needs them).
  genderId?: string;
  seekingGenderId?: string;
}

// A fighter the user can swipe on. `likesYou` simulates the other side's swipe
// (in production that comes from the swipes table), and `sparrings` feeds the
// leaderboard.
export interface SeedProfile extends Profile {
  likesYou: boolean;
  sparrings: Partial<Record<Sport, number>>;
  // Distance from the database (nearby_users). When set it is used instead of
  // computing it from `location`, which other users' rows do not expose.
  distanceKm?: number;
}

// Sparring counts from the database are not split by sport; they are stored
// under this key so "all martial arts" totals still work.
export const ANY_SPORT = 'All';

export type SwipeDirection = 'like' | 'pass';

export interface Match {
  id: string;
  profileId: string;
  createdAt: string;
  // Drives the "new match" badge on the Matches tab.
  seen: boolean;
}

export interface Message {
  id: string;
  from: 'me' | 'them' | 'system';
  text: string;
  at: string;
}

export interface SparringSession {
  id: string;
  matchId: string;
  profileId: string;
  sport: Sport;
  place?: string;
  at: string;
  // Set only for a judged database fight; absent for a local sparring session.
  result?: FightResult | null;
}

export interface Report {
  id: string;
  profileId: string;
  reason: string;
  at: string;
}

export interface Filters {
  // null means "any distance".
  maxDistanceKm: number | null;
  // Empty means "any martial art".
  sports: Sport[];
  minAge: number;
  maxAge: number;
}
