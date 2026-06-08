# Jack Script

Jack Script is a local-first screenwriting and stage-gated video production workstation. It is built for the pre-edit production flow: Brief, Script, Audio, Storyboard, and Animatic, with approval gates between each stage. Edit and Render are intentionally placeholders.

The app runs as a browser-based Next.js workspace and as a Tauri desktop app. Local-first mode uses SQLite, a local owner account, and server-side LLM routing so API keys stay out of the browser.

## Features

- Productions list with create/open workflow.
- Stage-gated pipeline: Brief -> Script -> Audio -> Storyboard -> Animatic.
- Screenplay parser with scene count, page estimate, character/location sync, and Bible context.
- Project Bible for characters, tone, beats, locations, red lines, and coverage context.
- Coverage gates, revision pass, artifact generation, weave, and exports.
- Exports for Fountain, FDX, formatted text, breakdown markdown, and PDF.
- Per-task AI routing for write, review, and revise roles.
- Provider support for Ollama, Docker Model Runner, Anthropic, OpenAI, xAI/Grok, Groq, Gemini, Morpheus, Kimi/Moonshot, and generic OpenAI-compatible endpoints.
- Desktop signing and notarization scripts for macOS Developer ID releases.

## Quick Start

```bash
git clone https://github.com/jedisherpa/jack-script.git
cd jack-script
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is busy, Next.js will offer another local port.

The default `.env.example` runs local-first:

- SQLite data in `.local-data/`.
- Auth disabled with a local owner user.
- Ollama at `http://127.0.0.1:11434` using `llama3.2`.
- No cloud keys required.

## Desktop App

```bash
npm run desktop:dev
```

For a local production desktop bundle:

```bash
npm run desktop:build
npm run desktop:verify-release
```

For Developer ID signing and notarization, configure Apple signing credentials in your shell and run:

```bash
npm run desktop:build:signed
npm run desktop:verify-signed-release
```

The signed build signs bundled native Node modules before notarization so SQLite and Sharp are accepted by Apple.

## AI Providers

The UI model picker stores provider/model preferences for three roles: write, review, and revise. API keys remain server-side or in the desktop runtime configuration; they are not persisted in browser preferences.

Local defaults:

```bash
LLM_PROVIDER=ollama
LLM_BASE_URL=http://127.0.0.1:11434
LLM_MODEL=llama3.2
```

Per-role overrides are documented in `.env.example`, including `LLM_WRITE_*`, `LLM_REVIEW_*`, and `LLM_REVISE_*`.

## Test And Build

```bash
npm run typecheck
npm test
npm run build
```

Tauri checks:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## Project Shape

- `app/api/` - Next.js App Router API routes.
- `lib/local/` - SQLite local-first database/runtime.
- `lib/llm/` - provider-neutral LLM clients and task routing.
- `lib/production/` - Skill 11 production pipeline logic.
- `lib/screenplay/` - parser and export helpers.
- `public/` - React single-page UI loaded from `public/index.html`.
- `src-tauri/` - desktop shell and packaged server launcher.

## License

MIT
