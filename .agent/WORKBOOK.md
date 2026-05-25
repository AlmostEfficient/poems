# Workbook

durable cross-task findings, decisions, rejected approaches, and user preferences.

task-specific state belongs in task files, not here.

## format

each entry:

```
### YYYY-MM-DD — short title
**type**: decision | finding | rejected | preference
**body**: what was learned or decided. include the why.
**source**: task file or conversation that produced this.
```

distinguish measured facts from user preference. don't erase rejected approaches — mark them rejected with the reason.

## entries

<the PM agent appends here as work progresses. start empty.>

### 2026-05-25 — SQLite replacement risk
**type**: finding
**body**: Current SQLite initialization deletes and replaces the on-device DB when `metadata.db_version` is missing, invalid, or below `DB_VERSION`; this would delete future user-owned poems and state.
**source**: `.agent/tasks/doing/001-harden-sqlite-migrations.md`

### 2026-05-25 — Local DB upgrades migrate in place
**type**: decision
**body**: Existing local DBs should be migrated in place. Bundled catalogue refreshes should import or upsert bundled rows and must not replace the durable on-device DB after first install.
**source**: `.agent/tasks/doing/001-harden-sqlite-migrations.md`

### 2026-05-25 — Bundled DB baseline
**type**: finding
**body**: Current bundled DB contains 67 bundled poems, `metadata.db_version = 4`, and no user/state tables.
**source**: `.agent/tasks/doing/001-harden-sqlite-migrations.md`

### 2026-05-25 — Bundled catalogue refresh preserves user rows
**type**: finding
**body**: Bundled catalogue refresh now imports or upserts bundled rows in place and does not overwrite user-owned rows where `source != 'bundled'`.
**source**: `.agent/tasks/doing/001-harden-sqlite-migrations.md`

### 2026-05-25 — Poem ID collision behavior
**type**: finding
**body**: If a user poem has the same `poem_id` as a bundled poem, bundled catalogue refresh preserves the user row and skips the bundled update for that ID. This matches the data-preservation rule.
**source**: `.agent/tasks/doing/001-harden-sqlite-migrations.md`

### 2026-05-25 — Cloud sync identity
**type**: decision
**body**: Cloud schema should preserve local `poem_id` as the stable sync identity; Supabase UUIDs are remote row identifiers only.
**source**: `.agent/tasks/doing/002-design-supabase-schema-rls.md`

### 2026-05-25 — Catalogue write boundary
**type**: decision
**body**: Public catalogue data is read-only to clients. Catalogue writes belong to Nexus, admin, or service-role workflows, not the mobile client.
**source**: `.agent/tasks/doing/002-design-supabase-schema-rls.md`

### 2026-05-25 — User sync deletion model
**type**: decision
**body**: User saves and user-created poems should use per-user RLS plus soft deletes so offline devices can reconcile deletions later.
**source**: `.agent/tasks/doing/002-design-supabase-schema-rls.md`

### 2026-05-25 — Supabase sync role
**type**: decision
**body**: Supabase mirrors and syncs local user data; SQLite remains the reader source of truth.
**source**: `.agent/tasks/doing/002-design-supabase-schema-rls.md`

### 2026-05-25 — User-owned RLS write checks
**type**: decision
**body**: Future Supabase insert/update RLS policies for user-owned tables should include `WITH CHECK (user_id = auth.uid())`, not only `USING`, to prevent cross-user writes.
**source**: `.agent/tasks/doing/002-design-supabase-schema-rls.md`

### 2026-05-25 — Poem scope constraint
**type**: decision
**body**: `poem_scope` should be constrained to known values such as `catalogue` and `user` when the Supabase schema is implemented.
**source**: `.agent/tasks/doing/002-design-supabase-schema-rls.md`

### 2026-05-25 — Expo Supabase env names
**type**: decision
**body**: App Supabase config must use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; non-public env names are not app-readable in Expo client code.
**source**: `.agent/tasks/doing/003-add-app-supabase-client-auth.md`

### 2026-05-25 — Mobile Supabase key boundary
**type**: decision
**body**: The Supabase mobile client must use only publishable/client-safe keys. Secret and service-role keys remain Nexus-only.
**source**: `.agent/tasks/doing/003-add-app-supabase-client-auth.md`

### 2026-05-25 — Auth optional for reading
**type**: decision
**body**: Auth is optional for reading. A missing Supabase session means guest mode, not a blocked app.
**source**: `.agent/tasks/doing/003-add-app-supabase-client-auth.md`

### 2026-05-25 — Supabase type staging
**type**: decision
**body**: Generated Supabase types should be added only after migrations/schema exist; until then use a narrow placeholder type.
**source**: `.agent/tasks/doing/003-add-app-supabase-client-auth.md`

### 2026-05-25 — Guest-mode auth startup
**type**: finding
**body**: The startup auth hook can initialize to guest mode when Supabase public config is absent, so local reading does not depend on cloud configuration.
**source**: `.agent/tasks/doing/003-add-app-supabase-client-auth.md`

### 2026-05-25 — Local saved state table
**type**: decision
**body**: Local saved state should live in a separate `saved_poems` table keyed by stable `poem_id`, not on bundled catalogue rows.
**source**: `.agent/tasks/doing/004-add-local-saved-poems.md`

### 2026-05-25 — Local saves are guest/offline first
**type**: decision
**body**: Local save and unsave must work in guest mode and must not call Supabase or Nexus.
**source**: `.agent/tasks/doing/004-add-local-saved-poems.md`

### 2026-05-25 — Saved list joins local poems
**type**: decision
**body**: Saved-poem list queries should join `saved_poems` to `poems` and ignore missing local poem rows until sync/import behavior exists.
**source**: `.agent/tasks/doing/004-add-local-saved-poems.md`

### 2026-05-25 — Saved state soft deletes
**type**: decision
**body**: Soft deletes are preferred for saved state because future Supabase sync needs to reconcile offline unsaves.
**source**: `.agent/tasks/doing/004-add-local-saved-poems.md`

### 2026-05-25 — Reader source caveat
**type**: finding
**body**: `getRandomPoems()` currently returns source as stored, then `asLocalPoems()` overwrites it with `local`; do not rely on reader `source` alone to distinguish bundled versus user poems.
**source**: `.agent/tasks/doing/004-add-local-saved-poems.md`

### 2026-05-25 — Local unsave tombstones
**type**: finding
**body**: Local unsave writes a soft-delete tombstone in `saved_poems`, preserving future sync intent without modifying bundled `poems` rows.
**source**: `.agent/tasks/doing/004-add-local-saved-poems.md`

### 2026-05-25 — Saved sync migration blocker
**type**: finding
**body**: Saved-poems sync is blocked from full app implementation until Supabase migrations/RLS actually exist.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync poem scope
**type**: decision
**body**: Local `saved_poems` should gain `poem_scope` before cloud sync so it matches the remote identity model.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync background reconciliation
**type**: decision
**body**: Save/unsave UI must remain local-only; sync is background reconciliation.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Remote saved tombstones
**type**: decision
**body**: Remote unsaves should be soft-delete tombstones, not hard deletes, so offline devices can reconcile later.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync credential boundary
**type**: decision
**body**: App-side Supabase sync must use only publishable client config and RLS; service-role work remains outside this repo and Nexus-owned where privileged backend work is required.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved poems remote unique index
**type**: finding
**body**: The `saved_poems` remote identity index is covered by the unique constraint on `(user_id, poem_scope, poem_id)`; no duplicate index is needed.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved poems migration verification
**type**: finding
**body**: Stage 1 remote `saved_poems` migration/RLS is ready for review; SQL lint still needs a running local Supabase database.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Local saved composite identity limitation
**type**: finding
**body**: Local `saved_poems` now carries `poem_scope` for remote identity alignment, but the existing `poem_id` primary key remains a staged limitation until a safe SQLite table rebuild is planned.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync local metadata verified
**type**: finding
**body**: Stage 2 local saved-poems sync metadata/API is ready for review; local save/unsave remains offline-first and SQLite-only.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Future saved table rebuild
**type**: decision
**body**: Future table rebuild should consider composite local identity for `(poem_scope, poem_id)` and optional SQLite constraints for `sync_status`.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync non-fatal failures
**type**: finding
**body**: App-side saved-poems sync returns non-fatal results for unconfigured, signed-out, unavailable, and Supabase-error states; local dirty rows remain the retry source.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync order
**type**: decision
**body**: App-side saved-poems sync pushes dirty local rows before pulling remote checkpoint changes.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync mark-synced guard
**type**: finding
**body**: Marking a local saved row as synced is guarded by the expected local `updated_at` when called from sync, reducing the chance of clearing a newer local dirty edit.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Saved sync verification gap
**type**: finding
**body**: Full saved-poems sync passes code and command verification; live Supabase restore still needs runtime validation with a signed-in test user.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — Supabase lint blocker
**type**: finding
**body**: Supabase SQL lint remains blocked until local Supabase/Postgres is running.
**source**: `.agent/tasks/doing/005-add-saved-poems-sync.md`

### 2026-05-25 — My Library surface
**type**: decision
**body**: My Library should be an in-app reader surface, not a new marketing/home screen.
**source**: `.agent/tasks/doing/006-build-my-library-ui.md`

### 2026-05-25 — Saved poem opening behavior
**type**: decision
**body**: Saved poem rows should open a local detail reader view first; injecting arbitrary poems into the random feed can wait.
**source**: `.agent/tasks/doing/006-build-my-library-ui.md`

### 2026-05-25 — User poems placeholder
**type**: decision
**body**: Until manual poem creation ships, My Library should show a placeholder for user-created poems rather than adding creation/upload controls.
**source**: `.agent/tasks/doing/006-build-my-library-ui.md`

### 2026-05-25 — Saved rows missing local poems
**type**: finding
**body**: `getLocalSavedPoems()` omits saved rows whose poem is not present in local `poems`, which is acceptable until sync/import behavior fills those rows.
**source**: `.agent/tasks/doing/006-build-my-library-ui.md`

### 2026-05-25 — My Library navigation staging
**type**: decision
**body**: My Library can stay app-state managed for now; no navigation dependency is needed for saved-list and local detail reading.
**source**: `.agent/tasks/doing/006-build-my-library-ui.md`

### 2026-05-25 — My Library verification scope
**type**: finding
**body**: My Library UI can ship as an app-state overlay using existing local saved APIs; remaining risk is visual/manual verification on simulator/device rather than TypeScript or code structure.
**source**: `.agent/tasks/doing/006-build-my-library-ui.md`

### 2026-05-25 — Manual user poem local model
**type**: decision
**body**: Manual user-created poems can use local `poems.source = 'user'` as the staged local model; no schema change is needed for first manual creation.
**source**: `.agent/tasks/doing/007-add-manual-poem-creation.md`

### 2026-05-25 — User poems UI location
**type**: decision
**body**: User-created poem UI belongs inside My Library's `Your Poems` tab, not in the main reader feed.
**source**: `.agent/tasks/doing/007-add-manual-poem-creation.md`

### 2026-05-25 — User poem detail first
**type**: decision
**body**: Created poems should open in local detail reader first; random-feed injection can wait.
**source**: `.agent/tasks/doing/007-add-manual-poem-creation.md`

### 2026-05-25 — User poem save scope
**type**: decision
**body**: Saving/star behavior for user-created poems should wait until save APIs are fully scoped with `poemScope = 'user'`.
**source**: `.agent/tasks/doing/007-add-manual-poem-creation.md`

### 2026-05-25 — User poem metadata follow-up
**type**: finding
**body**: Manual user poems can ship without schema changes, but future edit/delete/sync work should add explicit created/updated metadata rather than relying on row id ordering.
**source**: `.agent/tasks/doing/007-add-manual-poem-creation.md`

### 2026-05-25 — User poems excluded from random feed
**type**: decision
**body**: Reader feed random catalogue queries must exclude `source = 'user'`; user-created poems should be reachable through My Library/local detail only until product explicitly adds a feed mode for personal poems.
**source**: `.agent/tasks/doing/007-add-manual-poem-creation.md`

### 2026-05-25 — User poem sync staging
**type**: decision
**body**: User-created poem sync should be staged: remote `user_poems` migration/RLS, then local sync metadata/API, then app sync hook.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem sync metadata requirement
**type**: finding
**body**: Local user poems currently lack sync metadata; full sync should not ship until dirty state, remote id, timestamps, tombstones, and checkpoints exist.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem sync reconciliation pattern
**type**: decision
**body**: User-created poem sync should reuse the saved-poems push-then-pull, SQLite-first reconciliation pattern.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem tombstone support
**type**: decision
**body**: Until edit/delete UI exists, sync must still document and support remote tombstones and future local dirty edits/deletes at the repository level.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poems migration verification pending lint
**type**: finding
**body**: Stage 1 remote `user_poems` migration/RLS is ready for review; SQL lint still needs a running local Supabase database.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem local sync metadata ready
**type**: finding
**body**: Local user-created poems now have sync-ready metadata, but full user-poem sync still needs the app-side Supabase push/pull service and runtime validation with a signed-in test user.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem sync stage 2 verified
**type**: finding
**body**: Stage 2 local user-poem sync metadata/API is ready for app-side sync work; `assets/poems.db` was not regenerated.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem mark-synced observability
**type**: decision
**body**: Future user-poems sync should make guarded mark-synced results observable to avoid silently clearing or missing newer local edits.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem sync pre-upsert read
**type**: finding
**body**: User-created poem sync now mirrors saved-poems sync but adds a pre-upsert remote read so latest `updated_at` wins before local dirty rows overwrite remote state.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem sync live validation gap
**type**: finding
**body**: Live Supabase/session validation remains required for user-created poem sync.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — User poem sync verification status
**type**: finding
**body**: Full user-created poem sync acceptance checks pass by code inspection and required commands; live Supabase runtime validation remains outstanding.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — Lockfile verification churn
**type**: finding
**body**: `bun.lockb` is modified in the worktree after Expo/Bun verification commands; review lockfile delta before final handoff.
**source**: `.agent/tasks/doing/008-sync-user-created-poems.md`

### 2026-05-25 — Catalogue import scaling
**type**: finding
**body**: Bundled catalogue imports currently scale linearly on existing-DB startup because all bundled rows are refreshed from the asset DB during initialization.
**source**: `.agent/tasks/doing/009-grow-bundled-catalogue.md`

### 2026-05-25 — Catalogue copyright scope
**type**: decision
**body**: Catalogue expansion should be limited to clearly U.S. public-domain works unless rights are documented.
**source**: `.agent/tasks/doing/009-grow-bundled-catalogue.md`

### 2026-05-25 — Catalogue ID stability
**type**: decision
**body**: `poem_id` is durable user-facing identity; catalogue edits must not regenerate existing IDs casually.
**source**: `.agent/tasks/doing/009-grow-bundled-catalogue.md`

### 2026-05-25 — Generated DB version mismatch
**type**: finding
**body**: Generator `DB_VERSION = 4` is behind runtime `DB_VERSION = 7`; generated DB metadata should be aligned or consciously staged.
**source**: `.agent/tasks/doing/009-grow-bundled-catalogue.md`

### 2026-05-25 — Catalogue expansion batch
**type**: finding
**body**: The catalogue expansion added only English poems from two U.S. 1920 public-domain collections: Sara Teasdale's `Flame and Shadow` and Edna St. Vincent Millay's `A Few Figs from Thistles`.
**source**: `.agent/tasks/doing/009-grow-bundled-catalogue.md`

### 2026-05-25 — Generated DB version aligned
**type**: finding
**body**: Generated bundled DB metadata is now aligned to runtime `DB_VERSION = 7`.
**source**: `.agent/tasks/doing/009-grow-bundled-catalogue.md`

### 2026-05-25 — Catalogue startup smoke
**type**: finding
**body**: Metro startup passed with the larger 112-poem catalogue; full simulator reader render/performance remains optional follow-up.
**source**: `.agent/tasks/doing/009-grow-bundled-catalogue.md`

### 2026-05-25 — Final end-state reviews
**type**: preference
**body**: For multi-task batches, prefer one final aggregate end-state review of the combined worktree before acceptance. Per-task reviews can still be used for scoped checks, but they are not a substitute for final integration review across migrations, generated files, lockfiles, schema/RLS, sync flows, UI, and runtime gaps.
**source**: user conversation, PM protocol update

### 2026-05-25 — Saved sync stale overwrite fix
**type**: finding
**body**: Final aggregate review found and fixed a blocking saved-poems sync issue: stale local dirty rows could overwrite newer remote saved state. `savedPoemsSync` now reads the matching remote row before upsert and lets newer remote state, or tie-case remote non-deleted state over local tombstone, win. Post-fix `bunx tsc --noEmit` passed.
**source**: final aggregate review subagent Einstein

### 2026-05-25 — Local user poem storage model
**type**: decision
**body**: Local user-created poems live in the SQLite `poems` table with `source = 'user'`; Supabase `user_poems` is the remote table only. Sync checkpoints live in the local `metadata` table rather than a separate `sync_state` table.
**source**: live device validation follow-up / subagent Newton

### 2026-05-25 — Live Supabase validation prerequisite
**type**: finding
**body**: Live device validation can build and launch the app with Expo-public Supabase env names, but signed-in sync/RLS validation requires an authenticated Supabase session inside the installed `com.raza.poems` app bundle or a temporary/manual auth path.
**source**: `.agent/tasks/ready/010-live-supabase-runtime-validation.md`
