// Matching algorithm and filtering (FK.03).
//
// Candidates are first filtered by the user's own settings (distance, martial
// art, age range) and then ranked by a "fair match" score built from four
// parts that add up to 100:
//   proximity 35  ·  shared martial art 30  ·  weight class 25  ·  age group 10

import { AGE_GROUPS, MAX_AGE, MIN_ADULT_AGE, WEIGHT_CLASSES, classIndex, getClass } from './classes';
import { distanceKm } from './geo';
import type { Filters, Profile, SeedProfile, Sport } from './types';

export const DEFAULT_FILTERS: Filters = {
  maxDistanceKm: null,
  sports: [],
  minAge: MIN_ADULT_AGE,
  maxAge: MAX_AGE,
};

export const DISTANCE_OPTIONS: (number | null)[] = [10, 25, 50, 100, 250, null];

// Beyond this distance a candidate earns no proximity points.
const PROXIMITY_RANGE_KM = 150;

export interface RankedProfile {
  profile: SeedProfile;
  distanceKm: number;
  score: number;
}

export function sharedSports(a: Sport[], b: Sport[]): Sport[] {
  return a.filter((sport) => b.includes(sport));
}

export function passesFilters(candidate: Profile, distance: number, filters: Filters): boolean {
  if (filters.maxDistanceKm !== null && distance > filters.maxDistanceKm) return false;

  if (filters.sports.length > 0 && sharedSports(filters.sports, candidate.sports).length === 0) {
    return false;
  }

  // A class passes when its range overlaps the wanted age span. Unknown age
  // classes (other users' data is private) cannot be filtered on, so they pass.
  const age = getClass(AGE_GROUPS, candidate.ageGroupId);
  if (age && (age.max < filters.minAge || age.min > filters.maxAge)) return false;

  return true;
}

// 0–100. Higher means a more realistic, fairer sparring partner.
export function matchScore(me: Profile, candidate: Profile, distance: number): number {
  const proximity = 35 * Math.max(0, 1 - distance / PROXIMITY_RANGE_KM);

  const shared = sharedSports(me.sports, candidate.sports).length;
  const denominator = Math.max(1, Math.min(me.sports.length, candidate.sports.length));
  const sport = 30 * Math.min(1, shared / denominator);

  // When a class is unknown (the database only exposes your own size and age)
  // the part scores as a middling one-class gap instead of being penalised.
  const gap = (list: typeof WEIGHT_CLASSES, a: string, b: string) => {
    const ia = classIndex(list, a);
    const ib = classIndex(list, b);
    return ia < 0 || ib < 0 ? 1 : Math.abs(ia - ib);
  };

  const weightGap = gap(WEIGHT_CLASSES, me.weightClassId, candidate.weightClassId);
  const weight = weightGap === 0 ? 25 : weightGap === 1 ? 12 : weightGap === 2 ? 4 : 0;

  const ageGap = gap(AGE_GROUPS, me.ageGroupId, candidate.ageGroupId);
  const age = ageGap === 0 ? 10 : ageGap === 1 ? 5 : 0;

  return Math.round(proximity + sport + weight + age);
}

interface RecommendInput {
  me: Profile;
  candidates: SeedProfile[];
  // Profile ids the user has already swiped on or reported.
  excludedIds: ReadonlySet<string>;
  filters: Filters;
}

export function recommend({ me, candidates, excludedIds, filters }: RecommendInput): RankedProfile[] {
  const ranked: RankedProfile[] = [];

  for (const profile of candidates) {
    if (profile.id === me.id || excludedIds.has(profile.id)) continue;

    const distance = profile.distanceKm ?? distanceKm(me.location, profile.location);
    if (!passesFilters(profile, distance, filters)) continue;

    ranked.push({ profile, distanceKm: distance, score: matchScore(me, profile, distance) });
  }

  // Best score first; closer wins ties so the order is stable.
  return ranked.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
}

export function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.maxDistanceKm !== null) count += 1;
  if (filters.sports.length > 0) count += 1;
  if (filters.minAge !== DEFAULT_FILTERS.minAge || filters.maxAge !== DEFAULT_FILTERS.maxAge) count += 1;
  return count;
}
