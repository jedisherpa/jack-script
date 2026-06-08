# Jack Script — Migration from Pillar Press

Jack Script repurposes the Pillar Press / King's Press Editorial Desk codebase into a professional, local-first screenwriting workstation.

## Concept mapping

| Pillar Press | Jack Script |
|---|---|
| King's Press Editorial Desk | Jack Script |
| Workspace | Writers' Room |
| Campaign | **Project** (feature, pilot, short, stage play) |
| References (`doc`) | **Project Bible** |
| Piece | **Script** / Draft |
| Gates (7 editorial) | **Script Coverage Gates** (7 screenplay) |
| Revision | AI-assisted script revision |
| Outputs / PLATFORMS | **Screenplay Artifacts** (logline, treatment, etc.) |
| Gather | Research / Worldbuilding Lab |
| Weave | Treatment Weaver / Research Synthesis |
| Style profiles | Cinematic Visual Bible |
| Book export | Screenplay export (Fountain + formatted text) |

## API routes (unchanged paths)

Routes keep `/api/campaigns` and `/api/pieces` for compatibility. Internal naming and UI labels use Project/Script/Bible.

## New schema fields

**Projects (`campaigns`):** `type`, `logline`, `genre`, `target_page_count`, `format`

**Scripts (`pieces`):** `format`, `page_estimate`, `scene_count`, `parsed_scenes`

Migration: `db/migrations/0006_jack_script.sql` (Postgres) + SQLite auto-migrate in `lib/local/database.ts`.

## Coverage gates (new order)

1. Format, Structure & Page Count
2. Character Voice & Consistency
3. Dialogue, Subtext & Naturalism
4. Pacing, Tension & Act Structure
5. Visual Storytelling & Cinematic Language
6. Theme, Emotional Arc & Resolution
7. Originality, Market/Genre Fit & Commercial Viability

## Artifacts (generation order)

1. logline → 2. one_page_synopsis → 3. full_treatment → 4. pitch_deck_text → 5. character_breakdowns → 6. scene_outline → 7. production_breakdown → 8. table_read_script

## Running locally

```bash
# Install Ollama and pull a model
ollama pull llama3.2

cp .env.example .env.local
npm install
npm run dev
```

Open the app, create a Project, populate the Bible, write or import a script, run **Script Coverage**, then **Revision** and **Artifacts**.

Desktop (Tauri): `npm run desktop:dev`

## Data directory

Default: `~/Library/Application Support/Jack Script/` (macOS)

Legacy Pillar Press data at `King's Press Editorial Desk` is used automatically if Jack Script folder does not exist yet.

## Importing Pillar Press data

1. Copy your existing SQLite DB and storage folder to `JACK_SCRIPT_DATA_DIR`, or
2. Set `KINGS_PRESS_DATA_DIR` to your old path (still honored).

Editorial bibles import cleanly — legacy `strategy`/`audiences` keys render under `[LEGACY]` sections in AI context until you migrate to the new Bible shape in `lib/seed-data.ts`.

## New libraries

- `lib/screenplay/parser.ts` — slugline/dialogue/scene detection, page estimate
- `lib/screenplay/export.ts` — Fountain + formatted screenplay text + breakdown markdown

## Tests

```bash
npm test
```

Screenplay-specific: `__tests__/screenplay.test.ts`, updated gate/generator tests.