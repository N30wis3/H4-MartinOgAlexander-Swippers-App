// Demo account data so the concept can be explored without going through
// sign-up and onboarding first.

import { DEFAULT_FILTERS } from '@/domain/matching';
import type { Message, Profile, SparringSession, Sport } from '@/domain/types';
import { CITIES } from '@/domain/geo';
import { applySwipe, createId, emptyUserData, matchIdFor, type UserData } from '@/state/store';

import { SEED_PROFILES } from './seed';

export const DEMO_EMAIL = 'demo@swippers.app';
export const DEMO_PASSWORD = 'Demo1234';

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildDemoProfile(id: string): Profile {
  return {
    id,
    name: 'Alex Demo',
    bio: 'Boxing and MMA for 4 years. Always up for technical rounds.',
    level: 'Intermediate',
    sports: ['Boxing', 'MMA'],
    heightClassId: 'h3',
    weightClassId: 'w3',
    ageGroupId: 'a2',
    location: CITIES[0], // Copenhagen
  };
}

export function buildDemoUserData(id: string, now: Date = new Date()): UserData {
  let data: UserData = { ...emptyUserData(), profile: buildDemoProfile(id), filters: DEFAULT_FILTERS };

  // Swipe right on the first few fighters who like the user back, and pass on
  // two others, so there is a match list and swipe history straight away.
  const likedBack = SEED_PROFILES.filter((p) => p.likesYou).slice(0, 4);
  const passed = SEED_PROFILES.filter((p) => !p.likesYou).slice(0, 2);

  likedBack.forEach((seed, i) => {
    const when = new Date(now.getTime() - (i + 1) * 6 * DAY_MS);
    data = applySwipe(data, seed, 'like', when).data;
    // The first two matches have already been seen; the rest show as new.
    if (i < 2) data = { ...data, matches: data.matches.map((m) => (m.profileId === seed.id ? { ...m, seen: true } : m)) };
  });
  passed.forEach((seed) => {
    data = applySwipe(data, seed, 'pass', now).data;
  });

  // A short conversation with the first match.
  const first = data.matches.find((m) => m.profileId === likedBack[0].id);
  if (first) {
    const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
    const chat: Message[] = [
      ...(data.messages[first.id] ?? []),
      { id: createId('msg'), from: 'me', text: 'Hey! Up for some light sparring this week?', at: at(120) },
      { id: createId('msg'), from: 'them', text: 'Definitely. Thursday evening works for me.', at: at(95) },
    ];
    data = { ...data, messages: { ...data.messages, [first.id]: chat } };
  }

  // Completed sparring sessions spread over the last weeks.
  const plan: { match: number; sport: Sport; daysAgo: number; place: string }[] = [
    { match: 0, sport: 'Boxing', daysAgo: 2, place: 'Iron Fist Gym' },
    { match: 1, sport: 'MMA', daysAgo: 6, place: 'Nørrebro Fight Club' },
    { match: 0, sport: 'Boxing', daysAgo: 9, place: 'Iron Fist Gym' },
    { match: 2, sport: 'Boxing', daysAgo: 16, place: 'Vesterbro Boxing' },
    { match: 1, sport: 'MMA', daysAgo: 23, place: 'Nørrebro Fight Club' },
    { match: 3, sport: 'Boxing', daysAgo: 30, place: 'Amager Gym' },
  ];
  const sessions: SparringSession[] = plan.flatMap(({ match, sport, daysAgo, place }) => {
    const seed = likedBack[match];
    if (!seed) return [];
    return [
      {
        id: createId('ses'),
        matchId: matchIdFor(seed.id),
        profileId: seed.id,
        sport,
        place,
        at: new Date(now.getTime() - daysAgo * DAY_MS).toISOString(),
      },
    ];
  });

  return { ...data, sessions };
}
