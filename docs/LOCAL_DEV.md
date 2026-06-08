# Local Development

Jack Script is local-first by default. You do not need Docker, Supabase, or
Postgres for normal browser or desktop development.

## Prerequisites
- Node 20+ and npm.
- Rust + Cargo for Tauri builds.
- Ollama for local AI: https://ollama.com/download

Optional hosted integrations such as Anthropic, Hedra, ElevenLabs, Brave Search,
YouTube, Google Drive, and the hosted Postgres/Supabase compatibility path still
use environment keys when you choose to test them.

## Browser Dev
```bash
npm install
cp .env.example .env.local
ollama pull llama3.2
npm run dev
```

Open http://localhost:3000. With the default `.env.example`, the app uses:
- SQLite in `.local-data/jack-script.sqlite3`.
- Local app-data storage under `.local-data/storage`.
- Ollama native chat at `http://127.0.0.1:11434`.
- A single embedded local owner/workspace with seeded Jack Script projects.

## Desktop Dev
```bash
npm run desktop:dev
```

The desktop runtime starts the local Next server with local-first env values and
shows first-run setup in the app. Setup checks whether Ollama is installed and
running, lists local models, can pull the chosen model, and stores the selection
in the Tauri app data directory.

The desktop app looks for Ollama through `OLLAMA_BIN`, common Homebrew install
paths, and then the process `PATH`. Set `OLLAMA_BIN=/path/to/ollama` only if you
use a nonstandard Ollama install.

Native desktop menu items include:
- **Set Up Local Model...**
- **Start Ollama**
- **Open Data Folder**
- **Create Local Backup**
- **Open Backups Folder**
- **Install Ollama...**

## Desktop Build
```bash
npm run desktop:icon
npm run desktop:build
```

The build creates a Tauri app and macOS DMG under `src-tauri/target/release/bundle`.
The packaged app includes:
- The standalone Next server.
- A bundled Node runtime copied from the build machine.
- The local SQLite schema.
- App icons and an ad-hoc signed macOS bundle for local QA.

Public macOS distribution still requires Developer ID signing and notarization.

Verify the built artifact:
```bash
npm run desktop:verify-release
```

Public release builds use the stricter signed path:
```bash
npm run desktop:build:signed
npm run desktop:verify-signed-release
```

## LLM Configuration
`GET /api/llm/status` reports the active provider/model and capabilities without
exposing secrets.

Local-first remains the default. Cloud providers are opt-in and use the same
server-side LLM interface. The model picker can route write, review, and revise
tasks to different providers.

Ollama native local:
```bash
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
LLM_BASE_URL=http://127.0.0.1:11434
```

LM Studio / vLLM / Ollama OpenAI-compatible local:
```bash
LLM_PROVIDER=openai-compatible
LLM_MODEL=local-model
LLM_BASE_URL=http://127.0.0.1:1234/v1
LLM_API_KEY=
```

Anthropic hosted:
```bash
LLM_PROVIDER=anthropic
LLM_MODEL=claude-haiku-4-5
LLM_API_KEY=
ANTHROPIC_API_KEY=
```

OpenAI / ChatGPT API:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=
```

OpenAI-compatible hosted:
```bash
LLM_PROVIDER=openai-compatible
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=
```

xAI / Grok:
```bash
LLM_PROVIDER=xai
LLM_MODEL=grok-4.3
XAI_API_KEY=
```

Gemini:
```bash
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GEMINI_API_KEY=
```

PDF/image extraction needs a multimodal file provider. Text and `.docx` uploads
are decoded locally. Anthropic and Gemini can be used as hosted multimodal
fallbacks:
```bash
LLM_FILE_PROVIDER=anthropic
LLM_FILE_MODEL=claude-haiku-4-5
LLM_FILE_API_KEY=
```

```bash
LLM_FILE_PROVIDER=gemini
LLM_FILE_MODEL=gemini-2.5-flash
LLM_FILE_API_KEY=
```

## Hosted Compatibility
The repo still contains the old hosted web stack for compatibility. To exercise
that path, configure `DATABASE_URL`, `SUPABASE_URL`, Supabase keys, and set
local-first variables off. Do not run Drizzle push/generate against a local-first
desktop database.

## Useful Commands
```bash
npm run typecheck
npm test
cargo check --manifest-path src-tauri/Cargo.toml
npm run desktop:build
```
