# Task: Design Supabase schema and RLS

## Goal

Design the Supabase schema and Row Level Security policies for V2 cloud data: catalogue poems, user poems, saved poems, profiles, and sync metadata.

## Context

The mobile app may call Supabase directly for client-safe auth, catalogue reads, user poems, saved poems, and sync under RLS. Nexus owns privileged service-role operations and LLM/scanner work.

## Acceptance checks

- [x] Proposed tables and relationships are documented.
- [x] RLS policy intent is documented for public catalogue reads and user-owned private data.
- [x] The design clearly separates client-safe Supabase access from Nexus-only privileged operations.
- [x] Any generated migrations are reviewed for service-role credential safety.

## Files / areas

likely involved:
- `supabase/`
- `.agent/WORKBOOK.md`
- `AGENTS.md`

do not touch:
- `.env` — do not expose credentials
- `/Users/raza/Projects/nexus` unless the PM explicitly delegates backend work there

## Suggested agent

investigation

## Constraints

Do not build app UI in this task. Do not put Supabase service-role credentials in this repo.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. Investigation will run first; no schema files, migrations, or app code should be changed until the investigation result is written into this task file.

### 2026-05-25 — Investigation delegated

Delegated read-only schema/RLS investigation to subagent McClintock. Scope: inspect current Supabase repo state, align with local data model, propose tables/relationships and RLS intent, and document client-safe versus Nexus-only boundaries. No edits allowed.

### 2026-05-25 — Investigation completed and design documented

McClintock completed read-only investigation. Current Supabase state: `supabase/` exists with local CLI config only; no migrations, schema SQL, seed file, generated types, or app Supabase client are present. `supabase/.temp/` exists and is ignored by `supabase/.gitignore`; project-ref contents were not read. `package.json` does not include `@supabase/supabase-js`.

Design recommendation: use Supabase UUID primary keys for remote rows while preserving local `poem_id` as the stable sync/catalogue identity.

Proposed tables:

- `profiles`: `user_id uuid primary key references auth.users(id)`, display/preferences fields, timestamps.
- `catalogue_poems`: public/admin-managed poems with `id uuid primary key`, `poem_id text unique not null`, `title`, `author`, `content`, `language`, `metadata jsonb`, `status`, `version`, `created_at`, `updated_at`; index `poem_id`, `language`, `updated_at`, and `status`.
- `user_poems`: user-created/manual/scanner poems with `id uuid primary key`, `user_id uuid references auth.users(id)`, `poem_id text not null`, poem fields, `metadata jsonb`, `origin`, `deleted_at`, timestamps, unique `(user_id, poem_id)`.
- `saved_poems`: user save/favorite state with `id uuid primary key`, `user_id uuid references auth.users(id)`, `poem_id text not null`, `poem_scope text not null`, `saved_at`, `updated_at`, `deleted_at`, optional `note`, `favorite`, `tags jsonb`, unique `(user_id, poem_scope, poem_id)`.
- `sync_checkpoints`: per-user/per-domain cursors with `user_id uuid references auth.users(id)`, `scope`, `last_pulled_at`, `last_pushed_at`, `cursor jsonb`, primary key `(user_id, scope)`.

Soft delete means keeping a row with `deleted_at` set instead of physically deleting it so other devices can reconcile deletions during sync.

RLS intent:

- `catalogue_poems`: anonymous and authenticated clients may select only `status = 'published'`; no client inserts, updates, or deletes; writes are Nexus/admin/service-role only.
- `profiles`: authenticated users may select, insert, and update only their own row where `user_id = auth.uid()`; no cross-user reads.
- `user_poems`: authenticated users may CRUD only rows where `user_id = auth.uid()`; prefer soft deletes; clients cannot set another user's `user_id`.
- `saved_poems`: authenticated users may CRUD only rows where `user_id = auth.uid()`; saved rows reference `poem_id` plus `poem_scope` rather than requiring a direct FK because catalogue and user poems share the local sync identity.
- `sync_checkpoints`: authenticated users may read/write only their own checkpoint rows; checkpoints are client-safe per-user bookkeeping, not authority.

Boundary:

- Client-safe Supabase: auth/session, reading published catalogue rows, syncing own `saved_poems`, syncing own `user_poems`, reading/updating own profile, and own sync checkpoints.
- Nexus-only privileged work: service-role Supabase access, catalogue imports/curation/admin updates, scanner/LLM workflows, privileged repair/backfill jobs, observability/support workflows, and anything that bypasses RLS.

Migration recommendations: add migrations under `supabase/migrations/` later. First migration should create tables, indexes, timestamp triggers, enable RLS, and define policies. Catalogue seed/import should be separate and keep service-role use in Nexus or local admin tooling outside client runtime. Generated Supabase types can be added after migrations exist and must contain no secrets. `supabase/config.toml` references `./seed.sql`; add that intentionally later or update config when migrations are created. No generated migrations exist in this task, so there are no service-role credentials to review.

### 2026-05-25 — Verification delegated

Delegated independent verification to subagent Plato. Scope: check documented design against acceptance criteria and project constraints. No edits allowed.

### 2026-05-25 — Verification completed

Plato verified the documented Supabase schema/RLS design against acceptance checks and project constraints. Verdict: pass; no blocking issues. Evidence: proposed tables and relationships are documented; RLS intent covers public catalogue reads and user-owned private data; client-safe Supabase access is separated from Nexus-only privileged operations; no generated migrations exist, so no service-role credentials are present to review.

Non-blocking implementation notes for future migration work: insert/update policies should include `WITH CHECK (user_id = auth.uid())`, not only `USING`; `poem_scope` should become a constrained value such as `catalogue` or `user`; any local admin tooling must stay outside app runtime and must not store service-role credentials in this repo.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- `supabase/` currently contains local CLI config but no migrations, schema SQL, seed file, generated types, or app Supabase client.
- Cloud schema should preserve local `poem_id` as the stable sync identity; Supabase UUIDs are remote row identifiers only.
- Public catalogue data should be read-only to clients; catalogue writes belong to Nexus/admin/service-role workflows.
- User saves and user-created poems should use per-user RLS plus soft deletes so offline devices can reconcile deletions later.
- Supabase mirrors and syncs local user data; SQLite remains the reader source of truth.
- Independent verification found no generated migrations, schema SQL, seed file, generated Supabase types, or app Supabase client in the repo. Existing design is documentation-only and contains no service-role credentials.
- Future Supabase insert/update RLS policies for user-owned tables should include `WITH CHECK (user_id = auth.uid())` to prevent cross-user writes.

## Status notes

Verified by independent subagent. Ready for review.
