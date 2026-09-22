// React wiring for the store. It has two modes:
//   local    no .env.local: fighters are the seed data, everything is kept on
//            the device and the other side of a chat is simulated.
//   database EXPO_PUBLIC_SUPABASE_* set: accounts, profile, fighters, swipes,
//            matches, chat and reports use the Swippers database (see
//            data/cloud.ts). Rows are read and written; the schema never changes.
// All rules live in store.ts and the domain folder; this file only connects
// them to React, the device and (in database mode) the network.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as cloud from '@/data/cloud';
import { DEMO_EMAIL, DEMO_PASSWORD, buildDemoUserData } from '@/data/demo';
import { createSalt, hashPassword } from '@/data/passwords';
import { SEED_PROFILES, findSeedProfile } from '@/data/seed';
import { loadStore, saveStore } from '@/data/storage';
import { CLOUD } from '@/data/supabase';
import { pickReply } from '@/domain/chat';
import { DEFAULT_FILTERS } from '@/domain/matching';
import {
  ANY_SPORT,
  type Filters,
  type Match,
  type Message,
  type Profile,
  type Role,
  type SeedProfile,
  type Sport,
  type SwipeDirection,
} from '@/domain/types';
import {
  draftToProfile,
  sanitizeText,
  validateEmail,
  validateFilters,
  validateName,
  validatePassword,
  type ProfileDraft,
} from '@/domain/validation';

import {
  EMPTY_STORE,
  addAccount,
  addReport,
  addSession,
  appendMessage,
  applySwipe,
  changePassword,
  createId,
  emptyUserData,
  findAccountByEmail,
  markMatchSeen,
  removeAccount,
  saveProfile,
  setFilters,
  setIdentity,
  setRoles,
  setSession,
  updateUser,
  type Account,
  type Store,
  type UserData,
} from './store';

// The concept has no email service in local mode, so "forgot password" uses a
// fixed code there.
export const DEMO_RESET_CODE = '123456';

const MAX_MESSAGE_LENGTH = 1000;
// user_config.search_radius is required; this means "no distance limit".
const ANY_DISTANCE_KM = 500;
const POLL_MS = 6000;

interface AppContextValue {
  ready: boolean;
  // True when connected to the database.
  cloud: boolean;
  // Set when the database could not be reached or read.
  cloudError: string | null;
  account: Account | null;
  data: UserData | null;
  profile: Profile | null;
  genders: { id: string; label: string }[];

  // Fighters that can be swiped, and everyone the app knows (for the leaderboard).
  pool: SeedProfile[];
  leaderboardPool: SeedProfile[];
  findProfile(id: string): SeedProfile | undefined;
  refreshPool(): Promise<void>;

  // Database mode only. A judge-only account (no fighter profile) has
  // `identity` instead of `profile`; `onboardingComplete` covers both cases
  // and is what the root layout uses to decide whether to show onboarding.
  roles: Role[];
  isFighter: boolean;
  isJudge: boolean;
  identity: { name: string; bio: string } | null;
  onboardingComplete: boolean;

  signUp(email: string, password: string): Promise<void>;
  logIn(email: string, password: string): Promise<void>;
  logOut(): void;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  deleteAccount(): void;
  startDemo(): Promise<void>;

  saveProfile(draft: ProfileDraft): Promise<void>;
  updateFilters(filters: Filters): void;
  chooseRoles(roles: ('fighter' | 'judge')[]): Promise<void>;
  saveIdentity(name: string, bio: string): Promise<void>;

  swipe(seed: SeedProfile, direction: SwipeDirection): Promise<Match | null>;
  markMatchSeen(matchId: string): void;
  sendMessage(matchId: string, text: string): Promise<void>;
  logSparring(matchId: string, sport: Sport, place?: string): void;
  reportProfile(profileId: string, reason: string): Promise<void>;

  // Fights (database mode only) — see domain/fights.ts and data/cloud.ts.
  requestJudgeForMatch(matchId: string): Promise<void>;
  getFightForMatch(matchId: string): Promise<cloud.FightInfo | null>;
  listOpenFights(): Promise<cloud.OpenFight[]>;
  acceptFight(kampeId: string): Promise<void>;
  completeFight(kampeId: string, outcome: { winnerId: string | null; isDraw: boolean }): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(EMPTY_STORE);
  const [ready, setReady] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [genders, setGenders] = useState<{ id: string; label: string }[]>([]);
  const [pool, setPool] = useState<SeedProfile[]>(CLOUD ? [] : SEED_PROFILES);
  const [cache, setCache] = useState<Map<string, SeedProfile>>(new Map());
  const [fightCounts, setFightCounts] = useState<Record<string, number>>({});

  // The ref is the source of truth so back-to-back actions (e.g. two quick
  // swipes) never read stale state; React state only drives re-rendering.
  const storeRef = useRef<Store>(EMPTY_STORE);
  const cacheRef = useRef<Map<string, SeedProfile>>(new Map());
  const poolRef = useRef<SeedProfile[]>(CLOUD ? [] : SEED_PROFILES);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const syncing = useRef(false);

  const commit = useCallback((next: Store) => {
    storeRef.current = next;
    setStore(next);
  }, []);

  const currentUserId = () => storeRef.current.sessionUserId;

  const withCurrentUser = useCallback(
    (update: (data: UserData) => UserData) => {
      const userId = storeRef.current.sessionUserId;
      if (userId) commit(updateUser(storeRef.current, userId, update));
    },
    [commit],
  );

  // ------------------------------------------------- database: read helpers

  const cacheProfiles = useCallback((profiles: Iterable<SeedProfile>) => {
    const next = new Map(cacheRef.current);
    for (const p of profiles) next.set(p.id, p);
    cacheRef.current = next;
    setCache(next);
  }, []);

  const knownProfile = (id: string) => cacheRef.current.get(id) ?? poolRef.current.find((p) => p.id === id);

  const loadPool = useCallback(
    async (userId: string) => {
      const list = await cloud.fetchPool(userId);
      poolRef.current = list;
      setPool(list);
      cacheProfiles(list);
    },
    [cacheProfiles],
  );

  // Brings matches and chat in line with the database. A chatroom is only
  // shown once its other member is known (see the note in data/cloud.ts).
  const syncRooms = useCallback(
    async (userId: string) => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        const roomIds = await cloud.fetchRoomIds(userId);
        const messages = await cloud.fetchMessages(roomIds);
        const before = storeRef.current.users[userId];
        if (!before) return;

        const byRoom = new Map<string, cloud.CloudMessage[]>();
        for (const m of messages) byRoom.set(m.chatroom_id, [...(byRoom.get(m.chatroom_id) ?? []), m]);

        const known = new Set(before.matches.map((m) => m.id));
        const candidates = roomIds.filter((id) => !known.has(id));

        // Message-based discovery: works as soon as anyone has written.
        const byMessage = new Map<string, string>();
        for (const roomId of candidates) {
          const partner = (byRoom.get(roomId) ?? []).find((m) => m.sender_id !== userId)?.sender_id;
          if (partner) byMessage.set(roomId, partner);
        }

        // Fallback for rooms with a fight request: the two fighters are
        // always readable (kampe/kamp_deltagere are open to any signed-in
        // user), so this resolves a room even before anyone has said a word.
        const stillUnknown = candidates.filter((id) => !byMessage.has(id));
        const byFight = new Map<string, string>();
        if (stillUnknown.length > 0) {
          const fights = await cloud.fetchFightsForRooms(stillUnknown);
          for (const fight of fights) {
            const other = fight.fighterIds.find((id) => id !== userId);
            if (other) byFight.set(fight.chatroomId, other);
          }
        }

        const added: Match[] = [];
        const unresolved: string[] = [];
        for (const roomId of candidates) {
          const partner = byMessage.get(roomId) ?? byFight.get(roomId);
          const thread = byRoom.get(roomId) ?? [];
          if (partner) added.push({ id: roomId, profileId: partner, createdAt: thread[0]?.sent_at ?? new Date().toISOString(), seen: false });
          else unresolved.push(roomId);
        }

        const missing = [...before.matches, ...added].map((m) => m.profileId).filter((id) => !knownProfile(id));
        if (missing.length > 0) cacheProfiles((await cloud.fetchProfiles(missing)).values());

        commit(
          updateUser(storeRef.current, userId, (d) => {
            const matches = [...added, ...d.matches.filter((m) => !added.some((a) => a.id === m.id))].sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            );
            const threads: Record<string, Message[]> = { ...d.messages };
            for (const roomId of roomIds) {
              if (!matches.some((m) => m.id === roomId)) continue;
              threads[roomId] = (byRoom.get(roomId) ?? []).map((m) => ({
                id: m.id,
                from: m.sender_id === userId ? 'me' : 'them',
                text: m.message,
                at: m.sent_at,
              }));
            }
            return { ...d, matches, messages: threads, unresolvedRooms: unresolved };
          }),
        );
      } finally {
        syncing.current = false;
      }
    },
    [cacheProfiles, commit],
  );

  const loadFights = useCallback(
    async (userId: string) => {
      const summary = await cloud.fetchCompletedFights(userId);
      setFightCounts(summary.counts);
      const missing = summary.mine.map((f) => f.opponentId).filter((id) => id && !knownProfile(id));
      if (missing.length > 0) cacheProfiles((await cloud.fetchProfiles(missing)).values());
      withCurrentUser((d) => ({
        ...d,
        sessions: summary.mine.map((f) => ({
          id: f.id,
          matchId: '',
          profileId: f.opponentId,
          sport: d.profile?.sports[0] ?? ANY_SPORT,
          at: f.at,
          result: f.result,
        })),
      }));
    },
    [cacheProfiles, withCurrentUser],
  );

  // Loads everything about the signed-in user from the database.
  const refreshCloud = useCallback(
    async (userId: string) => {
      try {
        const [mine, swipes, roles, identity] = await Promise.all([
          cloud.fetchMyProfile(userId),
          cloud.fetchSwipes(userId),
          cloud.fetchMyRoles(userId),
          cloud.fetchIdentity(userId),
        ]);
        commit(
          updateUser(storeRef.current, userId, (d) => ({
            ...d,
            swipes,
            roles,
            identity,
            profile: mine ? { ...mine.profile, level: d.profile?.level ?? mine.profile.level } : null,
            filters: mine
              ? { ...d.filters, maxDistanceKm: mine.searchRadiusKm >= ANY_DISTANCE_KM ? null : mine.searchRadiusKm }
              : d.filters,
          })),
        );
        // A judge-only account has no fighter profile, so it has nothing to
        // swipe, no pool to load and no completed-fight tally to show.
        if (mine) await Promise.all([syncRooms(userId), loadPool(userId), loadFights(userId)]);
        else if (roles.includes('judge')) await syncRooms(userId);
        setCloudError(null);
      } catch (err) {
        setCloudError(errorMessage(err, 'Could not reach the database.'));
      }
    },
    [commit, loadFights, loadPool, syncRooms],
  );

  const hydrateCloud = useCallback(
    async (user: cloud.CloudUser) => {
      const s = storeRef.current;
      const account: Account = { id: user.id, email: user.email, salt: 'database', passwordHash: '', createdAt: new Date().toISOString() };
      commit({
        accounts: [...s.accounts.filter((a) => a.id !== user.id), account],
        users: s.users[user.id] ? s.users : { ...s.users, [user.id]: emptyUserData() },
        sessionUserId: user.id,
      });
      await refreshCloud(user.id);
    },
    [commit, refreshCloud],
  );

  // ---------------------------------------------------------------- startup

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const saved = await loadStore();
      if (saved) commit(saved);

      if (CLOUD) {
        try {
          const lookups = await cloud.loadLookups();
          setGenders(lookups.genders);
          const user = await cloud.getSessionUser();
          if (user) await hydrateCloud(user);
          else commit(setSession(storeRef.current, null));
          unsubscribe = cloud.onSignedOut(() => commit(setSession(storeRef.current, null)));
        } catch (err) {
          setCloudError(errorMessage(err, 'Could not reach the database.'));
          commit(setSession(storeRef.current, null));
        }
      }
      setReady(true);
    })();
    return () => unsubscribe?.();
  }, [commit, hydrateCloud]);

  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  useEffect(() => {
    const timers = replyTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const account = useMemo(
    () => store.accounts.find((a) => a.id === store.sessionUserId) ?? null,
    [store.accounts, store.sessionUserId],
  );
  const data = account ? (store.users[account.id] ?? null) : null;
  const signedInId = account?.id ?? null;
  // A judge-only account has no fighter profile but still needs its
  // fight-request chatrooms kept in sync.
  const hasChats = !!data?.profile || !!data?.roles.includes('judge');

  // New messages and matches arrive by polling (no realtime setup needed).
  useEffect(() => {
    if (!CLOUD || !signedInId || !hasChats) return;
    const timer = setInterval(() => {
      syncRooms(signedInId).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [signedInId, hasChats, syncRooms]);

  // ------------------------------------------------------------------- auth

  const createLocalAccount = useCallback(
    async (email: string, password: string, buildData?: (userId: string) => UserData) => {
      const salt = await createSalt();
      const passwordHash = await hashPassword(password, salt);
      const id = createId('user');
      commit(
        addAccount(
          storeRef.current,
          { id, email: email.trim(), salt, passwordHash, createdAt: new Date().toISOString() },
          buildData?.(id),
        ),
      );
    },
    [commit],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const problem = validateEmail(email) ?? validatePassword(password);
      if (problem) throw new Error(problem);

      if (CLOUD) {
        const hasSession = await cloud.cloudSignUp(email, password);
        if (!hasSession) throw new Error('Account created. Confirm your email address, then log in.');
        const user = await cloud.getSessionUser();
        if (user) await hydrateCloud(user);
        return;
      }

      if (findAccountByEmail(storeRef.current, email)) {
        throw new Error('An account with this email already exists.');
      }
      await createLocalAccount(email, password);
    },
    [createLocalAccount, hydrateCloud],
  );

  const logIn = useCallback(
    async (email: string, password: string) => {
      if (CLOUD) {
        await cloud.cloudSignIn(email, password);
        const user = await cloud.getSessionUser();
        if (user) await hydrateCloud(user);
        return;
      }

      // One generic message for both "no such user" and "wrong password" so
      // the form cannot be used to discover which emails have accounts.
      const failure = new Error('Wrong email or password.');
      const found = findAccountByEmail(storeRef.current, email);
      if (!found) throw failure;
      const hash = await hashPassword(password, found.salt);
      if (hash !== found.passwordHash) throw failure;
      commit(setSession(storeRef.current, found.id));
    },
    [commit, hydrateCloud],
  );

  const logOut = useCallback(() => {
    commit(setSession(storeRef.current, null));
    if (CLOUD) cloud.cloudSignOut().catch(() => {});
  }, [commit]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const problem = validateEmail(email);
    if (problem) throw new Error(problem);
    if (CLOUD) await cloud.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      const problem = validatePassword(newPassword);
      if (problem) throw new Error(problem);
      const found = findAccountByEmail(storeRef.current, email);
      if (!found || code.trim() !== DEMO_RESET_CODE) throw new Error('That code is not valid.');
      const salt = await createSalt();
      commit(changePassword(storeRef.current, found.id, salt, await hashPassword(newPassword, salt)));
    },
    [commit],
  );

  const deleteAccount = useCallback(() => {
    // The database has no policy or function that lets a user delete their own
    // account; adding one would change the database, so it is not offered.
    if (CLOUD) {
      throw new Error('Account deletion is not available yet. It needs a server-side function in the database.');
    }
    const userId = currentUserId();
    if (userId) commit(removeAccount(storeRef.current, userId));
  }, [commit]);

  const startDemo = useCallback(async () => {
    if (CLOUD) throw new Error('The demo account is only available without a database.');
    const existing = findAccountByEmail(storeRef.current, DEMO_EMAIL);
    if (existing) {
      commit(setSession(storeRef.current, existing.id));
      return;
    }
    await createLocalAccount(DEMO_EMAIL, DEMO_PASSWORD, (id) => buildDemoUserData(id));
  }, [commit, createLocalAccount]);

  // ---------------------------------------------------------------- profile

  const saveProfileAction = useCallback(
    async (draft: ProfileDraft) => {
      const userId = currentUserId();
      if (!userId) return;
      // Throws for an invalid draft, so a broken profile is never saved.
      const profile = draftToProfile(userId, draft, { requireGender: CLOUD });

      if (!CLOUD) {
        commit(updateUser(storeRef.current, userId, (d) => saveProfile(d, profile)));
        return;
      }

      const filters = storeRef.current.users[userId]?.filters ?? DEFAULT_FILTERS;
      const saved = await cloud.saveMyProfile(userId, profile, filters.maxDistanceKm ?? ANY_DISTANCE_KM);
      commit(updateUser(storeRef.current, userId, (d) => saveProfile(d, saved)));
      // Fighters near the (possibly new) location, and any existing matches.
      Promise.all([loadPool(userId), syncRooms(userId)]).catch(() => {});
    },
    [commit, loadPool, syncRooms],
  );

  const updateFilters = useCallback(
    (filters: Filters) => {
      const problem = validateFilters(filters);
      if (problem) throw new Error(problem);
      withCurrentUser((d) => setFilters(d, filters));

      const userId = currentUserId();
      if (CLOUD && userId && storeRef.current.users[userId]?.profile) {
        // The distance limit lives in the database (user_config.search_radius).
        cloud
          .updateSearchRadius(userId, filters.maxDistanceKm ?? ANY_DISTANCE_KM)
          .then(() => loadPool(userId))
          .catch((err) => setCloudError(errorMessage(err, 'Could not save the distance.')));
      }
    },
    [loadPool, withCurrentUser],
  );

  const refreshPool = useCallback(async () => {
    const userId = currentUserId();
    if (CLOUD && userId) await loadPool(userId);
  }, [loadPool]);

  // ------------------------------------------------------------------- roles

  const chooseRolesAction = useCallback(
    async (roles: ('fighter' | 'judge')[]) => {
      const userId = currentUserId();
      if (!userId || roles.length === 0) return;
      await cloud.chooseRoles(roles);
      const updated = await cloud.fetchMyRoles(userId);
      commit(updateUser(storeRef.current, userId, (d) => setRoles(d, updated)));
    },
    [commit],
  );

  // For a judge-only account: creates just the `users` row a fighter profile
  // would otherwise provide, so chat membership (which needs it) works.
  const saveIdentityAction = useCallback(
    async (name: string, bio: string) => {
      const userId = currentUserId();
      if (!userId) return;
      const nameError = validateName(name);
      if (nameError) throw new Error(nameError);

      await cloud.saveIdentityOnly(userId, sanitizeText(name), sanitizeText(bio));
      const identity = await cloud.fetchIdentity(userId);
      commit(updateUser(storeRef.current, userId, (d) => setIdentity(d, identity)));
    },
    [commit],
  );

  // -------------------------------------------------------------- fights

  const requestJudgeForMatch = useCallback(async (matchId: string) => {
    await cloud.requestJudge(matchId);
  }, []);

  const getFightForMatch = useCallback(async (matchId: string) => cloud.fetchFightForRoom(matchId), []);

  const listOpenFights = useCallback(async () => cloud.fetchOpenFights(), []);

  const acceptFightAction = useCallback(
    async (kampeId: string) => {
      await cloud.acceptFight(kampeId);
      const userId = currentUserId();
      // Picks up the chatroom we were just added to.
      if (userId) await syncRooms(userId);
    },
    [syncRooms],
  );

  const completeFightAction = useCallback(
    async (kampeId: string, outcome: { winnerId: string | null; isDraw: boolean }) => {
      await cloud.completeFight(kampeId, outcome);
      const userId = currentUserId();
      if (userId) await loadFights(userId);
    },
    [loadFights],
  );

  // -------------------------------------------------------- swipe, chat, etc.

  const swipe = useCallback(
    async (seed: SeedProfile, direction: SwipeDirection): Promise<Match | null> => {
      const userId = currentUserId();
      const data = userId ? storeRef.current.users[userId] : null;
      if (!userId || !data) return null;

      if (!CLOUD) {
        const result = applySwipe(data, seed, direction);
        commit(updateUser(storeRef.current, userId, () => result.data));
        return result.match;
      }

      // The swipe shows up locally at once (the card leaves the deck) and is
      // rolled back if the database rejects it.
      const local = applySwipe(data, { ...seed, likesYou: false }, direction).data;
      commit(updateUser(storeRef.current, userId, () => local));
      try {
        await cloud.insertSwipe(userId, seed.id, direction);
      } catch (err) {
        withCurrentUser((d) => {
          const { [seed.id]: _undo, ...swipes } = d.swipes;
          return { ...d, swipes };
        });
        throw err;
      }
      if (direction !== 'like') return null;

      // A mutual like makes the database create a chatroom for both users.
      // A room we have not seen before must belong to this swipe.
      const rooms = await cloud.fetchRoomIds(userId);
      const current = storeRef.current.users[userId];
      const known = new Set([...current.matches.map((m) => m.id), ...current.unresolvedRooms]);
      const fresh = rooms.find((r) => !known.has(r));
      if (!fresh) return null;

      cacheProfiles([seed]);
      const match: Match = { id: fresh, profileId: seed.id, createdAt: new Date().toISOString(), seen: false };
      withCurrentUser((d) => ({ ...d, matches: [match, ...d.matches], messages: { ...d.messages, [fresh]: [] } }));
      return match;
    },
    [cacheProfiles, commit, withCurrentUser],
  );

  const markSeen = useCallback(
    (matchId: string) => withCurrentUser((d) => markMatchSeen(d, matchId)),
    [withCurrentUser],
  );

  const sendMessage = useCallback(
    async (matchId: string, text: string) => {
      const userId = currentUserId();
      const clean = sanitizeText(text).slice(0, MAX_MESSAGE_LENGTH);
      if (!userId || !clean) return;

      if (CLOUD) {
        const saved = await cloud.insertMessage(matchId, userId, clean);
        withCurrentUser((d) => {
          const thread = d.messages[matchId] ?? [];
          if (thread.some((m) => m.id === saved.id)) return d;
          return appendMessage(d, matchId, { id: saved.id, from: 'me', text: saved.message, at: saved.sent_at });
        });
        return;
      }

      const now = new Date().toISOString();
      withCurrentUser((d) => appendMessage(d, matchId, { id: createId('msg'), from: 'me', text: clean, at: now }));

      // Simulate the partner answering a moment later.
      const match = storeRef.current.users[userId]?.matches.find((m) => m.id === matchId);
      const partner = match ? findSeedProfile(match.profileId) : undefined;
      if (!partner) return;

      const timer = setTimeout(() => {
        // Skip if the user logged out or switched account in the meantime.
        if (storeRef.current.sessionUserId !== userId) return;
        const reply = pickReply(clean, partner);
        commit(
          updateUser(storeRef.current, userId, (d) =>
            appendMessage(d, matchId, {
              id: createId('msg'),
              from: 'them',
              text: reply,
              at: new Date().toISOString(),
            }),
          ),
        );
      }, 1200 + Math.random() * 1200);
      replyTimers.current.push(timer);
    },
    [commit, withCurrentUser],
  );

  const logSparring = useCallback(
    (matchId: string, sport: Sport, place?: string) => {
      const userId = currentUserId();
      const match = userId ? storeRef.current.users[userId]?.matches.find((m) => m.id === matchId) : undefined;
      if (!userId || !match) return;

      const at = new Date().toISOString();
      const cleanPlace = place ? sanitizeText(place).slice(0, 60) : '';
      withCurrentUser((d) =>
        appendMessage(
          addSession(d, {
            id: createId('ses'),
            matchId,
            profileId: match.profileId,
            sport,
            place: cleanPlace || undefined,
            at,
          }),
          matchId,
          {
            id: createId('msg'),
            from: 'system',
            text: `Sparring logged: ${sport}${cleanPlace ? ` at ${cleanPlace}` : ''}. Nice work! 💪`,
            at,
          },
        ),
      );
    },
    [withCurrentUser],
  );

  const reportProfile = useCallback(
    async (profileId: string, reason: string) => {
      const userId = currentUserId();
      if (CLOUD && userId) await cloud.insertReport(userId, profileId, reason);
      withCurrentUser((d) => addReport(d, profileId, reason));
    },
    [withCurrentUser],
  );

  // ------------------------------------------------------------------ value

  const directory = useMemo(() => {
    const map = new Map<string, SeedProfile>();
    for (const p of CLOUD ? [...cache.values(), ...pool] : SEED_PROFILES) map.set(p.id, p);
    return map;
  }, [cache, pool]);

  const findProfile = useCallback((id: string) => directory.get(id), [directory]);

  const leaderboardPool = useMemo(
    () =>
      CLOUD
        ? [...directory.values()].map((p) => ({ ...p, sparrings: { [ANY_SPORT]: fightCounts[p.id] ?? 0 } }))
        : SEED_PROFILES,
    [directory, fightCounts],
  );

  const roles = data?.roles ?? [];
  const isJudge = roles.includes('judge');
  // Accounts made before this feature have a complete profile but no role
  // rows; treat "has a fighter profile" as "is a fighter" too, for them.
  const isFighter = roles.includes('fighter') || !!data?.profile;
  const identity = data?.identity ?? null;
  // In local mode a profile is always required, exactly as before. In
  // database mode a judge-only account (no fighter profile) is also "done".
  const onboardingComplete = CLOUD ? !!data?.profile || (isJudge && identity !== null) : !!data?.profile;

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      cloud: CLOUD,
      cloudError,
      account,
      data,
      profile: data?.profile ?? null,
      genders,
      pool,
      leaderboardPool,
      findProfile,
      refreshPool,
      roles,
      isFighter,
      isJudge,
      identity,
      onboardingComplete,
      signUp,
      logIn,
      logOut,
      requestPasswordReset,
      resetPassword,
      deleteAccount,
      startDemo,
      saveProfile: saveProfileAction,
      updateFilters,
      chooseRoles: chooseRolesAction,
      saveIdentity: saveIdentityAction,
      swipe,
      markMatchSeen: markSeen,
      sendMessage,
      logSparring,
      reportProfile,
      requestJudgeForMatch,
      getFightForMatch,
      listOpenFights,
      acceptFight: acceptFightAction,
      completeFight: completeFightAction,
    }),
    [
      ready,
      cloudError,
      account,
      data,
      genders,
      pool,
      leaderboardPool,
      findProfile,
      refreshPool,
      roles,
      isFighter,
      isJudge,
      identity,
      onboardingComplete,
      signUp,
      logIn,
      logOut,
      requestPasswordReset,
      resetPassword,
      deleteAccount,
      startDemo,
      saveProfileAction,
      updateFilters,
      chooseRolesAction,
      saveIdentityAction,
      swipe,
      markSeen,
      sendMessage,
      logSparring,
      reportProfile,
      requestJudgeForMatch,
      getFightForMatch,
      listOpenFights,
      acceptFightAction,
      completeFightAction,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>.');
  return ctx;
}
