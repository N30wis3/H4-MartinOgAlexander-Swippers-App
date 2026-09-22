// Pure state functions. Nothing here touches React, storage or the network, so
// the rules (mutual match, reports, account removal ...) are easy to unit test.
// The React provider in AppContext.tsx only wires these into the UI.

import { DEFAULT_FILTERS } from '@/domain/matching';
import type {
  Filters,
  Match,
  Message,
  Profile,
  Report,
  Role,
  SeedProfile,
  SparringSession,
  SwipeDirection,
} from '@/domain/types';

export interface Account {
  id: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

// Everything that belongs to one user. Deleting an account removes this whole
// object, which is how the concept honours "delete my personal data" (FK.07).
export interface UserData {
  profile: Profile | null;
  swipes: Record<string, SwipeDirection>;
  matches: Match[];
  messages: Record<string, Message[]>;
  sessions: SparringSession[];
  filters: Filters;
  reports: Report[];
  // Chatrooms from the database whose other member is not known yet (the
  // database only reveals the partner once they send a message).
  unresolvedRooms: string[];
  // Database mode only: which account roles this user has chosen.
  roles: Role[];
  // Database mode only: name/bio for a judge-only account that has no fighter
  // profile (profile stays null in that case).
  identity: { name: string; bio: string } | null;
}

export interface Store {
  accounts: Account[];
  sessionUserId: string | null;
  users: Record<string, UserData>;
}

export const EMPTY_STORE: Store = { accounts: [], sessionUserId: null, users: {} };

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyUserData(): UserData {
  return {
    profile: null,
    swipes: {},
    matches: [],
    messages: {},
    sessions: [],
    filters: DEFAULT_FILTERS,
    reports: [],
    unresolvedRooms: [],
    roles: [],
    identity: null,
  };
}

// ---------------------------------------------------------------- accounts

export function findAccountByEmail(store: Store, email: string): Account | undefined {
  const wanted = email.trim().toLowerCase();
  return store.accounts.find((a) => a.email.toLowerCase() === wanted);
}

export function addAccount(store: Store, account: Account, data: UserData = emptyUserData()): Store {
  return {
    accounts: [...store.accounts, account],
    sessionUserId: account.id,
    users: { ...store.users, [account.id]: data },
  };
}

export function setSession(store: Store, userId: string | null): Store {
  return { ...store, sessionUserId: userId };
}

export function changePassword(store: Store, userId: string, salt: string, passwordHash: string): Store {
  return {
    ...store,
    accounts: store.accounts.map((a) => (a.id === userId ? { ...a, salt, passwordHash } : a)),
  };
}

export function removeAccount(store: Store, userId: string): Store {
  const { [userId]: _removed, ...users } = store.users;
  return {
    accounts: store.accounts.filter((a) => a.id !== userId),
    sessionUserId: store.sessionUserId === userId ? null : store.sessionUserId,
    users,
  };
}

export function updateUser(store: Store, userId: string, update: (data: UserData) => UserData): Store {
  const current = store.users[userId];
  if (!current) return store;
  return { ...store, users: { ...store.users, [userId]: update(current) } };
}

// ---------------------------------------------------------------- user data

export function saveProfile(data: UserData, profile: Profile): UserData {
  return { ...data, profile };
}

export function setFilters(data: UserData, filters: Filters): UserData {
  return { ...data, filters };
}

export function setRoles(data: UserData, roles: Role[]): UserData {
  return { ...data, roles };
}

export function setIdentity(data: UserData, identity: UserData['identity']): UserData {
  return { ...data, identity };
}

// Profile ids that must not show up in the deck again.
export function excludedProfileIds(data: UserData): Set<string> {
  return new Set([...Object.keys(data.swipes), ...data.reports.map((r) => r.profileId)]);
}

export function matchIdFor(profileId: string): string {
  return `match_${profileId}`;
}

// Records a swipe. A match exists only when both sides swiped right (FK.02):
// the other side's swipe is simulated by `seed.likesYou`.
export function applySwipe(
  data: UserData,
  seed: SeedProfile,
  direction: SwipeDirection,
  now: Date = new Date(),
): { data: UserData; match: Match | null } {
  if (data.swipes[seed.id]) return { data, match: null }; // already swiped

  const next: UserData = { ...data, swipes: { ...data.swipes, [seed.id]: direction } };
  if (direction !== 'like' || !seed.likesYou) return { data: next, match: null };

  const match: Match = {
    id: matchIdFor(seed.id),
    profileId: seed.id,
    createdAt: now.toISOString(),
    seen: false,
  };
  const welcome: Message = {
    id: createId('msg'),
    from: 'system',
    text: `You and ${seed.name} both want to spar. Say hi and set a time!`,
    at: now.toISOString(),
  };

  return {
    data: {
      ...next,
      matches: [match, ...next.matches],
      messages: { ...next.messages, [match.id]: [welcome] },
    },
    match,
  };
}

export function markMatchSeen(data: UserData, matchId: string): UserData {
  if (!data.matches.some((m) => m.id === matchId && !m.seen)) return data;
  return { ...data, matches: data.matches.map((m) => (m.id === matchId ? { ...m, seen: true } : m)) };
}

export function appendMessage(data: UserData, matchId: string, message: Message): UserData {
  if (!data.matches.some((m) => m.id === matchId)) return data;
  return {
    ...data,
    messages: { ...data.messages, [matchId]: [...(data.messages[matchId] ?? []), message] },
  };
}

export function addSession(data: UserData, session: SparringSession): UserData {
  return { ...data, sessions: [session, ...data.sessions] };
}

export function addReport(data: UserData, profileId: string, reason: string, now: Date = new Date()): UserData {
  const report: Report = { id: createId('rep'), profileId, reason, at: now.toISOString() };
  return { ...data, reports: [report, ...data.reports] };
}

export function unseenMatchCount(data: UserData): number {
  return data.matches.filter((m) => !m.seen).length;
}
