import {
  BIO_MAX,
  EMPTY_DRAFT,
  draftToProfile,
  isDraftValid,
  sanitizeText,
  validateBio,
  validateEmail,
  validateFilters,
  validateName,
  validatePassword,
  validateProfileDraft,
} from '../validation';
import type { ProfileDraft } from '../validation';
import { COPENHAGEN } from './fixtures';

const validDraft: ProfileDraft = {
  name: 'Mikkel Jensen',
  bio: 'Boxing for 3 years.',
  level: 'Advanced',
  sports: ['Boxing', 'MMA'],
  heightClassId: 'h3',
  weightClassId: 'w3',
  ageGroupId: 'a2',
  location: COPENHAGEN,
  photoUri: null,
  genderId: null,
  seekingGenderId: null,
};

describe('validateEmail', () => {
  it.each(['a@b.dk', 'first.last+tag@sub.example.com'])('accepts %s', (email) => {
    expect(validateEmail(email)).toBeNull();
  });

  it.each(['', 'plain', 'a@b', '@b.dk', 'a b@c.dk'])('rejects "%s"', (email) => {
    expect(validateEmail(email)).not.toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires 8+ characters with letters and numbers', () => {
    expect(validatePassword('short1')).not.toBeNull();
    expect(validatePassword('onlyletters')).not.toBeNull();
    expect(validatePassword('12345678')).not.toBeNull();
    expect(validatePassword('Strong123')).toBeNull();
  });
});

describe('validateName / validateBio', () => {
  it('rejects too short and too long names', () => {
    expect(validateName('A')).not.toBeNull();
    expect(validateName('x'.repeat(41))).not.toBeNull();
    expect(validateName('Sofie')).toBeNull();
  });

  it('limits the bio length', () => {
    expect(validateBio('x'.repeat(BIO_MAX))).toBeNull();
    expect(validateBio('x'.repeat(BIO_MAX + 1))).not.toBeNull();
  });
});

describe('sanitizeText', () => {
  it('removes markup characters and collapses whitespace', () => {
    expect(sanitizeText('  <b>Hi</b>\n\n  there ')).toBe('b Hi /b there');
  });
});

describe('validateProfileDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateProfileDraft(validDraft)).toEqual({});
    expect(isDraftValid(validDraft)).toBe(true);
  });

  it('flags every missing required field on an empty draft', () => {
    const errors = validateProfileDraft(EMPTY_DRAFT);
    expect(Object.keys(errors).sort()).toEqual(
      ['ageGroupId', 'heightClassId', 'level', 'location', 'name', 'sports', 'weightClassId'].sort(),
    );
  });

  it('rejects unrealistic or unknown class ids', () => {
    const errors = validateProfileDraft({ ...validDraft, weightClassId: 'w99', ageGroupId: 'a0' });
    expect(errors.weightClassId).toBeDefined();
    expect(errors.ageGroupId).toBeDefined();
  });

  it('limits the number of martial arts', () => {
    const errors = validateProfileDraft({
      ...validDraft,
      sports: ['Boxing', 'MMA', 'Judo', 'BJJ', 'Karate'],
    });
    expect(errors.sports).toBeDefined();
  });

  it('rejects out-of-range coordinates', () => {
    const errors = validateProfileDraft({
      ...validDraft,
      location: { city: 'Nowhere', lat: 123, lon: 0 },
    });
    expect(errors.location).toBeDefined();
  });
});

describe('gender fields (database mode)', () => {
  it('are only required when asked for', () => {
    expect(validateProfileDraft(validDraft)).toEqual({});
    const errors = validateProfileDraft(validDraft, { requireGender: true });
    expect(Object.keys(errors).sort()).toEqual(['genderId', 'seekingGenderId']);
    expect(validateProfileDraft({ ...validDraft, genderId: '1', seekingGenderId: '2' }, { requireGender: true })).toEqual({});
  });
});

describe('draftToProfile', () => {
  it('builds a sanitized profile', () => {
    const profile = draftToProfile('u1', { ...validDraft, name: '  Mikkel   <Jensen> ' });
    expect(profile.id).toBe('u1');
    expect(profile.name).toBe('Mikkel Jensen');
    expect(profile.photoUri).toBeUndefined();
  });

  it('throws instead of saving an invalid draft', () => {
    expect(() => draftToProfile('u1', EMPTY_DRAFT)).toThrow();
  });
});

describe('validateFilters', () => {
  const ok = { maxDistanceKm: 50, sports: [], minAge: 20, maxAge: 40 };

  it('accepts sane filters', () => {
    expect(validateFilters(ok)).toBeNull();
  });

  it('rejects minors, inverted ranges and non-positive distance', () => {
    expect(validateFilters({ ...ok, minAge: 16 })).not.toBeNull();
    expect(validateFilters({ ...ok, minAge: 50, maxAge: 30 })).not.toBeNull();
    expect(validateFilters({ ...ok, maxDistanceKm: 0 })).not.toBeNull();
  });
});
