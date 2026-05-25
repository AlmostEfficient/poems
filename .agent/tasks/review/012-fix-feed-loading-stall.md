# Task: Fix feed loading stall

## Goal

Fix the reader feed bug where swiping through several poems can land on a permanent `Loading poem...` page.

## Context

User observed 7 poems render, then the 8th page stays on `Loading poem...` permanently on a physical iPhone. This is a core reader regression and should be fixed before continuing cloud/auth follow-up work.

Initial local suspicion: the feed manager has a single global `isLoading` guard in `PoemFeedManager.loadSlots()`. If the user swipes while a preload is in flight, later page selections can return without scheduling the newly visible slot, leaving a virtual slot empty/loading until another trigger happens.

Screen visibility note: Expo/Metro logs are visible from physical-device runs. Direct phone screen inspection through iPhone Mirroring is currently blocked by the Mac login prompt, so runtime verification may need logs/container state unless the mirror is unlocked.

## Acceptance checks

- [ ] Root cause is written into this task before implementation.
- [ ] Swiping beyond the initial starter poems does not leave a permanent `Loading poem...` page.
- [ ] Feed remains offline/local-first and does not depend on remote PoetryDB/Supabase.
- [ ] `bunx tsc --noEmit` passes.
- [ ] Physical-device runtime smoke is attempted with Expo logs.

## Files / areas

likely involved:
- `lib/services/poemFeedManager.ts`
- `hooks/usePoemFeed.ts`
- `App.tsx`
- `components/PoemReaderView.tsx`

do not touch:
- `.env`
- Supabase migrations/auth unless directly relevant
- catalogue content unless required to reproduce

## Suggested agent

investigation then implementation

## Constraints

Keep the fix narrow. Preserve virtualized feed behavior and local SQLite as the primary source.

## Work log

append-only. dated. one entry per meaningful change.

### 2026-05-25 — Task created

Created after user reported a physical-device reader stall: 7 poems display, then the 8th page permanently shows `Loading poem...`.

### 2026-05-25 — Investigation delegated

Delegated to a subagent to inspect the feed manager, hook scheduling, and rendering path. No implementation should happen until the investigation result is recorded here.

### 2026-05-26 — Investigation completed

Galileo found the root cause: `PoemFeedManager.loadSlots()` returns immediately when `this.isLoading` is true, so page/window load requests made during an in-flight preload are dropped rather than queued. `usePoemFeed.loadAroundIndex()` does not know the request was skipped, and if the user lands on the skipped page and stops swiping, no retry is scheduled. `App.tsx` renders every virtual slot, and any null `slot.poem` displays `LoadingPoemReaderView`, so the dropped load appears as a permanent `Loading poem...` page.

Recommended narrow fix: make `PoemFeedManager.loadSlots()` coalesce skipped requests. Add a pending-index queue; when a load is already in flight, merge requested indices into that queue. After the current load finishes, drain queued indices so visible empty slots are loaded without relying on another page swipe.

### 2026-05-26 — Implementation delegated

Delegated a narrow feed-manager fix to a worker subagent. Scope: update `lib/services/poemFeedManager.ts` and only touch hook/render files if needed. Required check: `bunx tsc --noEmit`.

### 2026-05-26 — Implementation completed

Russell updated `lib/services/poemFeedManager.ts` with a pending-index queue for `loadSlots()`. Requests made while a load is in flight are now coalesced into `pendingLoadIndices`; the active load drains queued indices before clearing the loading guard. Russell reported `bunx tsc --noEmit` passed.

### 2026-05-26 — PM verification

PM verification passed `bunx tsc --noEmit`. Added an ad hoc scheduler simulation with concurrent `loadSlots()` calls; it confirmed slots 8 through 16 load when a second request arrives during an in-flight request. Physical iPhone build/install/launch succeeded with `bun run ios -- --device "Raza’s beater"` and `xcrun devicectl device process launch --terminate-existing --activate com.raza.poems`.

Direct visual E2E is still limited because iPhone Mirroring is locked behind the Mac login prompt, so the PM agent cannot swipe the device screen directly from tools.

## Findings

- `PoemFeedManager.loadSlots()` currently drops requested indices while `isLoading` is true.
- Page changes are the main retry trigger; stopping on a skipped empty slot can leave it permanently null.
- The first empty slots after starter poems depend on successful load scheduling from the local SQLite catalogue.

## Status notes

- Ready for review. Physical build/install/launch passed; direct screen swipe confirmation still needs unlocked iPhone Mirroring or user confirmation.
