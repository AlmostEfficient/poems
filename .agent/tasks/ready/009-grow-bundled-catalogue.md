# Task: Grow bundled catalogue

## Goal

Expand the bundled poem catalogue while keeping data quality, stable IDs, and app startup performance intact.

## Context

V2 should feel more complete out of the box. The bundled catalogue is the offline seed; Supabase can later provide updates and additional remote catalogue data.

## Acceptance checks

- [ ] New poems are added to `poems.json` with stable IDs and valid metadata.
- [ ] `bun run check:poems` passes.
- [ ] `bun run generate` succeeds.
- [ ] The reader still loads quickly with the larger catalogue.
- [ ] Any copyright/source concerns are documented.

## Files / areas

likely involved:
- `poems.json`
- `assets/poems.db`
- `scripts/`
- `FEATURED_POEMS.md`

do not touch:
- User-owned data schema unless required for catalogue safety

## Suggested agent

implementation

## Constraints

Use `poems.json` as the source of truth and treat `assets/poems.db` as generated output.

## Work log

append-only. dated. one entry per meaningful change.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

## Status notes

ready for PM delegation after catalogue/update safety is clear.

