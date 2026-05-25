# Task: Add local saved poems

## Goal

Let users save and unsave poems locally, with saved state stored in SQLite and available offline.

## Context

V2's core loop is read poems, save meaningful ones, and trust that the library persists. Local saved state should work before cloud sync is layered on.

## Acceptance checks

- [ ] SQLite has a durable local representation for saved poems.
- [ ] Repository APIs can save, unsave, and list saved poems.
- [ ] Saved state survives app restart.
- [ ] User-owned save state is separated from bundled catalogue rows.
- [ ] `bunx tsc --noEmit` passes.

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

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready for PM delegation after SQLite migration hardening.

