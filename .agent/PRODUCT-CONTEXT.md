# Product Context

project-specific context for the PM agent. edit this file as the project evolves. the PM-PROTOCOL stays generic; everything project-shaped lives here.

## what this project is

Poems is an Expo React Native app for reading, saving, uploading, and eventually scanning poems and quotes. It is being shaped into a consumer app with offline-first local reading, cloud sync, and LLM-assisted poem/quote capture.

## primary goal right now

Prepare the app for a robust consumer product: harden the SQLite/local data layer, add Supabase-backed sync where appropriate, keep Nexus as the trusted backend for LLM/scanner work, and grow the bundled catalogue without compromising offline performance.

## verification commands

- `bunx tsc --noEmit`
- `bunx expo install --check`
- `bunx expo-doctor`
- `bun run check:poems` when touching `poems.json`
- `bun run generate` when changing the bundled catalogue DB

## hard constraints

- Always use Bun, never npm. The project is intentionally managed with Bun.
- Do not commit or expose `.env`. It contains client configuration and may gain sensitive local values.
- Do not put Supabase service-role credentials in this repo. Privileged backend/database work belongs in Nexus at `/Users/raza/Projects/nexus`.
- Do not replace local SQLite with Supabase. The reader must remain offline-first and render from local data.
- Do not allow app upgrades or bundled catalogue refreshes to delete user-owned saved/uploaded poems.
- Treat `assets/poems.db` as generated output from `poems.json`.

## already tried and rejected

- Starting over in Swift was considered and rejected for now. Expo React Native is a good fit for the current product goals and has been upgraded to the current SDK baseline.
- Pure local-only paid storage was considered and rejected as the long-term model because user-saved poems should survive reinstall/device changes.

## design / voice notes

- See `AGENTS.md` for the durable project router and backend boundaries.
- Keep explanations and project notes high level unless detail is needed.
- The app should feel calm, premium, fast, and reading-focused. Avoid UI bloat.

## stakeholders / external context

- Nexus at `/Users/raza/Projects/nexus` is the Cloudflare-hosted backend for LLM proxy/scanning, Eyeball observability, Hotline support later, and privileged Supabase operations.
- The mobile app may call Supabase directly for client-safe auth, public catalogue reads, user poems, saved poems, and sync under Row Level Security.
- Supabase project is linked locally; `.env` contains `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY`.
