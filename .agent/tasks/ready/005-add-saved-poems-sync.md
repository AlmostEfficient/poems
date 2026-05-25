# Task: Add saved poems sync

## Goal

Sync saved poems between local SQLite and Supabase for signed-in users.

## Context

Cloud sync makes saved poems survive reinstall and device changes. The local database should remain the immediate source of truth, with Supabase used for backup/restore and cross-device state.

## Acceptance checks

- [ ] Local save/unsave works offline and queues or reconciles with Supabase later.
- [ ] Signed-in users can restore saved poem state from Supabase.
- [ ] Sync rules are documented for create/update/delete and conflict behavior.
- [ ] RLS prevents users from reading or writing another user's saved poem state.
- [ ] `bunx tsc --noEmit` passes.

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

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready after local saved poems and Supabase auth/schema are in place.

