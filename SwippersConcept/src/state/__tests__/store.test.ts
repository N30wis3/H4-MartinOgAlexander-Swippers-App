import { makeProfile, makeSeed } from '@/domain/__tests__/fixtures';
import {
  EMPTY_STORE,
  addAccount,
  addReport,
  addSession,
  appendMessage,
  applySwipe,
  changePassword,
  emptyUserData,
  excludedProfileIds,
  findAccountByEmail,
  markMatchSeen,
  removeAccount,
  saveProfile,
  setSession,
  unseenMatchCount,
  updateUser,
} from '../store';

const account = { id: 'u1', email: 'Fighter@Example.com', salt: 's', passwordHash: 'h', createdAt: 'now' };

describe('accounts', () => {
  it('signs a new account in and creates empty user data', () => {
    const store = addAccount(EMPTY_STORE, account);
    expect(store.sessionUserId).toBe('u1');
    expect(store.users.u1.profile).toBeNull();
  });

  it('finds accounts by email regardless of case and whitespace', () => {
    const store = addAccount(EMPTY_STORE, account);
    expect(findAccountByEmail(store, '  fighter@example.com ')?.id).toBe('u1');
    expect(findAccountByEmail(store, 'nobody@example.com')).toBeUndefined();
  });

  it('logs out by clearing the session', () => {
    const store = setSession(addAccount(EMPTY_STORE, account), null);
    expect(store.sessionUserId).toBeNull();
  });

  it('replaces the password hash and salt', () => {
    const store = changePassword(addAccount(EMPTY_STORE, account), 'u1', 'salt2', 'hash2');
    expect(store.accounts[0]).toMatchObject({ salt: 'salt2', passwordHash: 'hash2' });
  });

  it('deleting an account removes the account, its data and the session', () => {
    const store = removeAccount(addAccount(EMPTY_STORE, account), 'u1');
    expect(store.accounts).toHaveLength(0);
    expect(store.users.u1).toBeUndefined();
    expect(store.sessionUserId).toBeNull();
  });

  it('ignores updates for unknown users', () => {
    expect(updateUser(EMPTY_STORE, 'ghost', (d) => d)).toBe(EMPTY_STORE);
  });
});

describe('applySwipe', () => {
  const liker = makeSeed({ id: 'p1', name: 'Likes You', likesYou: true });
  const cold = makeSeed({ id: 'p2', name: 'Not Interested', likesYou: false });

  it('creates a match only when both sides swiped right', () => {
    const { data, match } = applySwipe(emptyUserData(), liker, 'like');
    expect(match?.profileId).toBe('p1');
    expect(data.matches).toHaveLength(1);
    expect(data.messages[match!.id][0].from).toBe('system');
  });

  it('records a like without a match when the other side has not liked back', () => {
    const { data, match } = applySwipe(emptyUserData(), cold, 'like');
    expect(match).toBeNull();
    expect(data.matches).toHaveLength(0);
    expect(data.swipes.p2).toBe('like');
  });

  it('never matches after a pass', () => {
    const { data, match } = applySwipe(emptyUserData(), liker, 'pass');
    expect(match).toBeNull();
    expect(data.swipes.p1).toBe('pass');
  });

  it('ignores a second swipe on the same profile', () => {
    const first = applySwipe(emptyUserData(), liker, 'like').data;
    const second = applySwipe(first, liker, 'like');
    expect(second.match).toBeNull();
    expect(second.data).toBe(first);
    expect(second.data.matches).toHaveLength(1);
  });

  it('marks new matches as unseen until opened', () => {
    const { data, match } = applySwipe(emptyUserData(), liker, 'like');
    expect(unseenMatchCount(data)).toBe(1);
    expect(unseenMatchCount(markMatchSeen(data, match!.id))).toBe(0);
  });
});

describe('messages, sessions and reports', () => {
  const seed = makeSeed({ id: 'p1', likesYou: true });
  const withMatch = applySwipe(emptyUserData(), seed, 'like').data;
  const matchId = withMatch.matches[0].id;

  it('appends messages to an existing match only', () => {
    const msg = { id: 'm1', from: 'me' as const, text: 'Hi', at: 'now' };
    expect(appendMessage(withMatch, matchId, msg).messages[matchId]).toHaveLength(2);
    expect(appendMessage(withMatch, 'match_unknown', msg)).toBe(withMatch);
  });

  it('adds completed sparring sessions newest first', () => {
    const one = addSession(withMatch, { id: 's1', matchId, profileId: 'p1', sport: 'Boxing', at: 'a' });
    const two = addSession(one, { id: 's2', matchId, profileId: 'p1', sport: 'MMA', at: 'b' });
    expect(two.sessions.map((s) => s.id)).toEqual(['s2', 's1']);
  });

  it('hides a reported profile from the deck', () => {
    const reported = addReport(emptyUserData(), 'p9', 'Inappropriate photo');
    expect(excludedProfileIds(reported).has('p9')).toBe(true);
  });

  it('excludes every swiped profile from the deck', () => {
    expect(excludedProfileIds(withMatch).has('p1')).toBe(true);
  });

  it('stores the saved profile', () => {
    const profile = makeProfile({ id: 'u1' });
    expect(saveProfile(emptyUserData(), profile).profile).toEqual(profile);
  });
});
