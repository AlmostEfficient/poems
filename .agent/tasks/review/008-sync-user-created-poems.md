# Task: Sync user-created poems

## Goal

Sync manually created user poems between local SQLite and Supabase for signed-in users.

## Context

User-created poems should survive reinstall and device changes. This task extends the sync foundation from saved poems to full user-owned poem records.

## Acceptance checks

- [x] Signed-in users can upload local user-created poems to Supabase.
- [x] Signed-in users can restore user-created poems from Supabase.
- [x] Local edits/deletes have documented sync behavior.
- [x] RLS prevents cross-user access.
- [x] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `lib/storage/`
- `lib/`
- `hooks/`
- `supabase/`

do not touch:
- Scanner/LLM integration unless explicitly delegated

## Suggested agent

implementation

## Constraints

Local availability remains primary. Network failure must not destroy local user poems.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. Manual poem creation and saved-poems sync are in `review`. Investigation will run first to determine whether user-created poem sync is ready or needs staged schema/local metadata work.

### 2026-05-25 — Investigation delegated

Delegated read-only user-created poem sync investigation to subagent Dalton. Scope: inspect local user-poem model, Supabase schema/client state, implementation readiness, remote migration/RLS needs, local metadata needs, app sync approach, and verification. No edits allowed.

### 2026-05-25 — Investigation completed

Dalton completed read-only investigation. Current state: local user poems are rows in `poems` with `source = 'user'`, `poem_id`, title, author, content, language, source, and metadata, but no user-poem `created_at`, `updated_at`, `sync_status`, `remote_id`, or `deleted_at`. Public API is local-only: `createLocalUserPoem()` validates content, defaults blank title/author, creates a deterministic `user-...` ID, and inserts into `poems`; `getLocalUserPoems()` lists `source = 'user'` rows by local row id. Supabase client/auth exists and saved-poems sync provides a pattern, but remote schema currently has only `saved_poems`; no `user_poems` migration or type entry exists.

Implementation should be staged, not one large patch. Missing foundations: remote `user_poems` table/RLS and local dirty state, remote ID, timestamps, tombstones, and checkpoints. Safe order: remote migration/RLS first; local metadata/API second; app sync service/hook third.

Recommended remote `user_poems`: `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `poem_id text not null`, title/author/content, `language` constrained to `en`/`ur`, `metadata jsonb not null default '{}'`, `origin` default `manual` constrained to `manual`/`scanner`/`import`, `created_at`, `updated_at`, `deleted_at`, and unique `(user_id, poem_id)`. Index `(user_id, updated_at)`; the unique constraint covers `(user_id, poem_id)`. RLS should allow authenticated users to select/insert/update/delete only their own rows, with insert/update `WITH CHECK (user_id = auth.uid())`.

Required local changes before network sync: add user-poem sync metadata to local `poems` rows for `source = 'user'`: `created_at`, `updated_at`, `sync_status` (`dirty | synced | error`), `remote_id`, and `deleted_at`. Add APIs to list dirty user poems including deleted rows, mark synced with `expectedLocalUpdatedAt`, apply remote user poem locally, get/set `user_poems_sync_checkpoint:${userId}`, and staged edit/delete repository functions even without UI.

Recommended app sync: mirror saved-poems sync with `lib/supabase/userPoemsSync.ts` and `hooks/useUserPoemsSync.ts`. Trigger on auth/database readiness, foreground, and after local create. Push dirty local rows first, then pull remote rows since checkpoint. Never block local create/list/detail on Supabase. Sync errors leave local rows dirty/error for retry. Remote pulls refresh the Your Poems list and must not inject restored user poems into the random feed.

Sync behavior: create succeeds locally first and marks dirty; sync upserts by `(user_id, poem_id)` and marks synced only if local `updated_at` still matches. Future edits mark dirty and bump `updated_at`. Future deletes should be tombstones. Conflicts use `updated_at` last-write-wins, with timestamp ties preferring non-deleted over deleted. Network failure must never delete or roll back local user poems.

### 2026-05-25 — Stage 1 migration/RLS delegated

Delegated Supabase `user_poems` migration/RLS implementation to subagent Zeno. Scope: remote table, indexes, RLS, and own-row policies only. No local metadata, app sync service, `.env`, Nexus/scanner, service-role credentials, commit, or push. Required check: `bunx tsc --noEmit`; optional Supabase lint only if possible without `.env`.

### 2026-05-25 — Stage 1 migration/RLS completed

Zeno added `supabase/migrations/20260525000200_create_user_poems.sql`. Migration creates `public.user_poems` with UUID remote identity, per-user `poem_id` uniqueness, title/author/content, constrained language, metadata default, constrained origin default, created/updated timestamps, delete tombstone, and index on `(user_id, updated_at)`. It enables RLS and adds authenticated own-row select/insert/update/delete policies; insert/update include `WITH CHECK (user_id = auth.uid())`. Zeno reported `bunx tsc --noEmit` passed. `EXPO_NO_DOTENV=1 supabase db lint --local` was attempted but blocked because local Postgres/Supabase was not running on `127.0.0.1:54322`.

Assumption: `created_at` and `updated_at` have no database defaults because app sync will provide values.

### 2026-05-25 — Stage 1 verification delegated

Delegated independent `user_poems` migration/RLS verification to subagent Boole. Scope: verify migration shape, indexes, RLS policies, no secrets, no app/local sync work, and run `bunx tsc --noEmit`; optional Supabase lint only if possible without `.env`.

### 2026-05-25 — Stage 1 migration/RLS independently verified

Boole independently verified `supabase/migrations/20260525000200_create_user_poems.sql`. Verdict: pass; no blocking issues. The migration creates `public.user_poems` with requested columns and constraints, unique `(user_id, poem_id)`, index `(user_id, updated_at)`, RLS enabled, and authenticated own-row select/insert/update/delete policies. Insert/update policies include `WITH CHECK (user_id = auth.uid())`. No service-role credentials or user-poems app sync/local metadata work were found in this stage. `bunx tsc --noEmit` passed. `EXPO_NO_DOTENV=1 supabase db lint --local` was attempted but blocked because local Postgres/Supabase was unavailable on `127.0.0.1:54322`.

### 2026-05-25 — Stage 2 local sync metadata delegated

Delegated local user-poem sync metadata/API implementation to subagent Wegener. Scope: add local sync metadata columns, update manual create/list behavior, add dirty/mark-synced/apply-remote/checkpoint/update/delete APIs. No Supabase network sync service, `.env`, Nexus/scanner, service-role credentials, generated asset, commit, or push. Required check: `bunx tsc --noEmit`.

### 2026-05-25 — Stage 2 local sync metadata completed

Wegener added local user-poem sync metadata/API in `lib/storage/database.ts`, `lib/storage/poemRepository.ts`, and `lib/poems.ts`. Behavior changed: bumped local `DB_VERSION` to 7; added idempotent `poems` columns `created_at`, `updated_at`, `sync_status`, `remote_id`, and `deleted_at`; backfilled existing `source = 'user'` rows with timestamps and dirty status when they have no `remote_id`; `createLocalUserPoem` now writes dirty timestamps; `getLocalUserPoems` hides tombstoned rows and sorts by latest local timestamp; public APIs now include dirty listing, guarded mark-synced, remote apply with tombstones, per-user checkpoints, and staged local update/delete helpers. No Supabase network sync service was added. Wegener reported `bunx tsc --noEmit` passed.

Staged limitations: no app-side user-poems sync service yet; no UI calls update/delete helpers yet; `sync_status` values are TypeScript-typed but not SQLite-constrained; `applyRemoteUserPoem` skips remote rows whose `poem_id` collides with a non-user local poem.

### 2026-05-25 — Stage 2 verification delegated

Delegated independent local user-poem sync metadata/API verification to subagent Lovelace. Scope: inspect local migration/API changes, confirm no network sync service or generated asset changes, and run `bunx tsc --noEmit`. No edits allowed.

### 2026-05-25 — Stage 2 local sync metadata independently verified

Lovelace independently verified stage 2. Verdict: pass; no blocking issues. Verified idempotent non-replacing DB migration, local user-poem metadata columns, dirty backfill for existing unsynced user rows, dirty timestamps for new user poems, tombstone filtering/sort in `getLocalUserPoems`, dirty listing, guarded mark-synced, remote apply, staged update/delete, checkpoint APIs, public exports, no user-poems Supabase network sync service, and no `assets/poems.db` regeneration. `bunx tsc --noEmit` passed.

Non-blocking follow-up: `markUserPoemSynced` returns `void`, so the future sync caller cannot directly tell whether the `expectedLocalUpdatedAt` guard matched. The network sync service should verify guarded updates or make the result observable.

### 2026-05-25 — Stage 3 app sync delegated

Delegated app-side user-poems sync implementation to subagent Singer. Scope: Supabase push/pull sync service, narrow type update, opportunistic hook integration, and mark-synced guard observability if needed. Local create/list/detail must remain SQLite-first and non-blocking. No `.env`, Nexus/scanner, service-role credentials, random-feed injection, commit, or push. Required checks: `bunx tsc --noEmit`, `EXPO_NO_DOTENV=1 bunx expo install --check`, and `EXPO_NO_DOTENV=1 bunx expo-doctor`.

### 2026-05-25 — Stage 3 app sync completed

Singer implemented app-side user-created poem sync. Changed files: `lib/supabase/userPoemsSync.ts`, `hooks/useUserPoemsSync.ts`, `lib/supabase/database.types.ts`, `lib/storage/poemRepository.ts`, `App.tsx`, and `components/LibraryView.tsx`. Behavior added: dirty/error local user poems push first to Supabase `user_poems` using publishable client and RLS; upserts by `(user_id, poem_id)` with `deleted_at` tombstones; remote rows changed since `user_poems_sync_checkpoint:${userId}` pull and apply locally; conflicts use latest `updated_at`, with ties preferring non-deleted; guarded `markUserPoemSynced()` result is observable so newer local edits are not silently marked synced; sync triggers on auth/database readiness, foreground, and after local manual poem creation; local create/list/detail remain SQLite-first and sync failures leave rows dirty/error for retry; remote pulls refresh Your Poems list.

Verification reported by Singer: `bunx tsc --noEmit`, `EXPO_NO_DOTENV=1 bunx expo install --check`, and `EXPO_NO_DOTENV=1 bunx expo-doctor` all passed. Not runtime-verified: live Supabase authenticated push/pull, cross-device restore, RLS behavior against hosted project/session, and tombstone reconciliation against live remote rows.

### 2026-05-25 — Full-task verification delegated

Delegated independent full-task verification to subagent Mill. Scope: verify task 008 acceptance checks across migration/RLS, local metadata/API, app sync service, SQLite-first behavior, no secrets, no random-feed injection, no generated asset changes, and required commands. No edits allowed.

### 2026-05-25 — Full-task verification completed

Mill independently verified task 008. Verdict: pass with runtime caveats; no blocking issues. Commands passed: `bunx tsc --noEmit`, `EXPO_NO_DOTENV=1 bunx expo install --check`, and `EXPO_NO_DOTENV=1 bunx expo-doctor`. Code inspection verified dirty local user poems upload to Supabase `user_poems` by `(user_id, poem_id)`, remote rows restore through checkpoint pull/apply, local create/list/detail remain SQLite-first, network failures do not delete/roll back local poems, edit/delete sync behavior is documented and tombstone-based, RLS scopes rows to `auth.uid()` with insert/update `WITH CHECK`, publishable client config only, user poems excluded from random feed, and no `assets/poems.db` or `poems.json` changes.

Runtime caveats: live Supabase auth push/pull, cross-device restore, and hosted RLS behavior were not exercised. Supabase lint remains blocked because local Supabase/Postgres is not running on `127.0.0.1:54322`. Verification noted `expo-doctor` reported `Saved lockfile`; `bun.lockb` is modified in the worktree and should be reviewed before final handoff.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- User-created poem sync should be staged: remote `user_poems` migration/RLS, then local sync metadata/API, then app sync hook.
- Local user poems currently lack sync metadata; full sync should not ship until dirty state, remote id, timestamps, tombstones, and checkpoints exist.
- User-created poem sync should reuse the saved-poems push-then-pull, SQLite-first reconciliation pattern.
- Until edit/delete UI exists, sync must still document and support remote tombstones and future local dirty edits/deletes at the repository level.
- Stage 1 remote `user_poems` migration/RLS is ready for review; SQL lint still needs a running local Supabase database.
- Local user-created poems now have sync-ready metadata, but full user-poem sync still needs the app-side Supabase push/pull service and runtime validation with a signed-in test user.
- Stage 2 local user-poem sync metadata/API is ready for app-side sync work; `assets/poems.db` was not regenerated.
- Future user-poems sync should make guarded mark-synced results observable to avoid silently clearing or missing newer local edits.
- User-created poem sync now mirrors saved-poems sync but adds a pre-upsert remote read so latest `updated_at` wins before local dirty rows overwrite remote state.
- Live Supabase/session validation remains required for user-created poem sync.
- Full user-created poem sync acceptance checks pass by code inspection and required commands; live Supabase runtime validation remains outstanding.
- `bun.lockb` is modified in the worktree after Expo/Bun verification commands; review lockfile delta before final handoff.

## Status notes

Verified by independent subagent. Ready for review.
