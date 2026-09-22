import type { Profile, SeedProfile } from '../types';

export const COPENHAGEN = { city: 'Copenhagen', lat: 55.6761, lon: 12.5683 };
export const AARHUS = { city: 'Aarhus', lat: 56.1629, lon: 10.2039 };

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'me',
    name: 'Test Fighter',
    bio: '',
    level: 'Intermediate',
    sports: ['Boxing'],
    heightClassId: 'h3',
    weightClassId: 'w3',
    ageGroupId: 'a2',
    location: COPENHAGEN,
    ...overrides,
  };
}

export function makeSeed(overrides: Partial<SeedProfile> = {}): SeedProfile {
  return {
    ...makeProfile({ id: 'other', name: 'Other Fighter' }),
    likesYou: false,
    sparrings: {},
    ...overrides,
  };
}
