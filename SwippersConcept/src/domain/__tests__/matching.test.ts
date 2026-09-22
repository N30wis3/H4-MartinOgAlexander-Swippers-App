import { distanceKm } from '../geo';
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  matchScore,
  passesFilters,
  recommend,
  sharedSports,
} from '../matching';
import { AARHUS, COPENHAGEN, makeProfile, makeSeed } from './fixtures';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(COPENHAGEN, COPENHAGEN)).toBeCloseTo(0, 5);
  });

  it('matches the known Copenhagen–Aarhus distance (~156 km)', () => {
    expect(distanceKm(COPENHAGEN, AARHUS)).toBeGreaterThan(150);
    expect(distanceKm(COPENHAGEN, AARHUS)).toBeLessThan(162);
  });
});

describe('sharedSports', () => {
  it('returns only the overlap', () => {
    expect(sharedSports(['Boxing', 'MMA'], ['MMA', 'Judo'])).toEqual(['MMA']);
  });
});

describe('passesFilters', () => {
  const candidate = makeSeed({ sports: ['Judo'], ageGroupId: 'a3' }); // 30–34

  it('accepts everything with the default filters', () => {
    expect(passesFilters(candidate, 500, DEFAULT_FILTERS)).toBe(true);
  });

  it('rejects candidates beyond the max distance', () => {
    expect(passesFilters(candidate, 60, { ...DEFAULT_FILTERS, maxDistanceKm: 50 })).toBe(false);
    expect(passesFilters(candidate, 50, { ...DEFAULT_FILTERS, maxDistanceKm: 50 })).toBe(true);
  });

  it('requires a martial art from the wanted list when one is set', () => {
    expect(passesFilters(candidate, 5, { ...DEFAULT_FILTERS, sports: ['Boxing'] })).toBe(false);
    expect(passesFilters(candidate, 5, { ...DEFAULT_FILTERS, sports: ['Boxing', 'Judo'] })).toBe(true);
  });

  it('keeps an age group when its range overlaps the wanted span', () => {
    expect(passesFilters(candidate, 5, { ...DEFAULT_FILTERS, minAge: 33, maxAge: 40 })).toBe(true);
    expect(passesFilters(candidate, 5, { ...DEFAULT_FILTERS, minAge: 35, maxAge: 40 })).toBe(false);
    expect(passesFilters(candidate, 5, { ...DEFAULT_FILTERS, minAge: 18, maxAge: 29 })).toBe(false);
  });
});

describe('matchScore', () => {
  const me = makeProfile({ sports: ['Boxing', 'MMA'] });

  it('gives a perfect twin close to 100', () => {
    const twin = makeProfile({ id: 'twin', sports: ['Boxing', 'MMA'] });
    expect(matchScore(me, twin, 0)).toBe(100);
  });

  it('rewards a closer fighter over a farther one', () => {
    const other = makeProfile({ id: 'o' });
    expect(matchScore(me, other, 5)).toBeGreaterThan(matchScore(me, other, 90));
  });

  it('rewards a closer weight class', () => {
    const same = makeProfile({ id: 'a', weightClassId: 'w3' });
    const adjacent = makeProfile({ id: 'b', weightClassId: 'w4' });
    const far = makeProfile({ id: 'c', weightClassId: 'w6' });
    expect(matchScore(me, same, 10)).toBeGreaterThan(matchScore(me, adjacent, 10));
    expect(matchScore(me, adjacent, 10)).toBeGreaterThan(matchScore(me, far, 10));
  });

  it('gives no sport points without a shared martial art', () => {
    const judoka = makeProfile({ id: 'j', sports: ['Judo'] });
    const boxer = makeProfile({ id: 'b', sports: ['Boxing'] });
    expect(matchScore(me, boxer, 10) - matchScore(me, judoka, 10)).toBe(30);
  });

  it('never goes below zero for far away, mismatched fighters', () => {
    const opposite = makeProfile({
      id: 'x',
      sports: ['Judo'],
      weightClassId: 'w6',
      ageGroupId: 'a5',
    });
    expect(matchScore(me, opposite, 900)).toBeGreaterThanOrEqual(0);
  });
});

describe('recommend', () => {
  const me = makeProfile();

  it('skips yourself and excluded profiles', () => {
    const list = recommend({
      me,
      candidates: [makeSeed({ id: 'me' }), makeSeed({ id: 'swiped' }), makeSeed({ id: 'fresh' })],
      excludedIds: new Set(['swiped']),
      filters: DEFAULT_FILTERS,
    });
    expect(list.map((r) => r.profile.id)).toEqual(['fresh']);
  });

  it('ranks the best fair match first', () => {
    const list = recommend({
      me,
      candidates: [
        makeSeed({ id: 'heavy', weightClassId: 'w6', sports: ['Judo'] }),
        makeSeed({ id: 'ideal' }),
      ],
      excludedIds: new Set(),
      filters: DEFAULT_FILTERS,
    });
    expect(list[0].profile.id).toBe('ideal');
  });

  it('applies the distance filter', () => {
    const list = recommend({
      me,
      candidates: [makeSeed({ id: 'near' }), makeSeed({ id: 'far', location: AARHUS })],
      excludedIds: new Set(),
      filters: { ...DEFAULT_FILTERS, maxDistanceKm: 50 },
    });
    expect(list.map((r) => r.profile.id)).toEqual(['near']);
  });
});

describe('countActiveFilters', () => {
  it('is zero for defaults and counts each changed group once', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ maxDistanceKm: 25, sports: ['MMA'], minAge: 25, maxAge: 40 }),
    ).toBe(3);
  });
});
