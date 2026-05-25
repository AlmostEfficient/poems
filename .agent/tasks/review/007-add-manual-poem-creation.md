# Task: Add manual poem creation

## Goal

Let users manually add their own poems with title, author, and content, storing them locally first.

## Context

Manual poem creation is the simplest version of the future scanner/import flow. Scanner output should eventually become another path into the same user-created poem model.

## Acceptance checks

- [x] Users can create a poem locally.
- [x] User-created poems are stored separately from bundled catalogue poems.
- [x] User-created poems can appear in My Library.
- [x] Validation handles empty title/content safely.
- [x] `bunx tsc --noEmit` passes.

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

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. My Library UI is in `review`; local saved/sync infrastructure is in `review`. Investigation will run first to define the manual user-poem model and UI path before implementation.

### 2026-05-25 — Investigation delegated

Delegated read-only manual poem creation investigation to subagent Meitner. Scope: inspect current user-created poem support, recommend local model/API, UI flow, validation, My Library integration, and verification. No edits allowed.

### 2026-05-25 — Investigation completed

Meitner completed read-only investigation. Current support is partial: `poems.source = 'user'` already exists, `insertPoem()` defaults to `source: 'user'`, and `addPoem()` exists in `lib/poems.ts`, but it returns `void`, has no validation/normalization, and there is no user-poem list API. My Library has a `Your Poems` placeholder only.

Recommended data/API approach: use the existing `poems` table with `source = 'user'` for this task. Bundled catalogue refreshes preserve `source != 'bundled'`, so no SQLite schema change is needed for first manual creation. Add explicit local APIs: `createLocalUserPoem(input): Poem` and `getLocalUserPoems({ limit, offset }): Poem[]`. Ignore sync metadata, soft deletes, edit history, and remote IDs for now; task 008 owns user-created sync.

Recommended UI flow: add manual creation inside My Library's `Your Poems` tab, not the main reader feed. Replace the placeholder with an empty state and one small Add button. Add opens an in-library form with title, author, and content. Trim fields on submit; content is required and should show an inline error if blank; title defaults to `Untitled`; author defaults to `Anonymous`. After save, refresh `Your Poems` and open the new poem in the existing local detail reader.

Reader/library behavior: list local `source = 'user'` rows newest first; rows match saved rows with title, author, and preview; opening a user poem reuses `PoemReaderView`; do not inject user poems into the random feed. Hide save/star behavior for user-created poem detail for now because current save APIs default to catalogue scope unless scoped save behavior is threaded explicitly.

Files to change: `lib/storage/poemRepository.ts`, `lib/poems.ts`, `components/LibraryView.tsx`, and `styles/styles.ts`. Avoid Nexus scanner integration, Supabase sync, `assets/poems.db`, `poems.json`, package dependencies, lockfile, and migrations unless a hard blocker appears.

Verification: `bunx tsc --noEmit`. Manual checks: open My Library -> Your Poems; create poem with title/author/content; create with blank title/author and verify fallbacks; attempt blank content and verify inline error/no saved row; restart and verify created poem remains; open created poem detail; check small phone keyboard/form layout; confirm no network/sign-in required.

### 2026-05-25 — Implementation delegated

Delegated manual poem creation implementation to subagent Mencius. Scope: local user-poem APIs and My Library `Your Poems` create/list/detail flow only. No Nexus scanner, Supabase sync/network, schema/migrations, generated assets, package changes, random-feed injection, commit, or push. Required check: `bunx tsc --noEmit`.

### 2026-05-25 — Implementation completed

Mencius implemented local manual poem creation. Changed files: `lib/storage/poemRepository.ts`, `lib/poems.ts`, `components/LibraryView.tsx`, and `styles/styles.ts`. Behavior added: `createLocalUserPoem(input): Poem` and `getLocalUserPoems({ limit, offset }): Poem[]`; manual poems trim fields, store locally with `source = 'user'`, and use title/author fallbacks `Untitled` and `Anonymous`; blank content is rejected with inline validation in My Library -> Your Poems; Your Poems now has Add button, empty state, local list rows, and an in-library creation form; after save, Your Poems refreshes and opens the new poem in local detail reader; save/star controls are hidden for user-created poem detail. Mencius reported `bunx tsc --noEmit` passed.

Manual checks still needed: create a poem and confirm it opens; blank title/author fallbacks; blank content error/no row; restart persistence; small-phone keyboard layout and large-screen layout.

### 2026-05-25 — Verification delegated

Delegated independent manual poem creation verification to subagent Pauli. Scope: inspect local APIs, My Library creation/list/detail flow, validation behavior, no out-of-scope schema/sync/package/generated changes, and run `bunx tsc --noEmit`. No edits allowed.

### 2026-05-25 — Verification failed

Pauli verified that `bunx tsc --noEmit` passes and that manual poem creation, validation, My Library listing, local detail opening, and hidden save/star controls are implemented. Blocking issue: user-created poems are still eligible for the main random feed because `getRandomPoems()` selects from all `poems` rows, only filtering by language. Since manual poems are stored in the same table with `source = 'user'`, they can enter the reader feed via `usePoemFeed`. This violates the task decision that created poems should open in local detail and not be injected into the random feed.

Fix needed: exclude `source = 'user'` from the random reader feed/catalogue query while keeping explicit user-poem list APIs intact.

### 2026-05-25 — Feed-boundary fix delegated

Delegated targeted fix to subagent Gibbs. Scope: exclude `source = 'user'` from the random reader feed/catalogue query only. No schema/migrations, Supabase sync, Nexus, package, generated asset, or catalogue changes. Required check: `bunx tsc --noEmit`.

### 2026-05-25 — Feed-boundary fix completed

Gibbs updated `lib/storage/poemRepository.ts` so `getRandomPoems()` excludes `source = 'user'` for both language-scoped and unscoped random reader feed queries. Explicit user-poem APIs remain unchanged. Gibbs reported `bunx tsc --noEmit` passed.

### 2026-05-25 — Re-verification delegated

Delegated re-verification to subagent Popper. Scope: verify manual creation acceptance checks again, including the random feed exclusion fix, no out-of-scope changes, and `bunx tsc --noEmit`. No edits allowed.

### 2026-05-25 — Re-verification passed

Popper confirmed manual poem creation APIs/UI, `source = 'user'` separation, My Library visibility, blank content validation, and random feed exclusion. `bunx tsc --noEmit` passed. No blocking issues remain. Manual simulator checks remain: My Library -> Your Poems creation, blank title/author fallbacks, blank content error, restart persistence, and small-phone keyboard layout.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- Manual user-created poems can use local `poems.source = 'user'` as the staged local model; no schema change is needed for first manual creation.
- User-created poem UI belongs inside My Library's `Your Poems` tab, not in the main reader feed.
- Created poems should open in local detail reader first; random-feed injection can wait.
- Saving/star behavior for user-created poems should wait until save APIs are fully scoped with `poemScope = 'user'`.
- Exact duplicate title/author/content may resolve to the existing poem ID through current insert behavior; acceptable for now unless product wants duplicate drafts later.
- Manual user poems can ship without schema changes, but future edit/delete/sync work should add explicit created/updated metadata rather than relying on row id ordering.
- Reader feed random catalogue queries must exclude `source = 'user'`; user-created poems should be reachable through My Library/local detail only until product explicitly adds a feed mode for personal poems.

## Status notes

Verified by independent subagent. Ready for review.
