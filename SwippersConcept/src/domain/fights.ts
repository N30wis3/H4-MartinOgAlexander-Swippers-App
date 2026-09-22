// Small, pure helpers for the judge/fight feature (database mode). Anything
// that needs a network call lives in data/cloud.ts instead.

import type { FightResult, FightStatus } from './types';

// Text shown in a match's chat once a fight has been requested.
export function describeFightStatus(status: FightStatus, judgeName?: string | null): string {
  switch (status) {
    case 'pending_judge':
      return 'Fight requested — waiting for a judge to accept.';
    case 'scheduled':
      return judgeName
        ? `${judgeName} is your judge for this fight. Arrange the time and place here!`
        : 'A judge has accepted this fight. Arrange the time and place here!';
    case 'completed':
      return 'This fight has been completed.';
  }
}

export function describeResult(result: FightResult): string {
  if (result === 'win') return 'Won';
  if (result === 'loss') return 'Lost';
  return 'Draw';
}

// Oldest request first, so a fight never waits forever at the back of the queue.
export function sortOldestFirst<T extends { requestedAt: string }>(fights: T[]): T[] {
  return [...fights].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}
