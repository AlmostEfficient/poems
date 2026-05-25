# Task: Add manual poem creation

## Goal

Let users manually add their own poems with title, author, and content, storing them locally first.

## Context

Manual poem creation is the simplest version of the future scanner/import flow. Scanner output should eventually become another path into the same user-created poem model.

## Acceptance checks

- [ ] Users can create a poem locally.
- [ ] User-created poems are stored separately from bundled catalogue poems.
- [ ] User-created poems can appear in My Library.
- [ ] Validation handles empty title/content safely.
- [ ] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `lib/storage/`
- `lib/types.ts`
- `hooks/`
- `App.tsx`
- `components/`

do not touch:
- Nexus scanner integration — this task is manual entry only

## Suggested agent

implementation

## Constraints

Do not require network or sign-in for local manual creation.

## Work log

append-only. dated. one entry per meaningful change.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready after local user-owned data model exists.

