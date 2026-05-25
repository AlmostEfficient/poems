# Task: Add saved poems sync

## Goal

Sync saved poems between local SQLite and Supabase for signed-in users.

## Context

Cloud sync makes saved poems survive reinstall and device changes. The local database should remain the immediate source of truth, with Supabase used for backup/restore and cross-device state.

## Acceptance checks

- [x] Local save/unsave works offline and queues or reconciles with Supabase later.
- [x] Signed-in users can restore saved poem state from Supabase.
- [x] Sync rules are documented for create/update/delete and conflict behavior.
- [x] RLS prevents users from reading or writing another user's saved poem state.
- [x] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `lib/storage/`
- `lib/`
- `hooks/`
- `supabase/`

do not touch:
- Nexus scanner/LLM work
- payment/entitlement logic unless explicitly delegated

## Suggested agent

implementation

## Constraints

Do not block local reading or local saves on network availability.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. Local saved poems and Supabase auth baseline are in `review`; Supabase schema/RLS is designed in task 002 but actual migrations may not exist yet. Investigation will run first to decide whether implementation is safe now or should be staged.

### 2026-05-25 — Investigation delegated

Delegated read-only saved-sync investigation to subagent Copernicus. Scope: inspect local saved state, Supabase client/schema state, implementation readiness, sync rules, metadata needs, RLS/migration requirements, and verification. No edits allowed.

### 2026-05-25 — Investigation completed

Copernicus completed read-only investigation. Current local state is ready for offline-first saves: `saved_poems` exists locally with `poem_id`, timestamps, `sync_status`, `remote_id`, and `deleted_at`; save/unsave are local SQLite writes; unsave creates a tombstone; public local APIs and feed hydration exist. Supabase client/auth baseline exists and uses only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; auth does not block guest mode. Supabase database types are placeholders only.

Remote schema state is not ready: `supabase/` contains only CLI config and temp files. There is no `supabase/migrations/`, schema SQL, seed SQL, generated DB types, or actual remote `saved_poems` table/RLS in the repo. Therefore full saved-poems sync should not be implemented as one app patch yet because the task cannot satisfy "RLS prevents users from reading or writing another user's saved poem state" until migrations/RLS exist.

Staged order: add Supabase migration/RLS for `saved_poems`; generate or replace Supabase DB types if practical; add local sync metadata/API refinements; then add app sync service and hook integration.

Recommended sync rules: local SQLite remains source of truth for UI and save button state. Save writes locally immediately and later upserts remote `deleted_at = null`; unsave writes local `deleted_at` and later pushes the tombstone; pull fetches remote rows changed since checkpoint and applies them locally; conflicts compare `updated_at`, with newer row winning and timestamp ties preferring saved over deleted; sync errors leave local rows dirty and never roll back local saves.

Required local refinements before robust sync: add `poem_scope text not null default 'catalogue'` so local identity matches remote `(user_id, poem_scope, poem_id)`; consider moving local identity to `(poem_scope, poem_id)` before user-created poems ship; add repository APIs to list dirty saved rows including tombstones, mark rows synced with `remote_id`, apply remote rows locally, and read/write a saved-poems sync checkpoint. Existing `sync_status` should become explicit values like `dirty`, `synced`, and `error`.

Required Supabase migration/RLS: create `saved_poems` with `id uuid primary key`, `user_id uuid not null references auth.users(id)`, `poem_id text not null`, constrained `poem_scope`, `saved_at`, `updated_at`, `deleted_at`, unique `(user_id, poem_scope, poem_id)`, indexes on `(user_id, updated_at)` and `(user_id, poem_scope, poem_id)`, RLS enabled, and policies allowing users to select/insert/update/delete only rows where `user_id = auth.uid()`. Insert/update policies must include `WITH CHECK (user_id = auth.uid())`.

Service-role boundary: no service-role credentials in this app repo. Privileged backfills, catalogue admin writes, and RLS-bypassing operations belong in Nexus or admin tooling, not mobile runtime.

### 2026-05-25 — Stage 1 migration/RLS delegated

Delegated Supabase migration/RLS implementation to subagent Carson. Scope: add `saved_poems` migration and RLS policies only. No app sync service, `.env`, Nexus, service-role credentials, scanner/payment work, commit, or push. Required check: `bunx tsc --noEmit`; optional Supabase SQL lint/dry check only if available without reading `.env`.

### 2026-05-25 — Stage 1 migration/RLS completed

Carson added `supabase/migrations/20260525000100_create_saved_poems.sql`. Migration creates `public.saved_poems` with `id uuid primary key default gen_random_uuid()`, enables `pgcrypto`, adds `user_id`, `poem_id`, constrained `poem_scope`, `saved_at`, `updated_at`, `deleted_at`, unique `(user_id, poem_scope, poem_id)`, and an index on `(user_id, updated_at)`. It enables RLS and adds authenticated own-row policies for select, insert, update, and delete; insert/update include `WITH CHECK (user_id = auth.uid())`.

Verification reported by Carson: `bunx tsc --noEmit` passed; `supabase --version` available at 2.75.0; `supabase db lint --local` was attempted but blocked because local Postgres was not running on `127.0.0.1:54322`. No app sync service was implemented.

### 2026-05-25 — Stage 1 verification delegated

Delegated independent migration/RLS verification to subagent Curie. Scope: verify `saved_poems` migration, RLS policies, no secrets, no app sync code, and run `bunx tsc --noEmit`; optional Supabase lint only if possible without `.env`.

### 2026-05-25 — Stage 1 migration/RLS independently verified

Curie independently verified `supabase/migrations/20260525000100_create_saved_poems.sql`. Verdict: pass; no blocking issues. The migration creates `public.saved_poems` with required columns, constrained `poem_scope`, unique `(user_id, poem_scope, poem_id)`, useful indexes, RLS enabled, and own-row authenticated policies. Insert and update policies include `WITH CHECK (user_id = auth.uid())`. `bunx tsc --noEmit` passed. `supabase db lint --local` was attempted but blocked because local Postgres was not running on `127.0.0.1:54322`. No service-role credentials or app saved-poems sync code were found.

### 2026-05-25 — Stage 2 local sync metadata delegated

Delegated local sync metadata/API implementation to subagent Hooke. Scope: add local `poem_scope`, explicit sync statuses, sync-oriented saved-poems repository APIs, and checkpoint helpers. No Supabase network sync service, UI, `.env`, Nexus, service-role credentials, commit, or push. Required check: `bunx tsc --noEmit`.

### 2026-05-25 — Stage 2 local sync metadata completed

Hooke added local sync-readiness changes in `lib/storage/database.ts`, `lib/storage/poemRepository.ts`, and `lib/poems.ts`. Behavior changed: added `saved_poems.poem_scope text not null default 'catalogue'` via idempotent migration; bumped local `DB_VERSION` to 6; migrated old `sync_status = 'local'` rows to `dirty`; save/resave now marks rows `dirty` and clears `deleted_at`; unsave tombstones rows and marks them `dirty`; added repository/public helpers for dirty-row listing, mark-synced, apply-remote, and per-user saved-poems sync checkpoints. No Supabase network sync service was added. Hooke reported `bunx tsc --noEmit` passed.

Staged limitation: existing local `saved_poems` still has `poem_id` as the primary key. The implementation added `poem_scope` and a unique `(poem_scope, poem_id)` index, but full remote-aligned composite identity would require a SQLite table rebuild. Until that is planned, the app cannot safely store both `catalogue:x` and `user:x` if they share the same `poem_id`.

### 2026-05-25 — Stage 2 verification delegated

Delegated independent local sync metadata/API verification to subagent Schrodinger. Scope: inspect local schema/API changes, confirm no Supabase network sync service was added, and run `bunx tsc --noEmit`. No edits allowed.

### 2026-05-25 — Stage 2 local sync metadata independently verified

Schrodinger independently verified local saved-poems sync metadata/API readiness. Verdict: pass; no blocking issues. Verified idempotent `poem_scope` migration without local DB replacement, explicit dirty/synced/error repository flow, local save/unsave dirty tombstones, dirty-row listing, mark-synced, apply-remote, and per-user checkpoint APIs exposed through `lib/poems.ts`. No Supabase network sync service was added. `bunx tsc --noEmit` passed.

Non-blocking follow-up: local `saved_poems` still uses `poem_id` as primary key; future table rebuild should consider composite local identity for `(poem_scope, poem_id)` and optional SQLite constraints for `sync_status`. Future sync service should guard `markSavedPoemSynced` against marking a row synced after a newer local dirty edit.

### 2026-05-25 — Final app sync stage delegated

Delegated saved-poems app sync implementation to subagent Nash. Scope: small Supabase sync service, narrow type update, and opportunistic hook integration. Local save/unsave must remain SQLite-first and non-blocking. No UI, `.env`, Nexus, service-role credentials, scanner/payment work, commit, or push. Required checks: `bunx tsc --noEmit`, `EXPO_NO_DOTENV=1 bunx expo install --check`, and `EXPO_NO_DOTENV=1 bunx expo-doctor`.

### 2026-05-25 — Final app sync stage implemented

Added app-side saved-poems sync without UI changes. New `lib/supabase/savedPoemsSync.ts` performs push-then-pull for signed-in users with the publishable Supabase client and RLS. Dirty local rows are upserted to remote `saved_poems` by `(user_id, poem_scope, poem_id)` and unsaves are sent as `deleted_at` tombstones. Remote rows changed since the per-user checkpoint are applied locally through repository APIs. Added a guarded local mark-synced path so a row is not marked synced after a newer local edit changes `updated_at`. Added `hooks/useSavedPoemsSync.ts` and wired it from `App.tsx` to sync opportunistically on auth/database readiness, foreground, and after local save/unsave. Updated the narrow Supabase placeholder `Database` type for `saved_poems`.

Verification passed: `bunx tsc --noEmit`; `EXPO_NO_DOTENV=1 bunx expo install --check`; `EXPO_NO_DOTENV=1 bunx expo-doctor`.

### 2026-05-25 — Full-task verification delegated

Delegated independent full-task verification to subagent Anscombe. Scope: verify task 005 acceptance checks across migration/RLS, local sync metadata, app sync service, non-blocking offline behavior, no secrets, and required commands. No edits allowed.

### 2026-05-25 — Full-task verification completed

Anscombe independently verified task 005. Verdict: pass; no blocking issues. Verified SQLite-first save/unsave, signed-in push/pull sync path, dirty retry behavior, publishable Supabase client usage, RLS own-row policies, no generated asset DB changes, and required Bun/Expo checks. Commands passed: `bunx tsc --noEmit`, `EXPO_NO_DOTENV=1 bunx expo install --check`, and `EXPO_NO_DOTENV=1 bunx expo-doctor`. `EXPO_NO_DOTENV=1 supabase db lint --local` was attempted but blocked because local Postgres was not running on `127.0.0.1:54322`.

Non-blocking runtime gaps: live Supabase auth/sync was not exercised; restore is verified by code path only; device/simulator checks for offline save, restart persistence, and later reconciliation were not run.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- Saved-poems sync is blocked from full app implementation until Supabase migrations/RLS actually exist.
- Local `saved_poems` should gain `poem_scope` before cloud sync so it matches the remote identity model.
- Save/unsave UI must remain local-only; sync is background reconciliation.
- Remote unsaves should be soft-delete tombstones, not hard deletes, so offline devices can reconcile later.
- App-side Supabase sync must use only publishable client config and RLS; service-role work remains outside this repo and Nexus-owned where privileged backend work is required.
- The `saved_poems` remote identity index is covered by the unique constraint on `(user_id, poem_scope, poem_id)`; no duplicate index is needed.
- Stage 1 remote `saved_poems` migration/RLS is ready for review; SQL lint still needs a running local Supabase database.
- Local `saved_poems` now carries `poem_scope` for remote identity alignment, but the existing `poem_id` primary key remains a staged limitation until a safe SQLite table rebuild is planned.
- Stage 2 local saved-poems sync metadata/API is ready for review; no blocking issues found.
- Local save/unsave remains offline-first and SQLite-only.
- Future table rebuild should consider composite local identity for `(poem_scope, poem_id)` and optional SQLite constraints for `sync_status`.
- App-side saved-poems sync now returns non-fatal results for unconfigured, signed-out, unavailable, and Supabase-error states; local dirty rows remain the retry source.
- App-side saved-poems sync pushes dirty local rows before pulling remote checkpoint changes.
- Marking a local saved row as synced is guarded by the expected local `updated_at` when called from sync, reducing the chance of clearing a newer local dirty edit.
- Full saved-poems sync passes code and command verification; live Supabase restore still needs runtime validation with a signed-in test user.
- Supabase SQL lint remains blocked until local Supabase/Postgres is running.

## Status notes

Verified by independent subagent. Ready for review.
