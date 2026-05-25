# Task: Build My Library UI

## Goal

Add a polished My Library experience for saved poems and user-created poems.

## Context

V2 should make the user library feel like a real consumer feature, not just hidden storage. This UI should support the core loop: read, save, revisit, and manage personal poems.

## Acceptance checks

- [x] Users can navigate to saved poems.
- [x] Saved poems render clearly and can be opened in the reader or a detail view.
- [x] Empty states are calm and useful.
- [x] UI remains responsive on small and large screens.
- [x] `bunx tsc --noEmit` passes.

## Files / areas

likely involved:
- `App.tsx`
- `components/`
- `hooks/`
- `styles/styles.ts`

do not touch:
- Database schema unless the PM confirms missing support from earlier tasks

## Suggested agent

implementation

## Constraints

Keep the app reading-focused and avoid UI bloat. Do not turn this into a marketing landing page.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — PM claimed task

Moved from `ready` to `doing`. Local saved poems and saved sync are in `review`. Investigation will run first; no My Library UI implementation until the investigation result is written into this task file.

### 2026-05-25 — Investigation delegated

Delegated read-only My Library UI investigation to subagent Confucius. Scope: inspect current layout/navigation, saved/user-created APIs, recommend UI states and file changes, and identify verification/manual checks. No edits allowed.

### 2026-05-25 — Investigation completed

Confucius completed read-only investigation. Current app is a single full-screen reader in `App.tsx` with vertical `PagerView`, hidden status bar, and toast overlay; there is no navigation shell or tab structure. Recommendation: add one small My Library overlay button in the reader, likely top-left to balance the save button, and open a full-screen library view managed by `App.tsx` state rather than adding a navigation dependency.

Existing saved APIs are ready: `getLocalSavedPoems` is exported from `lib/poems.ts`; repository query joins `saved_poems` to `poems`, orders by `saved_at desc`, and filters tombstones; save/unsave/toggle path exists through `usePoemFeed` and `App.tsx`. User-created poems are partial only: `addPoem()` writes `source: 'user'`, but there is no dedicated list API and manual creation is a later task. My Library should show a calm `Your Poems` placeholder rather than creation/upload controls.

Recommended UI: reader overlay button with at least 40x40 hit area and accessibility label/hint; full-screen My Library view with title, close/back button, and simple `Saved` / `Your Poems` sections or segmented tabs; saved list rows with title, author, and short preview; saved empty state "No saved poems yet" with an understated line; user poems placeholder; saved rows open a local detail reader view that reuses the current poem rendering pattern rather than injecting arbitrary poems into the random feed. Keep larger screens constrained to readable width and phone layouts full-width.

Files to change: `App.tsx`, `components/` for a `LibraryView` and possibly a reusable poem detail/reader component, and `styles/styles.ts`. Avoid schema/migrations, Supabase sync, Nexus, `assets/poems.db`, `poems.json`, package dependencies, and creation/upload controls.

Verification: `bunx tsc --noEmit`. Manual checks: open/close library from reader; save a poem and confirm it appears; unsave and confirm list updates; open saved poem detail; check empty states; check small and large layouts; verify controls have at least 40x40 hit areas and accessibility labels/hints.

### 2026-05-25 — Implementation delegated

Delegated My Library UI implementation to subagent Godel. Scope: reader overlay button, in-app library view, saved list/detail, and user-created placeholder only. No schema/migrations, Supabase sync, Nexus, generated assets, package dependencies, creation/upload controls, commit, or push. Required check: `bunx tsc --noEmit`.

### 2026-05-25 — Implementation completed

Godel implemented My Library UI. Changed files: `App.tsx`, `components/PoemReaderView.tsx`, `components/LibraryView.tsx`, and `styles/styles.ts`. Behavior added: small top-left Library overlay button in the reader; full-screen in-app My Library overlay managed by `App.tsx` state; Saved and Your Poems segmented tabs; saved list from `getLocalSavedPoems` with compact title/author/preview rows and calm empty state; saved rows open a local detail reader using extracted shared poem rendering; Your Poems is placeholder-only with no creation/upload controls; library refreshes after local save/unsave and saved-sync callbacks. Godel reported `bunx tsc --noEmit` passed.

Manual checks still needed: open/close My Library on simulator/device; save a poem and confirm it appears; open a saved detail and unsave; check empty state and Your Poems placeholder; check small phone and large screen layout for overlap.

### 2026-05-25 — Verification delegated

Delegated independent My Library UI verification to subagent Planck. Scope: inspect UI implementation against acceptance checks, accessibility/hit-area expectations, no out-of-scope schema/sync/package changes, run `bunx tsc --noEmit`, and optionally run a short Expo/Metro smoke. No edits allowed.

### 2026-05-25 — Verification completed

Planck independently verified My Library UI. Verdict: pass; no blocking issues. Code inspection confirmed reader navigation, saved list/detail, calm empty states, accessible controls with 40x40+ hit areas, no Your Poems creation/upload controls, and no task-scope schema/package/generated asset changes. `bunx tsc --noEmit` passed. Metro smoke started in offline CI mode and stopped cleanly; Expo auto-loaded `.env` names during startup, so an env-free smoke was not fully possible through the normal Expo command.

Manual simulator/device checks remain: open/close My Library from reader; save and confirm it appears; open saved detail and unsave; check empty states; inspect small phone and large/tablet layouts for visual overlap.

### YYYY-MM-DD — <what happened>

what was tried. what was learned. what's next.

## Findings

durable facts discovered during this task. promote anything cross-task to `WORKBOOK.md`.

- My Library should be an in-app reader surface, not a new marketing/home screen.
- Saved poem rows should open a local detail reader view first; injecting arbitrary poems into the random feed can wait.
- Until manual poem creation ships, My Library should show a placeholder for user-created poems rather than adding creation/upload controls.
- `getLocalSavedPoems()` omits saved rows whose poem is not present in local `poems`, which is acceptable until sync/import behavior fills those rows.
- My Library can stay app-state managed for now; no navigation dependency is needed for saved-list and local detail reading.
- My Library UI can ship as an app-state overlay using existing local saved APIs; remaining risk is visual/manual verification on simulator/device rather than TypeScript or code structure.

## Status notes

Verified by independent subagent. Ready for review.
