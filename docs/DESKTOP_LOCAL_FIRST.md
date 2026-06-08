# Jack Script — local-first desktop architecture

This repo contains the local-first Tauri desktop build of Jack Script.

## Desktop runtime
- App name: **Jack Script**.
- Tauri package: `src-tauri/`.
- Desktop scripts:
  - `npm run desktop:dev`
  - `npm run desktop:build`
  - `npm run desktop:prepare-sidecar`
- `npm run desktop:dev` starts the local web runtime through `npm run desktop:web`,
  which sets:
  - `JACK_SCRIPT_LOCAL_FIRST=true`
  - `KINGS_PRESS_LOCAL_FIRST=true` for migration compatibility
  - `STORAGE_PROVIDER=local`
- `npm run desktop:build` runs a Next standalone build and copies the packaged
  server runtime into `src-tauri/resources/desktop-server`. The production Tauri
  launcher starts that local server on a private `127.0.0.1` port, initializes
  SQLite in the app data directory, and navigates the webview to the local server.
- `npm run desktop:prepare-sidecar` also copies the Node runtime used for the
  build into `src-tauri/resources/node`. The production Tauri launcher prefers
  this bundled runtime, with `KINGS_PRESS_NODE_BIN` retained as a developer
  override. This removes the normal-user requirement to install Node separately.
- First-run setup checks whether Ollama is installed/running, lists installed models, pulls a selected model, and stores the selected model in the Tauri app data directory. The launcher resolves Ollama through `OLLAMA_BIN`, common Homebrew install paths, and then `PATH`.
- The saved model choice is passed to the Next runtime through
  `KINGS_PRESS_LLM_SETTINGS_PATH`; local-first mode defaults to
  `LLM_PROVIDER=ollama` when no explicit cloud provider is configured.
- Optional cloud providers are still supported through the same server-side LLM
  interface: Anthropic, OpenAI/ChatGPT API, xAI/Grok, Groq, Gemini, Docker
  Model Runner, Morpheus, Kimi/Moonshot, and generic OpenAI-compatible
  endpoints. These are opt-in overrides, not desktop defaults.
- The native desktop menu exposes normal-user setup actions:
  - **Set Up Local Model...** reopens first-run model setup.
  - **Start Ollama** starts the local Ollama service when it is installed but
    not already running.
  - **Open Data Folder** reveals the SQLite database, settings file, and local
    storage directory.
  - **Create Local Backup** writes a timestamped copy of the SQLite database,
    desktop settings, and local storage folder under the app-data `backups`
    directory, then opens that backup in the OS file manager.
  - **Open Backups Folder** opens the local backup directory.
  - **Install Ollama...** opens the Ollama download page.

## Local database
- Target database: SQLite in the Tauri app data directory.
- Initial schema: `db/local-sqlite-schema.sql`.
- The schema includes local replacements for campaigns, references, pieces, learned style profiles/feedback, media jobs, settings, Gather sources/items, and `gather_schedules`.
- Server-side local database runtime: `lib/local/database.ts`.
- The runtime creates the local owner, workspace, membership, and default
  Jack Script projects using the shared seed data in `lib/seed-data.ts`.
- Override paths for development or backup testing:
  - `JACK_SCRIPT_DATA_DIR=/path/to/app-data`
  - `JACK_SCRIPT_DB_PATH=/path/to/jack-script.sqlite3`
  - legacy `KINGS_PRESS_*` path overrides are still honored.
- Backups are local folders named `jack-script-backup-<timestamp>`. The SQLite
  copy is created with SQLite `VACUUM INTO` so the backup is consistent while
  the app is running.

## Supabase replacement
Supabase is replaced in local-first desktop mode by embedded local services:
- Auth: no cloud auth by default; one local desktop owner profile. When
  `KINGS_PRESS_LOCAL_FIRST=true`, `DATA_BACKEND=sqlite`, or `KINGS_PRESS_DB_PATH`
  is set, `lib/auth.ts` resolves requests from the embedded local profile without
  touching Supabase or Postgres.
- Database: SQLite instead of Supabase Postgres.
- Storage: local app-data file storage instead of Supabase Storage. `lib/storage.ts`
  now writes generated media through `lib/local/storage.ts` when
  `STORAGE_PROVIDER=local` or Supabase is not configured, and files are served by
  `/api/local-files/...`.
- Drive/export: in local-first mode `/api/drive/status` advertises local export
  availability, `/api/drive/upload` and `/api/drive/upload-media` save files into
  local app-data storage, and Google OAuth routes return a clear local-first
  message instead of starting a cloud-link flow.
- Realtime: in-process app events/Tauri commands instead of Supabase realtime.
- Edge functions: Tauri Rust commands plus local Next/API code.

## Gather scheduling
- Durable schedule API: `/api/gather/schedules`.
- Storage: embedded SQLite `gather_schedules` rows.
- Browser UI: `public/screen-gather.jsx` syncs schedules to the API and keeps
  the old localStorage fallback during the route migration.
- Desktop scheduler: the Tauri production launcher starts a local background
  timer after the packaged Next server is ready. It calls
  `/api/gather/schedules/run-due` every minute; the route computes due
  once/daily/weekly schedules, runs the same server-side Gather pipeline used by
  manual runs, and stamps `last_run_at` / `last_status` on the schedule.
- Browser scheduler: web/dev fallback only. The browser interval exits early
  when the Tauri desktop bridge is present, so desktop builds do not double-run
  scheduled Gather jobs.

## Remaining migration work
- Remove hosted-only dependencies and Postgres/Supabase migrations once hosted web
  compatibility is no longer required.
- Finish installer QA on clean machines for the bundled Node + Next sidecar
  layout, including Developer ID signing/notarization and platform-specific
  installer polish.

## Release QA
For local QA builds, run:

```bash
npm run desktop:build
npm run desktop:verify-release
```

The verifier checks that the macOS app and DMG exist, the bundle metadata uses
the Jack Script name/id/version, the packaged Next server and bundled Node
runtime are present, no `.env` files are bundled, macOS codesigning verifies, the
DMG passes `hdiutil imageinfo`, the DMG mounts with the app payload plus
`/Applications` shortcut, and the packaged server can boot from a minimal
environment with a fresh local SQLite data directory, serve the UI, report LLM
status, seed projects, and run the Gather scheduler endpoint.

For public macOS release builds, configure Developer ID signing and Apple
notarization credentials, then run:

```bash
npm run desktop:build:signed
npm run desktop:verify-signed-release
```

`desktop:build:signed` refuses to run unless it can use either
`KINGS_PRESS_SIGNING_IDENTITY`, `APPLE_SIGNING_IDENTITY`, or
`MACOS_SIGNING_IDENTITY`, or an importable `APPLE_CERTIFICATE` plus
`APPLE_CERTIFICATE_PASSWORD`. It also requires notarization credentials through
either `APPLE_API_KEY` / `APPLE_API_ISSUER` / `APPLE_API_KEY_PATH` or
`APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID`. The signed verifier additionally
requires a non-ad-hoc Developer ID signature, a stapled app notarization ticket,
and a passing Gatekeeper install assessment for the DMG.
