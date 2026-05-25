# Task: Harden SQLite migrations

## Goal

Ensure app upgrades and bundled catalogue refreshes cannot delete user-owned saved or uploaded poems.

## Context

This is the foundation for V2. The app began as a read-only bundled catalogue, but V2 introduces saved poems, user-created poems, Supabase sync, and scanner imports. User-owned data must survive schema changes and bundled catalogue updates.

## Acceptance checks

- [x] Current SQLite initialization and bundled DB copy behavior is documented in the task work log.
- [x] A safe migration/update approach is implemented or clearly staged so user-owned data is preserved.
- [x] Catalogue data and user-owned state are not coupled in a way that requires full DB replacement.
- [x] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `lib/storage/database.ts`
- `lib/storage/poemRepository.ts`
- `lib/poems.ts`
- `scripts/generate_poems_db.ts`
- `assets/poems.db`

do not touch:
- `.env` — local environment config
- `/Users/raza/Projects/nexus` — not needed for this local storage task

## Suggested agent

investigation, then implementation, then verification

## Constraints

Do not add Supabase, Nexus, scanner, or payment work in this task. Preserve offline-first behavior.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. Investigation will run first; implementation remains blocked until the investigation result is written into this task file.

### 2026-05-25 — Investigation delegated

Delegated read-only investigation to subagent Kepler. Scope: document current SQLite initialization, bundled DB copy, migration behavior, data-loss risks, and the smallest safe staged implementation path. No code edits allowed.

### 2026-05-25 — Investigation completed

Kepler completed read-only investigation. Current runtime database is `poems.db` with `DB_VERSION = 4`. Startup calls `shouldReplaceExistingDatabase()`; if no local DB exists, the bundled `assets/poems.db` is copied into Expo's document SQLite directory. If a local DB has missing, invalid, or lower `metadata.db_version`, the app deletes the on-device DB and recopies the bundled DB. `copyBundledDatabase()` also deletes the destination DB before copying.

`applyMigrations()` creates/patches the single `poems` table, adds `source`, `metadata`, and `poem_id`, backfills IDs, and writes `db_version`. `scripts/generate_poems_db.ts` regenerates `assets/poems.db` from `poems.json`, recreates `poems` and `metadata`, inserts bundled poems, and stores `db_version = 4`. The bundled DB currently has 67 poems, all `source = bundled`.

Risk: the current upgrade path is destructive. Future user-created poems already use `source = user` in the same `poems` table, and future saved/favorite/progress/upload/sync tables would be lost if the DB file is replaced on version bumps or malformed metadata.

Recommended implementation path: stop replacing existing on-device DBs. Copy the bundled DB only when no local DB exists; run additive/idempotent migrations in place for existing DBs; import/upsert bundled catalogue rows by stable `poem_id`; never delete or overwrite `source != 'bundled'` rows. Longer term, separate catalogue data from user state and sync metadata.

Suggested implementation checks: prove an existing lower-version DB with a `source = user` poem survives initialization; malformed/missing metadata does not cause deletion when user data exists; bundled catalogue refresh upserts bundled rows by `poem_id`; bundled refresh does not delete or overwrite user poems; no-local-DB first install still initializes from bundled catalogue; `bunx tsc --noEmit` passes.

### 2026-05-25 — Implementation delegated

Delegated implementation to subagent Euclid. Scope: database-layer changes only; no Supabase, Nexus, scanner, payment, UI, `.env`, or commit/push. Required verification: `bunx tsc --noEmit`.

### 2026-05-25 — Implementation completed

Euclid updated `lib/storage/database.ts` so existing local SQLite databases are no longer deleted or recopied on missing, invalid, or lower `metadata.db_version`. Bundled `assets/poems.db` is now copied only for first install. Existing DBs run migrations in place and refresh bundled catalogue rows by `poem_id`, updating only rows where `source = 'bundled'` and preserving `source != 'bundled'` rows. Euclid reported `bunx tsc --noEmit` passed. No catalogue generation was run and `assets/poems.db` was not touched.

Residual risk from implementation: no focused migration test harness exists yet, so lower-version DBs, missing/malformed metadata, matching user `poem_id`, and bundled catalogue update behavior still need independent verification or follow-up test coverage.

### 2026-05-25 — Verification delegated

Delegated independent verification to subagent Hume. Scope: inspect implementation, confirm acceptance checks, and run `bunx tsc --noEmit`. No edits allowed.

### 2026-05-25 — Verification completed

Hume verified the SQLite behavior by code inspection and reported `bunx tsc --noEmit` passed. Evidence: existing DBs are no longer deleted for missing, invalid, or lower `metadata.db_version`; bundled DB copy now only happens when no local DB exists; existing DBs migrate in place; bundled catalogue refresh upserts by `poem_id`; user rows are protected because conflict updates only run when the existing row has `source = 'bundled'`.

Hume flagged untracked `supabase/` files as a scope hygiene concern. PM adjudication: Euclid reported `supabase/` as unrelated pre-existing worktree state and left it untouched; local status/diff confirms the implementation change is limited to `lib/storage/database.ts` plus PM metadata. The Supabase directory remains outside this task and was not modified or removed.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- Current SQLite initialization deletes and replaces the on-device DB when `metadata.db_version` is missing, invalid, or below `DB_VERSION`.
- The existing model stores bundled and user-created poems in the same `poems` table, distinguished by `source`.
- `insertPoem()` writes user-created poems with `source = user`, so DB replacement would delete future uploaded/manual poems.
- Current bundled DB contains 67 bundled poems, `metadata.db_version = 4`, and no user/state tables.
- Safe direction: existing local DBs should migrate in place; bundled catalogue refreshes should import/upsert bundled rows and must not replace the durable on-device DB after first install.
- Bundled catalogue refresh now imports/upserts bundled rows in place and does not overwrite user-owned rows where `source != 'bundled'`.
- If a user poem has the same `poem_id` as a bundled poem, the user row is preserved and the bundled row is skipped. This matches the data-preservation rule and should be documented as expected behavior if it appears in later catalogue-sync work.

## Status notes

Verified by independent subagent. Ready for review.
