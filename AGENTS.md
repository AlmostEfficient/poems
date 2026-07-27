# Poems App Agent Guide

## What This Project Is

Poems is an Expo React Native app for reading, saving, uploading, and eventually scanning poems and quotes.

The product direction is offline-first: the app should feel instant and useful without a network connection, while cloud services add backup, sync, authentication, entitlements, catalogue updates, and scanner/LLM workflows.

Use Bun for all package and script work. Do not use npm.

## Product Direction

The long-term shape is:

- A larger bundled poem catalogue available offline on first launch.
- User-saved poems that survive app restarts and eventually sync across devices.
- User uploads and scanner imports that become first-class poems in the user's library.
- Nexus for app-isolated Better Auth, D1 cloud sync, LLM scanning/proxying, observability, and support.
- SQLite as the local source of truth for reader performance and offline availability.

Do not treat Nexus/D1 as a replacement for local storage. Remote systems should sync into local storage; the reading experience should primarily consume local data.

## Backend Boundaries

The mobile app calls Nexus for optional authentication and user-data sync. Nexus lives at `/Users/raza/Projects/nexus` and owns Better Auth, the isolated Poems D1 database, Apple credentials, email delivery, scanner work, Eyeball observability, and Hotline support.

Do not put backend or Apple credentials in this repo. SQLite remains the local source of truth for reading and offline writes.

## Architecture Map

- `App.tsx` is the current top-level UI entry for the reader.
- `index.ts` registers the Expo root component.
- `hooks/usePoemFeed.ts` connects React state to the poem feed.
- `lib/services/poemFeedManager.ts` manages virtual feed slots, preloading, cleanup, and source fallback behavior.
- `lib/storage/database.ts` owns SQLite initialization, bundled DB copying, schema setup, and migrations.
- `lib/storage/poemRepository.ts` owns local poem queries and writes.
- `lib/poems.ts` is the public local poem API used by the app.
- `lib/types.ts` contains shared domain types.
- `lib/utils/poemId.ts` creates stable poem IDs.
- `lib/data/starterPoems.ts` is the small instant/fallback starter set, not the main catalogue.
- `lib/auth/` owns the Better Auth Expo client and SecureStore cookie.
- `lib/nexus/` owns authenticated Nexus sync clients.
- `lib/poetry-api.ts` is legacy/optional PoetryDB integration. Do not use it as the pattern for future Nexus or scanner clients.
- `components/` contains reusable UI components.
- `styles/styles.ts` contains current app styles.
- `poems.json` is the editable bundled catalogue source.
- `assets/poems.db` is generated from `poems.json` and shipped with the app.
- `scripts/` contains catalogue, build, version, and ingestion tooling.

## Data Model Direction

Be careful around user-owned data. The current app began as a read-only bundled catalogue, but future work must not delete user saves/uploads during app upgrades.

Prefer a local model that separates:

- Bundled/catalogue poems.
- User poem state such as saved, hidden, favorite, progress, and timestamps.
- User-created poems and scanner imports.
- Sync metadata, remote IDs, checkpoints, and conflict state.
- Entitlement/auth cache.

Before adding major save/upload/sync features, harden the SQLite migration path so bundled catalogue updates do not replace the whole on-device database.

## Common Commands

- Install dependencies: `bun install`
- Start Metro: `bun run start`
- iOS: `bun run ios`
- Android: `bun run android`
- Type-check: `bunx tsc --noEmit`
- Check Expo dependency alignment: `bunx expo install --check`
- Run Expo Doctor: `bunx expo-doctor`
- Check poem JSON format: `bun run check:poems`
- Generate bundled DB: `bun run generate`
- Build helper: `bun run build:app`

## Working Rules

- Always use Bun, never npm.
- Keep the app aligned with Expo-managed package versions. Do not blindly bump React Native packages outside Expo's expected set.
- Do not commit or expose `.env`.
- Keep `poems.json` as the source for bundled poems and regenerate `assets/poems.db` after catalogue changes.
- Treat `assets/poems.db` as generated output.
- Keep new durable architecture notes here high level. Do not use this file as a progress log.
- Prefer small, typed modules for Nexus, scanner, entitlement, and sync clients.
- Avoid coupling network fetches directly to the reader UI. Sync remote data into local storage, then render from local repositories.

## Current Technical Baseline

The app is on the current Expo SDK 56 baseline with Expo-managed dependency versions. If changing versions, verify with:

```bash
bunx expo install --check
bunx expo-doctor
bunx tsc --noEmit
```
