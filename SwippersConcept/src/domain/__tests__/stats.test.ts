import { computeStats, weeklyActivity } from '../stats';
import type { SparringSession } from '../types';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function session(daysAgo: number): SparringSession {
  return {
    id: `s${daysAgo}`,
    matchId: 'm',
    profileId: 'p',
    sport: 'Boxing',
    at: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
  };
}

describe('computeStats', () => {
  it('counts swipes, likes, matches and sparrings', () => {
    const stats = computeStats(
      { a: 'like', b: 'like', c: 'pass', d: 'like' },
      [{ id: 'm1', profileId: 'a', createdAt: 'x', seen: true }],
      [session(1), session(2)],
    );
    expect(stats).toEqual({ swipes: 4, likes: 3, matches: 1, sparrings: 2, matchRate: 33 });
  });

  it('has no match rate before the first like', () => {
    expect(computeStats({ a: 'pass' }, [], []).matchRate).toBeNull();
    expect(computeStats({}, [], []).matchRate).toBeNull();
  });
});

describe('weeklyActivity', () => {
  it('buckets sessions into rolling weeks, oldest first', () => {
    const buckets = weeklyActivity([session(1), session(3), session(8), session(20), session(100)], NOW, 6);
    // 1 and 3 days ago -> this week, 8 days -> 1 week ago, 20 days -> 2 weeks ago,
    // 100 days -> outside the window.
    expect(buckets.map((b) => b.count)).toEqual([0, 0, 0, 1, 1, 2]);
    expect(buckets[5].label).toBe('Now');
    expect(buckets[0].label).toBe('5w');
  });

  it('ignores sessions in the future', () => {
    expect(weeklyActivity([session(-2)], NOW, 4).every((b) => b.count === 0)).toBe(true);
  });
});
