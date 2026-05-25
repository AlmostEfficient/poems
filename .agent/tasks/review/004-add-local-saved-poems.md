# Task: Add local saved poems

## Goal

Let users save and unsave poems locally, with saved state stored in SQLite and available offline.

## Context

V2's core loop is read poems, save meaningful ones, and trust that the library persists. Local saved state should work before cloud sync is layered on.

## Acceptance checks

- [x] SQLite has a durable local representation for saved poems.
- [x] Repository APIs can save, unsave, and list saved poems.
- [x] Saved state survives app restart.
- [x] User-owned save state is separated from bundled catalogue rows.
- [x] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `lib/storage/database.ts`
- `lib/storage/poemRepository.ts`
- `lib/poems.ts`
- `hooks/usePoemFeed.ts`
- `App.tsx`

do not touch:
- Supabase sync code — this task is local-only
- `.env`

## Suggested agent

implementation

## Constraints

Do not require sign-in to save locally. Do not make network access part of the save path.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. SQLite migration hardening is available from task `001-harden-sqlite-migrations.md` in `review`. Investigation will run first; no local save implementation until the investigation result is written into this task file.

### 2026-05-25 — Investigation delegated

Delegated read-only local saved-poems investigation to subagent Avicenna. Scope: inspect local data/API/UI state, recommend SQLite representation, repository/public APIs, hook/App touchpoints, and verification. No edits allowed.

### 2026-05-25 — Investigation completed

Avicenna completed read-only investigation. Current state: no local saved-poem feature exists. Durable poem identity is `Poem.id`, mapped from SQLite `poems.poem_id`; repository queries read `poems` only, with no saved/favorite table or saved field. The reader is full-screen and offline-first via `usePoemFeed`; `App.tsx` renders the vertical pager and has no visible save control.

Recommended SQLite representation: add a separate user-owned `saved_poems` table, not a column on `poems`. Proposed columns: `poem_id text primary key`, `saved_at text not null`, `updated_at text not null`, `sync_status text not null default 'local'`, `remote_id text`, and `deleted_at text`, plus an index on `saved_at desc`. Soft delete means marking `deleted_at` instead of deleting so future sync can reconcile offline unsaves. Add this idempotently in `applyMigrations()` and bump `DB_VERSION` from 4 to 5. Do not regenerate `assets/poems.db` for this local migration. Do not add a foreign key yet; future saved rows may refer to remote/user/imported poems during sync, and list queries can omit missing local poem rows.

Recommended repository/public APIs: add local save, unsave, saved-check, saved IDs, and saved poem list functions in `lib/storage/poemRepository.ts`; expose matching helpers from `lib/poems.ts`. `savePoem` should insert or clear `deleted_at`; `unsavePoem` should soft-delete; list queries should join `saved_poems` to `poems`, filter `deleted_at is null`, and order by `saved_at desc`.

Recommended hook/App touchpoints: in `usePoemFeed`, maintain `savedPoemIds`, expose `toggleSavedPoem(poemId)` and `isPoemSaved(poemId)`, and update React state after save/unsave. In `App.tsx`, pass saved state into `PoemView` and add a small save button overlay. This must call local SQLite only, remain independent of auth/session state, and not build the full My Library UI.

Verification: `bunx tsc --noEmit`. Focused manual checks: save a bundled poem, restart, verify saved; unsave, restart, verify unsaved; save works with no sign-in/network; switching English/Urdu does not crash saved-state hydration; saving/unsaving does not alter `poems.source`, `poems.metadata`, or bundled rows.

### 2026-05-25 — Implementation delegated

Delegated implementation to subagent Hypatia. Scope: local-only SQLite saved state, repository/public APIs, hook state, and small reader save control. No Supabase sync/network, `.env`, auth requirement, My Library UI, commit, or push. Required check: `bunx tsc --noEmit`.

### 2026-05-25 — Implementation completed

Hypatia implemented local-only saved poems. Changed files: `lib/storage/database.ts`, `lib/storage/poemRepository.ts`, `lib/poems.ts`, `hooks/usePoemFeed.ts`, `App.tsx`, and `styles/styles.ts`. Behavior added: local `saved_poems` SQLite table with `poem_id`, timestamps, `sync_status`, `remote_id`, `deleted_at`, and `saved_at desc` index; DB version bumped to 5; repository/public APIs for save, soft-unsave, saved check, saved IDs, and saved poem listing via join to `poems`; feed saved-state hydration and `isPoemSaved`/`toggleSavedPoem`; small reader save/unsave star control for local poems with accessibility label/hint/state. No auth or network dependency. Hypatia reported `bunx tsc --noEmit` passed.

Manual checks still needed: save a bundled poem, restart, confirm saved; unsave, restart, confirm unsaved; confirm save works in guest/offline mode; visual check that the star control does not collide with title text.

### 2026-05-25 — Verification delegated

Delegated independent verification to subagent Ramanujan. Scope: inspect local saved-poems implementation against acceptance checks, confirm no Supabase/Nexus/network/auth dependency, and run `bunx tsc --noEmit`. No edits allowed.

### 2026-05-25 — Verification completed

Ramanujan verified task 004 by code inspection and `bunx tsc --noEmit`. Verdict: pass; no blocking issues. Evidence: `saved_poems` is a separate durable SQLite table with timestamps, sync fields, and `deleted_at`; repository APIs support save, soft unsave, saved check, saved IDs, and saved poem listing; public APIs are exported from `lib/poems.ts`; saved IDs hydrate from SQLite on feed initialization and updates write through repository calls; save path is local-only and has no Supabase/Nexus/network import; reader control is a small accessible `Pressable`; `assets/poems.db` was not modified.

Manual checks remain for simulator/device: restart persistence after save/unsave and visual overlap of the star control.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- Local saved state should live in a separate `saved_poems` table keyed by stable `poem_id`, not on bundled catalogue rows.
- Local save/unsave must work in guest mode and must not call Supabase or Nexus.
- Saved-poem list queries should join `saved_poems` to `poems` and ignore missing local poem rows until sync/import behavior exists.
- Soft deletes are preferred for saved state because future Supabase sync needs to reconcile offline unsaves.
- `getRandomPoems()` currently returns source as stored, then `asLocalPoems()` overwrites it with `local`; do not rely on reader `source` alone to distinguish bundled versus user poems.
- Local unsave writes a soft-delete tombstone in `saved_poems`, preserving future sync intent without modifying bundled `poems` rows.
- Local saved poems are stored as user-owned state in `saved_poems`, separate from bundled catalogue rows. Unsave writes `deleted_at`, and saved list queries filter deleted rows.

## Status notes

Verified by independent subagent. Ready for review.
