# Task: Add app Supabase client and auth baseline

## Goal

Add a client-safe Supabase integration for the mobile app, including typed client setup and the first auth baseline for V2.

## Context

The app should be able to use Supabase directly for client-safe work under RLS. Sign-in should support the product direction without forcing account creation before the reader is useful.

## Acceptance checks

- [ ] Supabase client reads only client-safe config.
- [ ] No service-role secrets are added to the repo.
- [ ] Type generation or a clear type strategy exists.
- [ ] Initial auth/session handling is documented or implemented.
- [ ] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `lib/`
- `hooks/`
- `supabase/`
- `package.json`
- `.env.example`

do not touch:
- `.env` — local-only values
- `/Users/raza/Projects/nexus` — not needed for client auth setup

## Suggested agent

implementation

## Constraints

Use Bun for dependency changes. Keep the reader usable without signing in.

## Work log

append-only. dated. one entry per meaningful change.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready for PM delegation after schema direction is clear.

