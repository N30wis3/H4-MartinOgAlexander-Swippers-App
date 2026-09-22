import { pickReply } from '../chat';
import { buildLeaderboard, totalSparrings } from '../leaderboard';
import type { SparringSession } from '../types';
import { AARHUS, makeProfile, makeSeed } from './fixtures';

const me = makeProfile({ id: 'me', name: 'Me' });

function session(sport: SparringSession['sport'], n: number): SparringSession {
  return { id: `s${n}`, matchId: 'm', profileId: 'p', sport, at: '2026-01-01T00:00:00.000Z' };
}

describe('totalSparrings', () => {
  it('sums all sports, or only the selected one', () => {
    const counts = { Boxing: 5, MMA: 3 };
    expect(totalSparrings(counts, null)).toBe(8);
    expect(totalSparrings(counts, 'MMA')).toBe(3);
    expect(totalSparrings(counts, 'Judo')).toBe(0);
  });
});

describe('buildLeaderboard', () => {
  const profiles = [
    makeSeed({ id: 'a', name: 'Anna', sparrings: { Boxing: 10 } }),
    makeSeed({ id: 'b', name: 'Bo', sparrings: { MMA: 10 } }),
    makeSeed({ id: 'c', name: 'Cas', sparrings: { Boxing: 4, Judo: 2 } }),
    makeSeed({ id: 'd', name: 'Dan', sparrings: {} }),
    makeSeed({ id: 'far', name: 'Far', sparrings: { Boxing: 50 }, location: AARHUS }),
  ];

  it('sorts by sparring count and shares ranks between ties', () => {
    const rows = buildLeaderboard({
      profiles,
      me,
      mySessions: [session('Boxing', 1)],
      sport: null,
      nearKm: null,
    });
    expect(rows.map((r) => [r.name, r.count, r.rank])).toEqual([
      ['Far', 50, 1],
      ['Anna', 10, 2],
      ['Bo', 10, 2],
      ['Cas', 6, 4],
      ['Me', 1, 5],
    ]);
  });

  it('leaves out fighters without sparrings but always lists the user', () => {
    const rows = buildLeaderboard({ profiles, me, mySessions: [], sport: null, nearKm: null });
    expect(rows.some((r) => r.name === 'Dan')).toBe(false);
    const mine = rows.find((r) => r.isMe)!;
    expect(mine.count).toBe(0);
    expect(mine.rank).toBe(rows.length);
  });

  it('filters by martial art', () => {
    const rows = buildLeaderboard({
      profiles,
      me,
      mySessions: [session('MMA', 1), session('Boxing', 2)],
      sport: 'MMA',
      nearKm: null,
    });
    expect(rows.map((r) => r.name)).toEqual(['Bo', 'Me']);
    expect(rows[1].count).toBe(1);
  });

  it('filters to the local area', () => {
    const rows = buildLeaderboard({ profiles, me, mySessions: [], sport: null, nearKm: 50 });
    expect(rows.some((r) => r.name === 'Far')).toBe(false);
    expect(rows.some((r) => r.name === 'Anna')).toBe(true);
  });
});

describe('pickReply', () => {
  const partner = makeProfile({ id: 'p' });

  it('answers scheduling questions with a time suggestion', () => {
    const reply = pickReply('When are you free?', partner, () => 0);
    expect(reply).toMatch(/Thursday|18:00|Saturday/);
  });

  it('mentions the partner city when asked about a gym', () => {
    const reply = pickReply('Which gym works?', partner, () => 0);
    expect(reply).toContain('Copenhagen');
  });

  it('falls back to a generic reply', () => {
    expect(pickReply('hello', partner, () => 0.99)).toBeTruthy();
  });
});
