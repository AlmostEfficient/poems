# Poems App

An offline-first React Native experience for exploring poetry instantly, with optional online enrichment. The app ships a bundled SQLite catalogue, renders a swipeable reader, and can pull additional poems from remote sources without ever blocking the first frame.

## Architecture Overview

- **UI layer (`App.tsx`)** keeps rendering logic and pager behaviour isolated from data fetching.
- **State hook (`hooks/usePoemFeed.ts`)** bridges React with the feed manager, handling lifecycle, source switching, and slot prefetch orchestration.
- **Feed service (`lib/services/poemFeedManager.ts`)** owns virtual slot management, hydration, cleanup, and fetch fallback logic.
- **Data storage (`lib/storage/*`)** exposes a versioned SQLite initialiser and typed repository API for queries, pagination, and inserts.
- **Domain types & starter set (`lib/types.ts`, `lib/data/starterPoems.ts`)** keep all layers in sync on the poem model and ensure instant first paint.
- **API client (`lib/poetry-api.ts`)** provides optional online or hybrid sources without affecting baseline offline behaviour.

This structure leaves clear seams for future Supabase integration (user favourites, uploads) by adding parallel repositories and syncing modules without touching the presentation layer.

## Common Commands

| Purpose | Command |
| --- | --- |
| Install dependencies | `bun install` |
| Start Metro bundler | `bun run start` |
| Launch iOS simulator | `bun run ios` |
| Launch Android emulator | `bun run android` |
| Type-check project | `bunx tsc --noEmit` |
| Regenerate bundled database from `poems.json` | `bun run generate` |
| Run the build + submit workflow | `bun run build:app -- --bump patch --submit` |
| Import sample CSV into the DB (development) | `bun run import` |

## Release Workflow

Run the orchestrated helper to refresh the bundled database, optionally bump versions, build with EAS, and (optionally) submit the latest binary:

```bash
# Patch bump + iOS production build + App Store submit
bun run build:app -- --bump patch --submit

# Android preview build without version bump
bun run build:app -- --platform android --profile preview --no-bump

# Just refresh poems.db and bump version (no build)
bun run build:app -- --skip-build --bump minor
```

Flags:
- `--platform <ios|android|all>` – match your `eas.json` profiles.
- `--profile <name>` – select the EAS build profile.
- `--bump <major|minor|patch>` / `--no-bump` – keep app.json & package.json in sync.
- `--skip-generate` – reuse the existing `assets/poems.db`.
- `--skip-build` – run prep steps only (useful on CI when building elsewhere).
- `--submit` – run `eas submit --latest` after a successful build.
- `--dry-run` – log commands without executing.

## Testing & Verification

1. **Regenerate the bundled catalog (optional but recommended)**
   ```bash
   bun run generate
   ```
2. **Type-check** the project to ensure the new boundaries stay sound:
   ```bash
   bunx tsc --noEmit
   ```
3. **Run the app** via Metro (`bun run start`) and open it on a device/emulator.
4. **Manual smoke test**
   - Verify the initial poems display instantly with no “Loading” placeholders.
   - Swipe vertically >20 slots to confirm new poems load instead of repeating “Loading poem…”.
   - Toggle the source selector (💾 / 🌐+💾 / 🌐) and ensure the feed resets immediately, then hydrates once the database is ready.
5. **Resetting the sandbox** (e.g., to see a refreshed `poems.db`): uninstall the app or clear the Expo sandbox so the versioned DB copies over on next launch.

## Further Development Notes

- The bundled database uses a `metadata` table with `db_version`. Bump `DB_VERSION` in `lib/storage/database.ts` when you ship a new asset so existing installs receive it.
- Future Supabase features can plug into the existing feed via additional repositories and a sync layer without touching `App.tsx`.
- Keep new scripts under `scripts/` and register them in `package.json` for CI visibility.
