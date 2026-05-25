# Task: Add Supabase auth UI

## Goal

Add a small in-app sign-in/sign-up/sign-out surface so users can create or restore a Supabase session and unlock cloud sync.

## Context

Tasks 003, 005, and 008 added Supabase auth plumbing and sync services, but no user-facing login UI. The app can use an existing persisted session, but a freshly installed app has no way to create one.

This blocks live runtime validation for saved-poems sync and user-created poem sync.

## Acceptance checks

- [ ] User can sign in with email/password from the app.
- [ ] User can sign up with email/password from the app.
- [ ] Signed-in user state is visible in a quiet, non-intrusive way.
- [ ] User can sign out.
- [ ] Auth errors are shown without blocking local reader/library use.
- [ ] Saved-poems and user-poems sync run after sign-in.
- [ ] Guest/local reading, saving, and poem creation still work without auth.
- [ ] `bunx tsc --noEmit` passes.
- [ ] Physical-device runtime validation is attempted after implementation.

## Files / areas

likely involved:
- `components/LibraryView.tsx`
- `hooks/useAuthSession.ts`
- `App.tsx`
- `styles/styles.ts`
- `lib/supabase/auth.ts`

do not touch:
- `.env`
- service-role credentials
- Nexus unless explicitly required

## Suggested agent

implementation

## Constraints

Keep auth optional. Do not make the reader or local library depend on network/auth availability. Use the existing Supabase auth helpers rather than introducing a second auth client.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — Task created

Created after realizing cloud sync/user cloud storage shipped without a user-facing way to establish a Supabase session. This should be handled before or together with `010-live-supabase-runtime-validation.md`.

## Findings

- Supabase sync plumbing exists but needs a persisted session to do useful live work.
- The currently installed device app had no AsyncStorage Supabase session after launch.

## Status notes

- Ready.
