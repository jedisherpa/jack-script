# CLAUDE.md — Jack Script build instructions

You are building **Jack Script**, a professional local-first screenwriting workstation repurposed from Pillar Press. Read `JACK_SCRIPT_MIGRATION.md`, `DATA_MODEL.md`, and `API_SPEC.md` before writing code.

## Ground rules

- **Preserve architecture.** Dual-mode data layer (`isLocalFirstMode()` + SQLite vs Drizzle/Postgres), `requireUser()` scoping, incremental gate persistence, and `buildRefContext` / `buildGateRefContext` injection are non-negotiable.
- **Screenplay domain.** Gates, revision, and artifacts use film-literate prompts in `lib/gates.ts`, `lib/revision.ts`, `lib/generators.ts`. Never revert to editorial/social-platform language.
- **Secrets are server-only.** API keys live in server runtime only. Browser calls `/api/*` routes.
- **Stack:** Next.js App Router, Postgres + Drizzle (cloud) or better-sqlite3 (local), Zod on every request body.
- **Auth on every route.** Workspace/campaign/piece scoping; one writer never leaks another's scripts.
- **Incremental AI.** Review runs gates sequentially with per-gate DB writes. Weave/revision chunk long work.
- **Zod everywhere.** Validate inputs; use `toErrorResponse` for errors.

## Build order (suggested)

1. Schema + migrations for project/script fields.
2. Gate prompts + review route with incremental packet persistence.
3. Revision (light = dialogue/voice; full = structural).
4. Artifacts generator chain.
5. Screenplay parser + export.
6. UI string pass (Projects, Scripts, Bible, Coverage, Artifacts).
7. Tests: gates shape, parser, refContext, generators order.

## Definition of done

- Create Project -> Bible -> Script -> Coverage (7 gates) -> Revision -> Artifacts -> Fountain export.
- Ollama default for text AI; cloud/media optional.
- No secrets in client bundle.
- Local data folder holds everything for offline writing.
