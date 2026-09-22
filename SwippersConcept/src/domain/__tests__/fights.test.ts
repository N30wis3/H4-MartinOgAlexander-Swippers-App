import { describeFightStatus, describeResult, sortOldestFirst } from '../fights';

describe('describeFightStatus', () => {
  it('describes each status, using the judge name when known', () => {
    expect(describeFightStatus('pending_judge')).toMatch(/waiting for a judge/i);
    expect(describeFightStatus('scheduled', 'Alex')).toContain('Alex');
    expect(describeFightStatus('scheduled', null)).toMatch(/a judge has accepted/i);
    expect(describeFightStatus('completed')).toMatch(/completed/i);
  });
});

describe('describeResult', () => {
  it('maps each result to a short label', () => {
    expect(describeResult('win')).toBe('Won');
    expect(describeResult('loss')).toBe('Lost');
    expect(describeResult('draw')).toBe('Draw');
  });
});

describe('sortOldestFirst', () => {
  it('orders by requestedAt ascending without mutating the input', () => {
    const input = [{ requestedAt: '2026-01-03' }, { requestedAt: '2026-01-01' }, { requestedAt: '2026-01-02' }];
    const sorted = sortOldestFirst(input);
    expect(sorted.map((f) => f.requestedAt)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(input[0].requestedAt).toBe('2026-01-03'); // unchanged
  });
});
