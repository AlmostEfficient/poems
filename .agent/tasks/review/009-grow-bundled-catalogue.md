# Task: Grow bundled catalogue

## Goal

Expand the bundled poem catalogue while keeping data quality, stable IDs, and app startup performance intact.

## Context

V2 should feel more complete out of the box. The bundled catalogue is the offline seed; Supabase can later provide updates and additional remote catalogue data.

## Acceptance checks

- [x] New poems are added to `poems.json` with stable IDs and valid metadata.
- [x] `bun run check:poems` passes.
- [x] `bun run generate` succeeds.
- [x] The reader still loads quickly with the larger catalogue.
- [x] Any copyright/source concerns are documented.

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

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. Catalogue/update safety is available from task 001 in `review`. Investigation will run first to inspect current catalogue structure, scripts, quality rules, and safe public-domain/source approach before editing `poems.json` or generated DB output.

### 2026-05-25 — Investigation delegated

Delegated read-only catalogue investigation to subagent Goodall. Scope: inspect catalogue structure, validation/generation scripts, stable ID rules, source/copyright approach, safe size/scope, and verification commands. No edits or generation allowed.

### 2026-05-25 — Investigation completed

Goodall completed read-only investigation. Current catalogue: `poems.json` has 67 poems, 57 English and 10 Urdu; `assets/poems.db` also has 67 poems and is about 84K. Entries require `id`, `title`, `author`, `content`, and `language`; optional `source` defaults to `bundled`; optional metadata can include `tags`, `themes`, `moods`, `form`, `era`, and `length`. All entries have `length`, but metadata richness is uneven. Four near-duplicate title/author pairs already exist with different content/IDs.

Validation/generation: `bun run check:poems` passes currently and checks required fields, `language` as `en|ur`, optional source/metadata shape, duplicate IDs as errors, and exact title+author+content duplicates as warnings. `bun run generate` recreates `assets/poems.db` from `poems.json`, defaults missing source to `bundled`, and writes bundled DB `metadata.db_version = 4`. Runtime DB version is now 7, so the generator metadata is behind runtime migrations; implementation should either update the generator version or consciously stage it.

Stable IDs come from `lib/utils/poemId.ts`: slugged author/title/language plus an 8-hex hash over title, author, language, and normalized content. Editing title, author, language, or content changes IDs, and IDs are user-facing because saves/sync use `poem_id`; existing IDs should not be changed casually.

Source/copyright approach: add only clearly U.S. public-domain works unless rights are documented. I verified the current U.S. Copyright Office Circular 15A, revised April 2026, states works published in the United States before January 1, 1931 are public domain. Project Gutenberg can be used as a source reference for U.S. public-domain text, but its boilerplate/trademark/license text must not be copied into poem content. Do not use PoetryDB as the sole copyright basis. Current catalogue already includes some likely modern/non-public-domain works; this task should not expand that risk.

Recommended scope: add a conservative first batch of 40-60 mostly short/medium public-domain English poems, not hundreds. Existing startup imports/upserts bundled rows linearly on existing-DB startup, so jumping from 67 to roughly 120 is low risk; a much larger catalogue should wait until bundled import is gated by catalogue version/checkpoint.

Implementation files: `poems.json`, optionally `FEATURED_POEMS.md`, maybe `scripts/generate_poems_db.ts` if updating generated DB version, and generated `assets/poems.db` after `bun run generate`. Verification: `bun run check:poems`, `bun run generate`, `bunx tsc --noEmit`, plus optional sqlite count/language/metadata sanity.

### 2026-05-25 — Implementation delegated

Delegated catalogue expansion to subagent Archimedes. Scope: add conservative public-domain English batch to `poems.json`, document source/copyright basis, optionally align generator DB metadata version, regenerate `assets/poems.db`, and run required checks. No user-owned schema changes, modern/unclear-copyright works, commit, or push.

### 2026-05-25 — Implementation completed

Added 45 conservative English public-domain poems to `poems.json`: 30 by Sara Teasdale from `Flame and Shadow` (1920) and 15 by Edna St. Vincent Millay from `A Few Figs from Thistles` (1920). Source text was referenced from Project Gutenberg ebooks 591 and 4399; only poem text was copied into catalogue entries, with Gutenberg boilerplate/license/trademark text excluded. Copyright basis: U.S. publications before January 1, 1931 are public domain in the United States as of 2026.

Generated stable IDs for all new entries using the local `createPoemId`/`ensureUniquePoemId` rules. Existing poem IDs and existing catalogue entries were preserved. New entries are all `language = en`, all short/medium, and include richer metadata for length, tags, themes, moods, form, and era.

Updated `scripts/generate_poems_db.ts` generated `DB_VERSION` from 4 to 7 to align generated asset metadata with the current runtime SQLite `DB_VERSION = 7`; this is metadata alignment only, not a schema behavior change. Regenerated `assets/poems.db` from `poems.json`.

Verification passed: `bun run check:poems`, `bun run generate`, and `bunx tsc --noEmit`. Read-only sqlite sanity check reported 112 total bundled poems, language split `en = 102` and `ur = 10`, length buckets `short = 55`, `medium = 55`, `long = 2`, `source = bundled` for all 112 rows, no missing length metadata, and generated DB `metadata.db_version = 7`.

### 2026-05-25 — Verification delegated

Delegated independent catalogue verification to subagent Feynman. Scope: rerun catalogue checks/generation/type-check, inspect generated DB counts/version, confirm source/copyright documentation, check for obvious Gutenberg boilerplate, and attempt startup smoke if practical. No edits allowed.

### 2026-05-25 — Verification completed

Feynman independently verified task 009. Verdict: pass; no blocking issues. Verified 112 total poems, 45 added poems, language split `en = 102` and `ur = 10`, existing first 67 IDs preserved, all IDs unique, added metadata complete, no obvious Gutenberg boilerplate/license/trademark strings in poem content, source/copyright documentation present, generated DB version 7, and no user-owned schema introduced by generator. Commands passed: `bun run check:poems`, `bun run generate`, and `bunx tsc --noEmit`. Immutable SQLite read confirmed 112 bundled rows, length buckets `short = 55`, `medium = 55`, `long = 2`, `db_version = 7`, and tables `poems`, `sqlite_sequence`, `metadata`. Metro startup smoke passed with `EXPO_NO_DOTENV=1` on port 8099.

Non-blocking follow-up: Metro startup smoke does not prove full simulator reader render or on-device scroll/feed performance.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- Bundled catalogue imports currently scale linearly on existing-DB startup because all bundled rows are refreshed from the asset DB during initialization.
- Catalogue expansion should be limited to clearly U.S. public-domain works unless rights are documented.
- `poem_id` is durable user-facing identity; catalogue edits must not regenerate existing IDs casually.
- Generator `DB_VERSION = 4` is behind runtime `DB_VERSION = 7`; generated DB metadata should be aligned or consciously staged.
- U.S. Copyright Office Circular 15A, revised April 2026, states works published in the United States before January 1, 1931 are public domain.
- Project Gutenberg source text can be used carefully for U.S. public-domain works, but Gutenberg boilerplate/trademark/license text should not be copied into poem content.
- This task's catalogue expansion added only English poems from two U.S. 1920 public-domain collections: Sara Teasdale's `Flame and Shadow` and Edna St. Vincent Millay's `A Few Figs from Thistles`.
- Generated bundled DB metadata is now aligned to runtime `DB_VERSION = 7`.
- Full simulator reader render/performance remains optional follow-up; Metro startup passed with the larger catalogue.

## Status notes

Verified by independent subagent. Ready for review.
