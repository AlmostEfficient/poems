# Task: Harden SQLite migrations

## Goal

Ensure app upgrades and bundled catalogue refreshes cannot delete user-owned saved or uploaded poems.

## Context

This is the foundation for V2. The app began as a read-only bundled catalogue, but V2 introduces saved poems, user-created poems, Supabase sync, and scanner imports. User-owned data must survive schema changes and bundled catalogue updates.

## Acceptance checks

- [ ] Current SQLite initialization and bundled DB copy behavior is documented in the task work log.
- [ ] A safe migration/update approach is implemented or clearly staged so user-owned data is preserved.
- [ ] Catalogue data and user-owned state are not coupled in a way that requires full DB replacement.
- [ ] `bunx tsc --noEmit` passes.

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

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready for PM delegation.

