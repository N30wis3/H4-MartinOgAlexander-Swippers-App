// Input validation (NF.05.09). The same rules run in the UI for instant
// feedback and again in the state layer before anything is saved. A real
// backend must repeat them server-side; never trust the client alone.

import {
  AGE_GROUPS,
  HEIGHT_CLASSES,
  MAX_AGE,
  MIN_ADULT_AGE,
  WEIGHT_CLASSES,
  getClass,
} from './classes';
import { isValidCoordinates } from './geo';
import { LEVELS, SPORTS } from './types';
import type { Filters, Level, Location, Profile, Sport } from './types';

export const NAME_MAX = 40;
export const BIO_MAX = 280;
export const MAX_SPORTS = 4;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Strips control characters and angle brackets and collapses whitespace.
// React Native does not render HTML, but the same text is shown on the admin
// website, so we keep markup out of stored text (XSS defence in depth).
export function sanitizeText(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Use at least 8 characters.';
  if (value.length > 72) return 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Use both letters and numbers.';
  return null;
}

export function validateName(value: string): string | null {
  const name = sanitizeText(value);
  if (name.length < 2) return 'Enter your name (at least 2 characters).';
  if (name.length > NAME_MAX) return `Keep your name under ${NAME_MAX} characters.`;
  return null;
}

export function validateBio(value: string): string | null {
  if (sanitizeText(value).length > BIO_MAX) return `Keep your bio under ${BIO_MAX} characters.`;
  return null;
}

export interface ProfileDraft {
  name: string;
  bio: string;
  level: Level | null;
  sports: Sport[];
  heightClassId: string | null;
  weightClassId: string | null;
  ageGroupId: string | null;
  location: Location | null;
  photoUri: string | null;
  // Required only when connected to the database.
  genderId: string | null;
  seekingGenderId: string | null;
}

export interface DraftOptions {
  requireGender?: boolean;
}

export type DraftErrors = Partial<Record<keyof ProfileDraft, string>>;

export const EMPTY_DRAFT: ProfileDraft = {
  name: '',
  bio: '',
  level: null,
  sports: [],
  heightClassId: null,
  weightClassId: null,
  ageGroupId: null,
  location: null,
  photoUri: null,
  genderId: null,
  seekingGenderId: null,
};

export function validateProfileDraft(draft: ProfileDraft, options: DraftOptions = {}): DraftErrors {
  const errors: DraftErrors = {};

  const nameError = validateName(draft.name);
  if (nameError) errors.name = nameError;

  const bioError = validateBio(draft.bio);
  if (bioError) errors.bio = bioError;

  if (!draft.level || !LEVELS.includes(draft.level)) errors.level = 'Pick your experience level.';

  if (draft.sports.length === 0) errors.sports = 'Pick at least one martial art.';
  else if (draft.sports.length > MAX_SPORTS) errors.sports = `Pick at most ${MAX_SPORTS} martial arts.`;
  else if (draft.sports.some((s) => !SPORTS.includes(s))) errors.sports = 'Unknown martial art.';

  if (!draft.heightClassId || !getClass(HEIGHT_CLASSES, draft.heightClassId)) {
    errors.heightClassId = 'Pick your height class.';
  }
  if (!draft.weightClassId || !getClass(WEIGHT_CLASSES, draft.weightClassId)) {
    errors.weightClassId = 'Pick your weight class.';
  }
  if (!draft.ageGroupId || !getClass(AGE_GROUPS, draft.ageGroupId)) {
    errors.ageGroupId = 'Pick your age group.';
  }

  if (!draft.location || !draft.location.city || !isValidCoordinates(draft.location)) {
    errors.location = 'Choose where you train.';
  }

  if (options.requireGender) {
    if (!draft.genderId) errors.genderId = 'Pick one.';
    if (!draft.seekingGenderId) errors.seekingGenderId = 'Pick one.';
  }

  return errors;
}

export function isDraftValid(draft: ProfileDraft, options: DraftOptions = {}): boolean {
  return Object.keys(validateProfileDraft(draft, options)).length === 0;
}

export function profileToDraft(profile: Profile): ProfileDraft {
  return {
    name: profile.name,
    bio: profile.bio,
    level: profile.level,
    sports: profile.sports,
    heightClassId: profile.heightClassId,
    weightClassId: profile.weightClassId,
    ageGroupId: profile.ageGroupId,
    location: profile.location,
    photoUri: profile.photoUri ?? null,
    genderId: profile.genderId ?? null,
    seekingGenderId: profile.seekingGenderId ?? null,
  };
}

// Throws when the draft is invalid so callers can never save a broken profile.
export function draftToProfile(id: string, draft: ProfileDraft, options: DraftOptions = {}): Profile {
  const errors = validateProfileDraft(draft, options);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }

  return {
    id,
    name: sanitizeText(draft.name),
    bio: sanitizeText(draft.bio),
    level: draft.level!,
    sports: draft.sports,
    heightClassId: draft.heightClassId!,
    weightClassId: draft.weightClassId!,
    ageGroupId: draft.ageGroupId!,
    location: draft.location!,
    photoUri: draft.photoUri ?? undefined,
    genderId: draft.genderId ?? undefined,
    seekingGenderId: draft.seekingGenderId ?? undefined,
  };
}

export function validateFilters(filters: Filters): string | null {
  if (filters.minAge < MIN_ADULT_AGE || filters.maxAge > MAX_AGE) {
    return `Age must be between ${MIN_ADULT_AGE} and ${MAX_AGE}.`;
  }
  if (filters.minAge > filters.maxAge) return 'Minimum age cannot be above maximum age.';
  if (filters.maxDistanceKm !== null && filters.maxDistanceKm <= 0) return 'Distance must be positive.';
  return null;
}
