# Sync Strategy Notes

Local SQLite remains the canonical store for the reader:
- Bundled poems + user-imported poems sit in the same `poems` table, split by `source` (`bundled`, `user`, etc.).
- Favourites and other user state live in companion tables keyed by `poem_id` (stable slug).

Cloud backing (e.g., Supabase) only mirrors user-specific tables:
- On sign-up, upload existing local rows (user poems, favourites) and record remote IDs/sync tokens.
- On every session with connectivity, push new/dirty rows and pull remote changes since the last sync.
- Conflict resolution can be last-write-wins using timestamps because bundled poems never mutate and user poems have deterministic IDs.

This lets the app stay offline-first while enabling optional accounts later. No dual writable DBs—just local-first with opportunistic sync.

# Curation Metadata

- `poems.json` entries now accept a `metadata` block (tags, themes, moods, form, era, length) to power future filtering and recommendations.
- `scripts/format_poem.ts` always back-fills that metadata (length derived from line count) so legacy poems stay compatible when the formatter appends new entries.
- `scripts/ingest_poetrydb.ts` favours the curated `FAMOUS_AUTHORS` pool and picks each author’s longer works first, then pipes them through the formatter so metadata lands automatically.
