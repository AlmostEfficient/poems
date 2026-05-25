# Task: Design Supabase schema and RLS

## Goal

Design the Supabase schema and Row Level Security policies for V2 cloud data: catalogue poems, user poems, saved poems, profiles, and sync metadata.

## Context

The mobile app may call Supabase directly for client-safe auth, catalogue reads, user poems, saved poems, and sync under RLS. Nexus owns privileged service-role operations and LLM/scanner work.

## Acceptance checks

- [ ] Proposed tables and relationships are documented.
- [ ] RLS policy intent is documented for public catalogue reads and user-owned private data.
- [ ] The design clearly separates client-safe Supabase access from Nexus-only privileged operations.
- [ ] Any generated migrations are reviewed for service-role credential safety.

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

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready for PM delegation.

