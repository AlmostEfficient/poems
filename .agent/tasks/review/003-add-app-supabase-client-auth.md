# Task: Add app Supabase client and auth baseline

## Goal

Add a client-safe Supabase integration for the mobile app, including typed client setup and the first auth baseline for V2.

## Context

The app should be able to use Supabase directly for client-safe work under RLS. Sign-in should support the product direction without forcing account creation before the reader is useful.

## Acceptance checks

- [x] Supabase client reads only client-safe config.
- [x] No service-role secrets are added to the repo.
- [x] Type generation or a clear type strategy exists.
- [x] Initial auth/session handling is documented or implemented.
- [x] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `lib/`
- `hooks/`
- `supabase/`
- `package.json`
- `.env.example`

do not touch:
- `.env` — local-only values
- `/Users/raza/Projects/nexus` — not needed for client auth setup

## Suggested agent

implementation

## Constraints

Use Bun for dependency changes. Keep the reader usable without signing in.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. Schema direction is available from task `002-design-supabase-schema-rls.md` in `review`. Investigation will run first; no dependency, auth, or app code changes until the investigation result is written into this task file.

### 2026-05-25 — Investigation delegated

Delegated read-only client/auth investigation to subagent Hegel. Scope: inspect current dependency/config/auth state, recommend smallest client-safe Supabase setup, type strategy, session baseline, and verification commands. No edits or dependency installs allowed.

### 2026-05-25 — Investigation completed

Hegel completed read-only investigation. Current state: no app Supabase client, no auth/session handling, no `@supabase/supabase-js`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage`, or `expo-secure-store` dependencies. `supabase/` has local CLI config only; no migrations, generated DB types, or seed SQL. `.env` exists but was not read; `.env.example` is missing. Reader flow is local: `App.tsx` -> `usePoemFeed` -> `lib/poems.ts` -> SQLite.

Recommended implementation: add `lib/supabase/database.types.ts`, `lib/supabase/client.ts`, `lib/supabase/auth.ts`, `hooks/useAuthSession.ts`, and `.env.example`; add Supabase client dependencies using Bun/Expo alignment; keep `App.tsx` reader usable without auth. Smallest dependency command recommended: `bunx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage`.

Config strategy: use only Expo-public client-safe env vars: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not copy `.env`; `.env.example` should contain placeholders only. No service-role or secret keys belong in this repo.

Type strategy: until migrations/generated DB types exist, add a narrow placeholder `Database` type and use `createClient<Database>(...)`; replace with generated Supabase types after migrations exist.

Auth/session baseline: import `react-native-url-polyfill/auto`; read only public env vars; use `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`; store sessions in AsyncStorage on native; handle app foreground/background token refresh. Add `useAuthSession()` exposing session/user/readiness plus email sign-in, sign-up, and sign-out. Treat `session === null` as guest mode; the reader stays local and usable.

Required verification after implementation: `bun install`, `bunx tsc --noEmit`, `bunx expo install --check`, and `bunx expo-doctor`. If runtime startup is touched, smoke test `bun run start`.

### 2026-05-25 — Implementation delegated

Delegated implementation to subagent Kant. Scope: client-safe Supabase client/auth baseline, placeholder types, `.env.example`, and dependency updates only. No `.env`, Nexus, migrations/RLS, auth UI, service-role credentials, commit, or push. Required checks: `bunx tsc --noEmit`, `bunx expo install --check`, and `bunx expo-doctor`.

### 2026-05-25 — Implementation completed

Added client-safe Supabase setup using only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, placeholder database types, auth/session helper APIs, and a `useAuthSession` hook. Added `.env.example` placeholders only. Wired the hook at app startup without adding auth UI or blocking the reader; missing config/session remains guest mode. Added dependencies with `bunx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage`; `bun install` made no further changes. Verification passed: `bunx tsc --noEmit`, `bunx expo install --check`, `bunx expo-doctor`, and a short `bun run start` Metro boot smoke test.

### 2026-05-25 — Verification delegated

Delegated independent verification to subagent Huygens. Scope: inspect client/auth implementation against acceptance checks and run `bunx tsc --noEmit`, `bunx expo install --check`, and `bunx expo-doctor`. No edits allowed.

### 2026-05-25 — Verification completed

Huygens verified task 003 against acceptance checks. Verdict: pass; no blocking issues. Evidence: `lib/supabase/client.ts` reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.example` contains placeholders only; placeholder `Database` type is documented and used; `hooks/useAuthSession.ts` implements session loading, auth change subscription, guest/config/session state, and email auth helpers; `App.tsx` calls `useAuthSession()` but does not gate the reader; no migration/RLS work was introduced. Commands passed: `bunx tsc --noEmit`, `EXPO_NO_DOTENV=1 bunx expo install --check`, and `EXPO_NO_DOTENV=1 bunx expo-doctor`.

Non-blocking follow-up: replace placeholder Supabase types after migrations/schema exist; keep future auth UI separate from reader access; resolve `supabase/config.toml`'s future `seed.sql` reference when schema/migrations are added.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- No app Supabase client or auth/session handling exists yet.
- App Supabase config must use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; non-public env names are not app-readable in Expo client code.
- The Supabase mobile client must use only publishable/client-safe keys. Secret/service-role keys remain Nexus-only.
- Auth is optional for reading. A missing session means guest mode, not a blocked app.
- Generated Supabase types should be added only after migrations/schema exist; until then use a narrow placeholder type.
- The startup auth hook can initialize to guest mode when Supabase public config is absent, so local reading does not depend on cloud configuration.
- Auth startup is non-blocking: missing Supabase config or missing session leaves the app in guest mode while the local reader remains usable.

## Status notes

Verified by independent subagent. Ready for review.
