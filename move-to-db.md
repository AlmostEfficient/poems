
• Phase 1 — Supabase Foundation

  - Spin up project, create poems table (id/title/author/content/language/source/metadata/version/
    timestamps) plus optional poem_collections, and enable RLS with anon read-only policies while
  keeping
    inserts/updates behind service-role keys or Edge Functions.
  - Generate SQL migration + seed script that pushes your full corpus (minus the ~20 bundled) into
    Supabase; wire it into CI or a npm run supabase:seed workflow so updates stay reproducible.
  - Store large text in plain columns; add indexes on language, source, updated_at to support delta
  syncs.

  Phase 2 — Synchronization Pipeline

  - Decide on sync contract: e.g. expose updated_at > ? filter using Supabase JS client or a custom
  RPC/
    Edge function that returns batches (with pagination) and a lastSyncedAt watermark.
  - Write a one-time migration script that reads current poems.json/SQLite and POSTs to Supabase,
    recording the highest updated_at for future incremental runs.
  - Add basic metrics/logging (console + Supabase logs) so you can audit how many poems sync per
  run and
    catch failures early.

  Phase 3 — App Refactor (Client)

  - Keep ~20 poems packaged (SQLite or embedded JSON) and tag them source='bundled'.
  - On first launch: run a new initializeRemotePoems() that calls Supabase, streams poems into local
    SQLite in batches, and persists a poems_sync_checkpoint table so you can resume.
  - Update usePoemFeed to: (1) serve bundled poems immediately, (2) kick off background sync if the
    checkpoint is stale, (3) mark remote poems as source='remote', and (4) surface progress/errors
  via
    Toast/logs.
  - Add retry/backoff + reachability checks; fall back gracefully when offline (just show local
  poems).

  Phase 4 — Tooling & Maintenance

  - Extend your existing ingestion tooling to push new poems straight to Supabase (instead of
  poems.json),
    still running through your formatter for normalization/ID generation.
  - Implement a nightly/CI job that runs the format checker against Supabase data (pull via API,
  run the
    same validation you wrote earlier).
  - Document developer workflows: local Supabase .env usage, how to run seeding scripts, how to
  promote
    data to production.

  Phase 5 — QA & Rollout

  - Smoke-test fresh installs: verify bundled poems appear instantly, remote sync populates the rest,
  and
    total counts match Supabase.
  - Test offline/airplane-mode behavior, sync resumption after failure, and app upgrades with an
  existing
    local DB.
  - Once stable, remove the giant poems.json from the bundle (keep only the curated 20) and update
    deployment notes so future poem additions happen via Supabase instead of app releases.

  Natural follow-ups: define schema migrations for future metadata fields, add a background cron
  (Supabase
  scheduled function) to prune/flag bad entries, or build an admin UI for curating poems directly in
  Supabase Studio.


  To continue this session, run codex resume 0199fa89-a350-7320-b443-1ade0df069d7