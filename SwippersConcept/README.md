# Swippers Concept

A self-contained **React Native + Expo (SDK 57)** concept of the Swippers mobile app: find fair
sparring partners for combat sports by swiping. It lives next to the main `Swippers/` app and
does not touch it.

The concept has two modes:

- **Local (default):** no setup. Fighters, matches and chat replies are simulated and everything is
  stored on the device.
- **Database:** copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key.
  The app then uses the real Swippers database (accounts, profile, nearby fighters, swipes, matches,
  chat, reports, judged fights). It only reads and writes rows; it never changes the schema, tables
  or policies.
  **One-time setup:** run `database/register-role-function.sql` yourself in the Supabase SQL editor
  first — it lets a new account save its own choice of fighter/judge, which row-level security
  otherwise blocks. Nothing in the app runs this for you.

The admin website is not part of this app.

## Run it

```bash
cd SwippersConcept
npm install
npx expo start          # press i (iOS), a (Android) or w (web)
```

- **Web preview:** `npx expo start --web` (fastest way to look around).
- **Tests:** `npm test` · **Type check:** `npm run typecheck`
- Tap **Try the demo account** on the welcome screen to skip onboarding and get sample
  matches, chat history and sparring sessions.
- "Forgot password" has no email service; the demo reset code is `123456`.

## Database mode: what works and what does not

Works: sign-up and login, onboarding (writes `users`, `user_config`, `users_kampsports`, `pictures`),
fighters from the `nearby_users` function, swipes (the database trigger creates the chatroom on a
mutual like), chat (`messages`, refreshed every 6 seconds), reports (`tickets`), and the option lists
(martial arts, height/weight/age classes, genders) read from the database.

### Roles and judged fights

At sign-up you choose to be a **Fighter**, a **Judge**, or both (you can add the other role later
from Settings). This is a real fight system, separate from the local/demo "log a sparring" feature:

- From a match's chat, either fighter can **request a judge** (`request_judge()`). The fight then
  waits in every judge's **Judge dashboard** (`app/judge.tsx`), oldest request first.
- A judge **accepts** a fight (`accept_judge_request()`), which also adds them to that chat so all
  three can arrange time and place together.
- Once scheduled, the assigned judge records **who won, or a draw**, directly in the chat — allowed
  because the existing row-security policy lets a fight's own judge (and only them) update it.
- Completed fights feed the Profile tab's history (with the result) and the leaderboard, exactly like
  the local "sparring" feature did before.
- A judge-only account (no fighter profile) gets a lighter onboarding — just a name — and its own
  simplified Discover/Profile screens instead of the swipe deck.

This needed one small database addition: **`database/register-role-function.sql`**, because the
`user_roles` table can otherwise only be written to by an admin. Run it yourself before trying role
selection; the app shows a clear error if you sign up as a judge before running it.

Limits caused by the existing row-level security (changing it would change the database):

- Other users' height, weight, age class and location are not readable, so those pills are hidden on
  their cards and the fair-match score uses only distance and shared martial arts.
- A match made by the *other* person swiping later only appears once they send a message, **unless**
  a fight has been requested for it — a fight's two fighters are always readable, which resolves the
  match immediately in that case.
- There is no policy or function for deleting your own account, so "Delete account" is unavailable.
- The concept's "log a sparring" (no judge, casual) is local-only; database mode always goes through
  the judge/fight flow above instead.
- Experience level is not stored in the database, so it stays on the device.
- Anyone signed in — not only judges — can technically read the open-fights list, since the
  underlying `kampe`/`kamp_deltagere` read policies are open to every authenticated user, not judges
  specifically. The app only builds a UI for judges; this is a property of the existing policies, not
  something this app adds.
- Upgrading a judge-only account to also be a fighter later isn't built (the reverse — a fighter
  adding the judge role — works, from Settings).

## What is in the app

| Requirement | Where |
|---|---|
| FK.01 Sign up + profile (class-based height/weight/age, sport, location, photo, bio) | `app/(auth)/signup.tsx`, `app/onboarding.tsx`, `components/ProfileFormSections.tsx` |
| FK.02 Swipe (drag or buttons), card with photo, name, age, height, weight, sport, distance, mutual-match overlay | `components/SwipeDeck.tsx`, `ProfileCard.tsx`, `MatchOverlay.tsx`, `app/(tabs)/index.tsx` |
| FK.03 Matching algorithm + filters (distance, martial art, age range) | `domain/matching.ts`, `app/filters.tsx` |
| FK.04 Chat between matches | `app/chat/[matchId].tsx` |
| FK.05 Profile with stats and history | `app/(tabs)/profile.tsx`, `domain/stats.ts` |
| FK.06 Leaderboard (filter by martial art and local area) | `app/(tabs)/leaderboard.tsx`, `domain/leaderboard.ts` |
| FK.07 Log in/out, reset password, delete account (removes all data) | `app/(auth)/*`, `app/settings.tsx` |
| Reporting profiles (feeds admin moderation later) | `components/ReportSheet.tsx` |
| DK.05 Short onboarding with "why we ask" notes | `app/onboarding.tsx` |
| Roles (fighter/judge) and judged fights (database mode) | `app/onboarding.tsx`, `app/judge.tsx`, `app/chat/[matchId].tsx`, `domain/fights.ts` |

## Architecture

```
src/
  domain/       Pure TypeScript rules: matching, validation, leaderboard, stats. No React/Expo. Unit tested.
  data/         Where data comes from: seed fighters, local storage, photo picker, password hashing.
  state/        store.ts = pure state functions (tested); AppContext.tsx = React wiring.
  components/   Reusable UI (cards, deck, avatar, form sections) and ui/ primitives.
  app/          Expo Router screens. (auth) / onboarding / (tabs) are guarded by login + profile state.
  constants/    Design tokens (theme.ts).
```

Layers follow NF.04.02: UI (`app/`, `components/`), logic (`domain/`, `state/`), data access
(`data/`). To connect the real backend, replace `data/storage.ts`, `data/seed.ts` and the
actions in `state/AppContext.tsx` with API calls; screens and domain code stay the same.

### Matching score (0–100)
Proximity 35 + shared martial art 30 + weight class 25 + age group 10. Filters remove
candidates first; the rest are ranked by score, then by distance.

## Notes and limits of the concept

- **Auth is simulated.** Passwords are stored as a salted SHA-256 hash, never in plain text.
  A real backend must hash with bcrypt/argon2 and validate every input again server-side.
- **Notifications** for a new match are in-app (overlay, tab badge, unread dot), not push.
- **The other side of a match** is simulated (`likesYou` in `data/seed.ts`); chat replies are canned.
- Height, weight and age are picked as **classes** (`domain/classes.ts`), not exact numbers.
  Sparring is adults-only (18+).
- Icons and splash use the default Expo assets; a real logo is still to be added.
- Expo SDK 57 differs from older versions: tabs come from `expo-router/js-tabs`, and the swipe
  gesture uses `scheduleOnRN` from `react-native-worklets`.
