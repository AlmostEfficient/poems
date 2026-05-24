# Poems App Backlog

- **Stable IDs shipped**: Each poem now carries a deterministic `poem_id` (generator + formatter updated).
- **Schema upgraded**: SQLite schema tracks `poem_id`, `source`, and migrates bundled installs without wiping user rows.
- **Formatter ready**: `scripts/format_poem.ts` dedupes, assigns IDs, and appends to `poems.json` safely.
- **Bundled DB pipeline**: `bun run generate` (tsx) rebuilds `assets/poems.db` using the new schema.

## Ready for implementation

1. **User favourites**
   - Create `user_favorites` table keyed by `poem_id`.
   - Expose add/remove helpers and hydrate state in `usePoemFeed` or a new hook.

2. **User-imported poems UI**
   - Input screen that captures title/author/content, calls `addPoem`, and refreshes the feed.
   - Optional “My Poems” filter leveraging `source = 'user'`.

3. **Cloud sync groundwork** (optional start)
   - Persist `poem_id`, timestamps, and `source` to prepare for future upload/download jobs.

4. **Formatter batching**
   - Wrap `format_poem` in a driver script for large batches (e.g., PoetryDB ingestion) with rate limiting.

5. **Favourites UI/UX polish**
   - Add toggle buttons, list views, and offline fallback messaging.

## Nice-to-have follow-ups

- Build migration tests to ensure user poems survive future schema changes.
- Add CLI flag to `generate` for feeding multiple JSON sources (per-language or per-collection).
- Surface metrics (poem count, language mix) after regeneration for sanity checks.
