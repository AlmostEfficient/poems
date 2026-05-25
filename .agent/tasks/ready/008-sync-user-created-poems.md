# Task: Sync user-created poems

## Goal

Sync manually created user poems between local SQLite and Supabase for signed-in users.

## Context

User-created poems should survive reinstall and device changes. This task extends the sync foundation from saved poems to full user-owned poem records.

## Acceptance checks

- [ ] Signed-in users can upload local user-created poems to Supabase.
- [ ] Signed-in users can restore user-created poems from Supabase.
- [ ] Local edits/deletes have documented sync behavior.
- [ ] RLS prevents cross-user access.
- [ ] `bunx tsc --noEmit` passes.

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

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready after manual poem creation and Supabase schema/auth are in place.

