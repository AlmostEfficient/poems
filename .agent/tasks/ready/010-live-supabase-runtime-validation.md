# Task: Live Supabase runtime validation

## Goal

Validate Supabase auth, RLS, and saved/user-poem sync against the live project from the installed iPhone app.

## Context

The app now builds and launches on the connected iPhone 13 Pro with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` loaded. Local SQLite initializes successfully with 112 bundled poems.

Current blocker: the installed `com.raza.poems` app container has no persisted AsyncStorage session files, and this change set does not include a sign-in UI. Without an authenticated Supabase session in this app bundle, live signed-in sync/RLS cannot be proven from the device.

Local schema note: user-created poems are stored in SQLite `poems` rows where `source = 'user'`; sync checkpoints are stored in `metadata`. A missing local `user_poems` or `sync_state` table is not a bug in the current design.

## Acceptance checks

- [ ] Device app has an authenticated Supabase session for `com.raza.poems`.
- [ ] Save/unsave a bundled poem on device and verify remote `saved_poems` row changes only for the signed-in user.
- [ ] Create a user poem on device and verify remote `user_poems` row changes only for the signed-in user.
- [ ] Restart app and verify pulled remote state reconciles into local SQLite.
- [ ] Verify unauthenticated/other-user RLS cannot read or mutate another user's `saved_poems` or `user_poems`.
- [ ] Record exact validation commands/manual steps and results in this task file.

## Files / areas

likely involved:
- `hooks/useAuthSession.ts`
- `lib/supabase/`
- `components/LibraryView.tsx`
- `App.tsx`
- `.agent/WORKBOOK.md`

do not touch:
- `.env`
- service-role credentials
- Nexus unless privileged backend verification is explicitly required

## Suggested agent

investigation / implementation

## Constraints

Keep local reading/save/create flows SQLite-first. Do not add service-role credentials to the app repo.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — Task created

Created after physical-device validation could build and launch the app but could not prove live signed-in sync. Fresh `bun run ios -- --device "Raza’s beater"` built and installed successfully, loaded `.env` with `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `EXPO_PUBLIC_SUPABASE_URL`, and logged `Database loaded with 112 poems`. Device container copy showed SQLite initialized, but `Library/Application Support/com.raza.poems/RCTAsyncLocalStorage_V1` had no persisted files, so there was no Supabase session to exercise.

Subagent Newton confirmed the local DB table concern was a false alarm: local user-created poems live in `poems.source = 'user'`, and checkpoints live in `metadata`; remote `user_poems` exists only in Supabase migrations.

## Findings

- Physical iPhone build/install/launch works after aligning iOS deployment target to 16.4, building React Native from source, and updating the generated AppDelegate for the installed Expo SDK API.
- Runtime env now exports the expected Expo-public Supabase variable names.
- Live auth/sync validation needs an authenticated session in the installed `com.raza.poems` app, or a temporary/manual auth path for validation.
- Missing local `user_poems` and `sync_state` tables are not defects in the current SQLite design.

## Status notes

- Blocked on establishing an authenticated Supabase session in the installed app bundle.
