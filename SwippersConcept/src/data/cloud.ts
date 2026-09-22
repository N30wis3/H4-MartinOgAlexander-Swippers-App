// Everything that talks to the Swippers database. It only uses what already
// exists there (tables, row-level-security policies, the nearby_users and
// request_judge functions and the swipe trigger); it never changes the schema.
//
// What row-level security lets a logged-in user do, and what that means here:
//   users, users_kampsports, pictures  readable for everyone  -> fighter cards
//   user_config                        owner only             -> other people's
//                                      size, age and location are NOT readable
//   swipes                             own rows only          -> the trigger
//                                      creates the chatroom on a mutual like
//   chatroom_user                      own rows only          -> a match partner
//                                      is only known once they send a message
//                                      (or when our own swipe created the room)

import { decode } from 'base64-arraybuffer';

import { applyClassLists, bracketLabel, type ClassBracket } from '@/domain/classes';
import { nearestCity } from '@/domain/geo';
import { SPORTS, type FightResult, type FightStatus, type Profile, type Role, type SeedProfile, type Sport, type SwipeDirection } from '@/domain/types';

import { supabase } from './supabase';

function client() {
  if (!supabase) throw new Error('The database is not configured.');
  return supabase;
}

interface DbError {
  message: string;
  code?: string;
}

function fail(error: DbError | null, fallback: string): asserts error is null {
  if (error) throw new Error(error.message || fallback);
}

// ------------------------------------------------------------------ lookups

export interface CloudLookups {
  genders: { id: string; label: string }[];
  ticketTypes: Record<string, number>;
  swipeResults: Record<string, number>;
  profilePictureTypeId: number;
}

let sportIdByName = new Map<string, number>();
let sportNameById = new Map<number, string>();
let lookups: CloudLookups | null = null;

function toBrackets(rows: { id: number; min: number; max: number }[], unit: string): ClassBracket[] {
  return rows.map((r, i) => ({
    id: String(r.id),
    min: r.min,
    max: r.max,
    label: bracketLabel(r.min, r.max, unit, i === rows.length - 1),
  }));
}

// Loads the option lists stored in the database and swaps them in for the
// built-in defaults (height/weight/age classes and martial arts).
export async function loadLookups(): Promise<CloudLookups> {
  const c = client();
  const [gender, height, weight, age, sport, ticket, swipe, picture] = await Promise.all([
    c.from('gender_type').select('id, gender').order('id'),
    c.from('hoejde').select('id, min, max').order('min'),
    c.from('vaegt').select('id, min, max').order('min'),
    c.from('aldersgruppe').select('id, min, max').order('min'),
    c.from('kampsport').select('id, kampsport').order('id'),
    c.from('ticket_type').select('id, type'),
    c.from('swipe_result').select('id, result'),
    c.from('picture_types').select('id, type'),
  ]);
  for (const res of [gender, height, weight, age, sport, ticket, swipe, picture]) fail(res.error, 'Could not load options.');

  applyClassLists({
    height: toBrackets(height.data!, 'cm'),
    weight: toBrackets(weight.data!, 'kg'),
    age: toBrackets(age.data!, ''),
  });

  sportIdByName = new Map(sport.data!.map((r) => [r.kampsport as string, r.id as number]));
  sportNameById = new Map(sport.data!.map((r) => [r.id as number, r.kampsport as string]));
  SPORTS.splice(0, SPORTS.length, ...sport.data!.map((r) => r.kampsport as string));

  lookups = {
    genders: gender.data!.map((r) => ({ id: String(r.id), label: r.gender as string })),
    ticketTypes: Object.fromEntries(ticket.data!.map((r) => [r.type as string, r.id as number])),
    swipeResults: Object.fromEntries(swipe.data!.map((r) => [r.result as string, r.id as number])),
    profilePictureTypeId: picture.data!.find((r) => r.type === 'profile_picture')!.id as number,
  };
  return lookups;
}

function needLookups(): CloudLookups {
  if (!lookups) throw new Error('Options have not been loaded yet.');
  return lookups;
}

// -------------------------------------------------------------------- auth

export interface CloudUser {
  id: string;
  email: string;
}

export async function getSessionUser(): Promise<CloudUser | null> {
  const { data, error } = await client().auth.getSession();
  fail(error, 'Could not read the session.');
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? '' } : null;
}

export async function cloudSignIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    // Same wording for every failure so the form does not reveal which emails exist.
    throw new Error(/confirm/i.test(error.message) ? 'Confirm your email address first, then log in.' : 'Wrong email or password.');
  }
}

// Returns true when a session exists right away, false when the project
// requires the email to be confirmed first.
export async function cloudSignUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await client().auth.signUp({ email: email.trim(), password });
  fail(error, 'Could not create the account.');
  return data.session !== null;
}

export async function cloudSignOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  fail(error, 'Could not log out.');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(email.trim());
  fail(error, 'Could not send the reset email.');
}

export function onSignedOut(callback: () => void): () => void {
  const { data } = client().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') callback();
  });
  return () => data.subscription.unsubscribe();
}

// ------------------------------------------------------------------ profile

export interface MyProfile {
  profile: Profile;
  searchRadiusKm: number;
}

function pictureUrl(path: string): string {
  return client().storage.from('pictures').getPublicUrl(path).data.publicUrl;
}

function joinName(first: string | null, last: string | null): string {
  return `${first ?? ''} ${last ?? ''}`.trim();
}

// The logged-in user's own profile, or null while onboarding is unfinished
// (no users row, or user_config is not complete yet).
export async function fetchMyProfile(userId: string): Promise<MyProfile | null> {
  const c = client();
  const [user, config, sports, picture] = await Promise.all([
    c.from('users').select('fornavn, efternavn, description').eq('id', userId).maybeSingle(),
    c.from('user_config').select('*').eq('user_id', userId).maybeSingle(),
    c.from('users_kampsports').select('kampsport_id').eq('user_id', userId),
    c
      .from('pictures')
      .select('storage_path')
      .eq('user_id', userId)
      .eq('picture_type_id', needLookups().profilePictureTypeId)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);
  for (const res of [user, config, sports, picture]) fail(res.error, 'Could not load your profile.');

  if (!user.data || !config.data || !config.data.is_complete) return null;

  const point = { lat: config.data.latitude as number, lon: config.data.longitude as number };
  return {
    searchRadiusKm: config.data.search_radius as number,
    profile: {
      id: userId,
      name: joinName(user.data.fornavn, user.data.efternavn),
      bio: (user.data.description as string | null) ?? '',
      level: 'Intermediate', // not stored in the database
      sports: sports.data!.map((r) => sportNameById.get(r.kampsport_id as number)).filter((s): s is Sport => !!s),
      heightClassId: String(config.data.hoejde_id),
      weightClassId: String(config.data.vaegt_id),
      ageGroupId: String(config.data.aldersgruppe_id),
      location: { city: nearestCity(point).city, ...point },
      photoUri: picture.data?.[0] ? pictureUrl(picture.data[0].storage_path as string) : undefined,
      genderId: String(config.data.gender_id),
      seekingGenderId: String(config.data.seeking_gender_id),
    },
  };
}

function makeUsername(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'fighter';
  return `${base}_${Math.random().toString(36).slice(2, 6)}`;
}

async function uploadProfilePicture(userId: string, dataUri: string): Promise<string> {
  const c = client();
  const typeId = needLookups().profilePictureTypeId;
  const path = `${userId}/${Date.now()}.jpg`;

  const upload = await c.storage.from('pictures').upload(path, decode(dataUri.split(',')[1]), {
    contentType: 'image/jpeg',
    upsert: false,
  });
  fail(upload.error, 'Could not upload the photo.');

  const previous = await c.from('pictures').select('id, storage_path').eq('user_id', userId).eq('picture_type_id', typeId);
  const inserted = await c.from('pictures').insert({ user_id: userId, picture_type_id: typeId, storage_path: path });
  fail(inserted.error, 'Could not save the photo.');

  // Tidy up the replaced photo. Best effort: a failure here is harmless.
  if (previous.data?.length) {
    await c.from('pictures').delete().in('id', previous.data.map((p) => p.id));
    await c.storage.from('pictures').remove(previous.data.map((p) => p.storage_path as string));
  }
  return pictureUrl(path);
}

// Creates or updates the user's rows. Returns the profile with the final
// public photo URL, since a freshly picked photo is uploaded here.
export async function saveMyProfile(userId: string, profile: Profile, searchRadiusKm: number): Promise<Profile> {
  const c = client();
  const [first, ...rest] = profile.name.split(' ');
  const names = { fornavn: first, efternavn: rest.join(' '), description: profile.bio || null };

  const existing = await c.from('users').select('id').eq('id', userId).maybeSingle();
  fail(existing.error, 'Could not save your profile.');

  if (existing.data) {
    const updated = await c.from('users').update(names).eq('id', userId);
    fail(updated.error, 'Could not save your profile.');
  } else {
    // username is unique; retry with a new suffix on the rare collision.
    let lastError: DbError | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const inserted = await c.from('users').insert({ id: userId, username: makeUsername(profile.name), ...names });
      if (!inserted.error) {
        lastError = null;
        break;
      }
      lastError = inserted.error;
      if (inserted.error.code !== '23505') break;
    }
    fail(lastError, 'Could not create your profile.');
  }

  const config = await c.from('user_config').upsert({
    user_id: userId,
    gender_id: Number(profile.genderId),
    seeking_gender_id: Number(profile.seekingGenderId),
    hoejde_id: Number(profile.heightClassId),
    vaegt_id: Number(profile.weightClassId),
    aldersgruppe_id: Number(profile.ageGroupId),
    latitude: profile.location.lat,
    longitude: profile.location.lon,
    search_radius: searchRadiusKm,
    updated_at: new Date().toISOString(),
  });
  fail(config.error, 'Could not save your settings.');

  const cleared = await c.from('users_kampsports').delete().eq('user_id', userId);
  fail(cleared.error, 'Could not save your martial arts.');
  const rows = profile.sports.flatMap((s) => {
    const id = sportIdByName.get(s);
    return id ? [{ user_id: userId, kampsport_id: id }] : [];
  });
  if (rows.length > 0) {
    const added = await c.from('users_kampsports').insert(rows);
    fail(added.error, 'Could not save your martial arts.');
  }

  const photoUri = profile.photoUri?.startsWith('data:') ? await uploadProfilePicture(userId, profile.photoUri) : profile.photoUri;
  return { ...profile, photoUri };
}

export async function updateSearchRadius(userId: string, km: number): Promise<void> {
  const { error } = await client().from('user_config').update({ search_radius: km }).eq('user_id', userId);
  fail(error, 'Could not save the distance.');
}

// -------------------------------------------------------------------- roles

export async function fetchMyRoles(userId: string): Promise<Role[]> {
  const { data, error } = await client().from('user_roles').select('roles(role)').eq('user_id', userId);
  fail(error, 'Could not load your roles.');
  return (data ?? [])
    .map((r) => (r as unknown as { roles: { role: string } | null }).roles?.role)
    .filter((r): r is Role => r === 'fighter' || r === 'judge' || r === 'admin');
}

// Requires the register_as(role_name) database function — see
// database/register-role-function.sql. That file is not applied by the app;
// someone must run it once in the Supabase SQL editor first.
export async function chooseRoles(roles: ('fighter' | 'judge')[]): Promise<void> {
  for (const role of roles) {
    const { error } = await client().rpc('register_as', { role_name: role });
    if (error) {
      throw new Error(
        /function .* does not exist|schema cache|404/i.test(error.message)
          ? 'Judge/fighter sign-up is not enabled on this database yet (see database/register-role-function.sql).'
          : error.message,
      );
    }
  }
}

// A minimal identity for accounts that skip the fighter profile (judge-only):
// just enough to satisfy the foreign key that chatroom membership needs.
export async function fetchIdentity(userId: string): Promise<{ name: string; bio: string } | null> {
  const { data, error } = await client()
    .from('users')
    .select('fornavn, efternavn, description')
    .eq('id', userId)
    .maybeSingle();
  fail(error, 'Could not load your account.');
  return data ? { name: joinName(data.fornavn, data.efternavn), bio: data.description ?? '' } : null;
}

export async function saveIdentityOnly(userId: string, name: string, bio: string): Promise<void> {
  const c = client();
  const [first, ...rest] = name.split(' ');
  const fields = { fornavn: first, efternavn: rest.join(' '), description: bio || null };

  const existing = await c.from('users').select('id').eq('id', userId).maybeSingle();
  fail(existing.error, 'Could not save your account.');

  if (existing.data) {
    const updated = await c.from('users').update(fields).eq('id', userId);
    fail(updated.error, 'Could not save your account.');
    return;
  }

  let lastError: DbError | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const inserted = await c.from('users').insert({ id: userId, username: makeUsername(name), ...fields });
    if (!inserted.error) return;
    lastError = inserted.error;
    if (inserted.error.code !== '23505') break;
  }
  fail(lastError, 'Could not create your account.');
}

// ------------------------------------------------------------------ fighters

// Other users as swipe cards. Height/weight/age classes and location are not
// readable for other users, so those stay unknown (empty) on the card.
export async function fetchProfiles(ids: string[]): Promise<Map<string, SeedProfile>> {
  const result = new Map<string, SeedProfile>();
  if (ids.length === 0) return result;

  const c = client();
  const [users, sports, pictures] = await Promise.all([
    c.from('users').select('id, fornavn, efternavn, description').in('id', ids),
    c.from('users_kampsports').select('user_id, kampsport_id').in('user_id', ids),
    c
      .from('pictures')
      .select('user_id, storage_path, created_at')
      .in('user_id', ids)
      .eq('picture_type_id', needLookups().profilePictureTypeId)
      .order('created_at', { ascending: false }),
  ]);
  for (const res of [users, sports, pictures]) fail(res.error, 'Could not load fighters.');

  const photoByUser = new Map<string, string>();
  for (const p of pictures.data!) if (!photoByUser.has(p.user_id)) photoByUser.set(p.user_id, pictureUrl(p.storage_path));

  for (const u of users.data!) {
    result.set(u.id, {
      id: u.id,
      name: joinName(u.fornavn, u.efternavn) || 'Fighter',
      bio: u.description ?? '',
      level: null,
      sports: sports
        .data!.filter((s) => s.user_id === u.id)
        .map((s) => sportNameById.get(s.kampsport_id))
        .filter((s): s is Sport => !!s),
      heightClassId: '',
      weightClassId: '',
      ageGroupId: '',
      location: { city: '', lat: 0, lon: 0 },
      photoUri: photoByUser.get(u.id),
      likesYou: false,
      sparrings: {},
    });
  }
  return result;
}

// Fighters within the user's search radius who have not been swiped yet,
// nearest first (the database function does the filtering and ordering).
export async function fetchPool(userId: string): Promise<SeedProfile[]> {
  const { data, error } = await client().rpc('nearby_users', { requesting_user: userId });
  fail(error, 'Could not load fighters near you.');

  const rows = (data ?? []) as { user_id: string; distance_m: number }[];
  const profiles = await fetchProfiles(rows.map((r) => r.user_id));
  return rows.flatMap((r) => {
    const profile = profiles.get(r.user_id);
    return profile ? [{ ...profile, distanceKm: r.distance_m / 1000 }] : [];
  });
}

// -------------------------------------------------------------------- swipes

export async function fetchSwipes(userId: string): Promise<Record<string, SwipeDirection>> {
  const { data, error } = await client().from('swipes').select('swiped_user, swipe_result_id').eq('swiping_user', userId);
  fail(error, 'Could not load your swipes.');
  const like = needLookups().swipeResults.like;
  return Object.fromEntries((data ?? []).map((r) => [r.swiped_user as string, r.swipe_result_id === like ? 'like' : 'pass']));
}

// Inserting a like may make the database create a chatroom (trigger
// handle_mutual_swipe); use fetchRoomIds() afterwards to detect it.
export async function insertSwipe(userId: string, targetId: string, direction: SwipeDirection): Promise<void> {
  const { error } = await client()
    .from('swipes')
    .insert({ swiping_user: userId, swiped_user: targetId, swipe_result_id: needLookups().swipeResults[direction] });
  fail(error, 'Could not save your swipe.');
}

// ---------------------------------------------------------------------- chat

export interface CloudMessage {
  id: string;
  chatroom_id: string;
  sender_id: string;
  message: string;
  sent_at: string;
}

export async function fetchRoomIds(userId: string): Promise<string[]> {
  const { data, error } = await client().from('chatroom_user').select('chatroom_id').eq('user_id', userId);
  fail(error, 'Could not load your matches.');
  return (data ?? []).map((r) => r.chatroom_id as string);
}

export async function fetchMessages(roomIds: string[]): Promise<CloudMessage[]> {
  if (roomIds.length === 0) return [];
  const { data, error } = await client()
    .from('messages')
    .select('id, chatroom_id, sender_id, message, sent_at')
    .in('chatroom_id', roomIds)
    .order('sent_at', { ascending: true });
  fail(error, 'Could not load messages.');
  return (data ?? []) as CloudMessage[];
}

export async function insertMessage(roomId: string, senderId: string, text: string): Promise<CloudMessage> {
  const { data, error } = await client()
    .from('messages')
    .insert({ chatroom_id: roomId, sender_id: senderId, message: text })
    .select('id, chatroom_id, sender_id, message, sent_at')
    .single();
  fail(error, 'Could not send the message.');
  return data as CloudMessage;
}

// ------------------------------------------------------------------- reports

export async function insertReport(senderId: string, targetId: string, reason: string): Promise<void> {
  const { error } = await client().from('tickets').insert({
    type_id: needLookups().ticketTypes.user_report,
    sender_id: senderId,
    target_id: targetId,
    beskrivelse: reason,
  });
  fail(error, 'Could not send the report.');
}

// -------------------------------------------------------------- sparring data

export interface FightSummary {
  counts: Record<string, number>;
  mine: { id: string; at: string; opponentId: string; result: FightResult | null }[];
}

// Completed fights from `kampe` / `kamp_deltagere`: how many each user has, and
// the logged-in user's own list for the history.
export async function fetchCompletedFights(userId: string): Promise<FightSummary> {
  const c = client();
  const fights = await c.from('kampe').select('id, date, is_draw, vinder_id').eq('status', 'completed');
  fail(fights.error, 'Could not load fights.');
  const ids = (fights.data ?? []).map((f) => f.id as string);
  if (ids.length === 0) return { counts: {}, mine: [] };

  const people = await c.from('kamp_deltagere').select('kamp_id, user_id').in('kamp_id', ids);
  fail(people.error, 'Could not load fights.');

  const counts: Record<string, number> = {};
  for (const p of people.data ?? []) counts[p.user_id] = (counts[p.user_id] ?? 0) + 1;

  const mine = (fights.data ?? []).flatMap((f) => {
    const others = (people.data ?? []).filter((p) => p.kamp_id === f.id);
    if (!others.some((p) => p.user_id === userId)) return [];
    const opponent = others.find((p) => p.user_id !== userId);
    const result: FightResult | null = f.is_draw ? 'draw' : f.vinder_id ? (f.vinder_id === userId ? 'win' : 'loss') : null;
    return [{ id: f.id as string, at: f.date as string, opponentId: (opponent?.user_id as string) ?? '', result }];
  });
  return { counts, mine };
}

// -------------------------------------------------------------------- fights
//
// A "fight" is a real, judged match between two fighters — different from the
// local/demo "sparring session", which has no judge. The mechanics (creating
// a fight, a judge accepting one, recording a result) already exist as
// database functions and row-security policies; nothing here changes them.

export interface FightInfo {
  id: string;
  status: FightStatus;
  judgeId: string | null;
  fighterIds: string[];
  isDraw: boolean;
  winnerId: string | null;
  requestedAt: string;
}

// The fight tied to a match's chatroom, if one has been requested yet.
export async function fetchFightForRoom(chatroomId: string): Promise<FightInfo | null> {
  const c = client();
  const fight = await c
    .from('kampe')
    .select('id, status, judge_id, is_draw, vinder_id, date')
    .eq('chatroom_id', chatroomId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(fight.error, 'Could not load the fight.');
  if (!fight.data) return null;

  const people = await c.from('kamp_deltagere').select('user_id').eq('kamp_id', fight.data.id);
  fail(people.error, 'Could not load the fight.');

  return {
    id: fight.data.id as string,
    status: fight.data.status as FightStatus,
    judgeId: fight.data.judge_id as string | null,
    isDraw: !!fight.data.is_draw,
    winnerId: fight.data.vinder_id as string | null,
    requestedAt: fight.data.date as string,
    fighterIds: (people.data ?? []).map((p) => p.user_id as string),
  };
}

// The two fighters of any fight already linked to one of these chatrooms.
// Unlike chat membership, this is readable for every signed-in user, so it
// works even before anyone has sent a message in the room.
export async function fetchFightsForRooms(chatroomIds: string[]): Promise<{ chatroomId: string; fighterIds: string[] }[]> {
  if (chatroomIds.length === 0) return [];
  const c = client();
  const fights = await c.from('kampe').select('id, chatroom_id').in('chatroom_id', chatroomIds);
  fail(fights.error, 'Could not load fights.');
  const ids = (fights.data ?? []).map((f) => f.id as string);
  if (ids.length === 0) return [];

  const people = await c.from('kamp_deltagere').select('kamp_id, user_id').in('kamp_id', ids);
  fail(people.error, 'Could not load fights.');

  return (fights.data ?? []).map((f) => ({
    chatroomId: f.chatroom_id as string,
    fighterIds: (people.data ?? []).filter((p) => p.kamp_id === f.id).map((p) => p.user_id as string),
  }));
}

// Asks the database to open (or reuse) a fight request for this match. Uses
// the existing request_judge() function — no schema change needed.
export async function requestJudge(chatroomId: string): Promise<void> {
  const { error } = await client().rpc('request_judge', { target_chatroom_id: chatroomId });
  fail(error, 'Could not request a judge.');
}

export interface OpenFight {
  id: string;
  chatroomId: string;
  requestedAt: string;
  fighterIds: string[];
}

// Fights waiting for any judge to accept, oldest request first. Uses the
// existing read policies on kampe/kamp_deltagere, which are open to every
// signed-in user — not only judges.
export async function fetchOpenFights(): Promise<OpenFight[]> {
  const c = client();
  const fights = await c.from('kampe').select('id, chatroom_id, date').eq('status', 'pending_judge').order('date', { ascending: true });
  fail(fights.error, 'Could not load open fights.');
  const ids = (fights.data ?? []).map((f) => f.id as string);
  if (ids.length === 0) return [];

  const people = await c.from('kamp_deltagere').select('kamp_id, user_id').in('kamp_id', ids);
  fail(people.error, 'Could not load open fights.');

  return (fights.data ?? []).map((f) => ({
    id: f.id as string,
    chatroomId: f.chatroom_id as string,
    requestedAt: f.date as string,
    fighterIds: (people.data ?? []).filter((p) => p.kamp_id === f.id).map((p) => p.user_id as string),
  }));
}

// Uses the existing accept_judge_request() function, which also adds the
// judge to the match's chatroom so they can coordinate with both fighters.
export async function acceptFight(kampeId: string): Promise<void> {
  const { error } = await client().rpc('accept_judge_request', { target_kampe_id: kampeId });
  fail(error, 'Could not accept the fight.');
}

// Records the result. Allowed by the existing row-security policy, which lets
// only the fight's assigned judge (or an admin) write to it.
export async function completeFight(kampeId: string, outcome: { winnerId: string | null; isDraw: boolean }): Promise<void> {
  const { data, error } = await client()
    .from('kampe')
    .update({ status: 'completed', vinder_id: outcome.winnerId, is_draw: outcome.isDraw })
    .eq('id', kampeId)
    .select('id')
    .maybeSingle();
  fail(error, 'Could not record the result.');
  if (!data) throw new Error('You are not the judge assigned to this fight.');
}
