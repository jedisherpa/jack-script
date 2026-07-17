# Current State

## Repository Identity
- **Repository:** `jedisherpa/jack-script`
- **Branch:** `main`
- **Commit:** `1676c549e438899a325471c32dc480e4f5f87d4b`

## Frozen-Code Capabilities
The repository implements a local-first screenwriting and stage-gated video production workstation. The core capabilities observed in the frozen source include:
- **Dual-Mode Data Layer:** Supports SQLite for local-first operations (`lib/local/database.ts`) and Postgres via Drizzle ORM for cloud deployments (`db/schema.ts`).
- **Screenplay Parsing and Export:** Features a parser for standard screenplay formats with exports to PDF, Final Draft (FDX), and Fountain (`lib/screenplay/export.ts`, `lib/screenplay/fdx.ts`).
- **AI Integration:** Implements a provider-neutral LLM layer supporting local models like Ollama and cloud providers like Anthropic and OpenAI (`lib/llm/config.ts`).
- **Media Generation:** Integrates with Hedra for video generation and ElevenLabs for text-to-speech (`lib/hedra.ts`, `lib/elevenlabs.ts`).

## Entry Points
- **Web Interface:** Served via Next.js rewrites in `next.config.mjs` pointing to `public/index.html`.
- **API Routes:** Next.js App Router endpoints located under `app/api/`, such as `app/api/campaigns/route.ts`.
- **Desktop Application:** Tauri desktop shell entry point at `src-tauri/src/main.rs`.

## Architecture
The architecture is a hybrid web and desktop application. The frontend is a React single-page application located in `public/`. The backend is a Next.js application providing API routes. The desktop version uses Tauri to package the web application and a standalone Next.js server, utilizing a local SQLite database for offline capabilities.

## Data, Security, and Deployment Boundaries
- **Data Boundaries:** Local data is stored in `.local-data/jack-script.sqlite3`. Cloud data uses Postgres.
- **Security Boundaries:** Repository instructions and server README require API keys for external services (Hedra, ElevenLabs, LLMs) to remain server-side (`docs/SERVER_README.md`). This package did not perform live bundle verification or execute a secret-leak test to prove no client exposure.
- **Deployment Boundaries:** The application can be deployed as a Next.js standalone application or packaged as a macOS DMG using Tauri (`scripts/package-desktop-dmg.ts`).

## Observed Tests
The repository includes a test suite using Vitest (`vitest.config.ts`). Test files are located in `__tests__/`, covering areas such as LLM integration (`__tests__/llm.test.ts`), screenplay parsing (`__tests__/screenplay.test.ts`), and media generation (`__tests__/hedra.test.ts`).

## Evidence Limitations
The frozen source provides extensive evidence of the local-first and media generation capabilities. However, there is no evidence of an existing integration with the Prism GT ecosystem. The file `README.PRISM-GT-INTEGRATION.md` is explicitly marked as preparation evidence only.

## References
- [Database Schema](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/db/schema.ts)
- [Tauri Main](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/src-tauri/src/main.rs)
- [LLM Config](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/llm/config.ts)
