# Jack Script Docs

Jack Script is a local-first screenwriting and pre-edit video production workstation. These docs cover the data model, API routes, local-first desktop runtime, and migration history from the earlier editorial prototype.

## Start Here

1. `../README.md` - project overview and quick start.
2. `LOCAL_DEV.md` - local browser and desktop development.
3. `DATA_MODEL.md` - entities, fields, and local/cloud persistence.
4. `API_SPEC.md` - API routes grouped by feature.
5. `DESKTOP_LOCAL_FIRST.md` - Tauri packaging, SQLite, sidecar runtime, and release verification.
6. `JACK_SCRIPT_MIGRATION.md` - screenwriting and production-pipeline migration notes.

## Current Architecture

- Next.js App Router API routes under `app/api/`.
- SQLite local-first data layer in `lib/local/`, with Postgres/Drizzle compatibility retained.
- Server-side LLM provider routing in `lib/llm/`.
- Skill 11 production pipeline logic in `lib/production/`.
- Screenplay parser/export logic in `lib/screenplay/`.
- Browser UI in `public/`, loaded from `public/index.html`.

Secrets stay server-side. Browser code talks to `/api/*` routes and never stores provider API keys in client preferences.
