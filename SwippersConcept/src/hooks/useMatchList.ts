import { useMemo } from 'react';

import type { Match, Message, SeedProfile } from '@/domain/types';
import { useApp } from '@/state/AppContext';

export interface MatchEntry {
  match: Match;
  profile: SeedProfile;
  lastMessage: Message | undefined;
  // True until the user has sent a message themselves ("new match" strip).
  isNew: boolean;
}

// Matches joined with the partner profile and last message, newest activity
// first.
export function useMatchList(): MatchEntry[] {
  const { data, findProfile } = useApp();
  const matches = data?.matches;
  const messages = data?.messages;

  return useMemo(() => {
    const entries: MatchEntry[] = [];
    for (const match of matches ?? []) {
      const profile = findProfile(match.profileId);
      if (!profile) continue;
      const thread = messages?.[match.id] ?? [];
      entries.push({
        match,
        profile,
        lastMessage: thread[thread.length - 1],
        isNew: !thread.some((m) => m.from === 'me'),
      });
    }
    const activity = (e: MatchEntry) => e.lastMessage?.at ?? e.match.createdAt;
    return entries.sort((a, b) => activity(b).localeCompare(activity(a)));
  }, [matches, messages, findProfile]);
}
