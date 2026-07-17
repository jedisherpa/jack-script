# Role in Ecosystem

## Repository Identity
- **Repository:** `jedisherpa/jack-script`
- **Branch:** `main`
- **Commit:** `1676c549e438899a325471c32dc480e4f5f87d4b`

## Repository-Local Ownership
The frozen source contains repository-local implementations at `lib/screenplay/parser.ts` and `lib/production/index.ts`. Repository owner/maintainer approval is unknown and not recorded in the frozen source. Ownership is not asserted beyond file location and license metadata.

## Observed Upstream Relationships
The application acts as a consumer for several upstream external APIs:
- **Media Generation:** Hedra (`lib/hedra.ts`) for video generation and ElevenLabs (`lib/elevenlabs.ts`) for text-to-speech.
- **LLM Providers:** Anthropic, OpenAI, Gemini, and local Ollama instances (`lib/llm/providers/`).
- **Research APIs:** Brave Search (`lib/gather/websearch.ts`), Crossref, arXiv, PubMed (`lib/gather/journals.ts`), X API (`lib/gather/xtrends.ts`), and YouTube (`lib/gather/youtube.ts`). Tavily, Bing, and SerpAPI are documented as possible/target providers in `docs/GATHER_BRIEF.md`, but are not observed as current integrations in the frozen code.

## Observed Downstream Relationships
The application acts as a producer for downstream consumers primarily through its export capabilities:
- **File Exports:** Generates PDF, Final Draft (FDX), and Fountain files for consumption by industry-standard screenwriting software (`lib/screenplay/export.ts`).
- **Desktop Users:** The repository contains a Tauri desktop packaging target for macOS DMG builds (`src-tauri/`). No remote release, install telemetry, or end-user consumption evidence is present.

## Explicit Non-Roles
- **Not a Centralized Database:** No frozen evidence shows Jack Script exposing its database as a shared Prism GT datastore for other applications.
- **Not a General-Purpose LLM Gateway:** While it routes LLM requests, it does so strictly for its own internal stage-gated pipelines, not as a generic proxy for external consumers.

## Proposed Integration Seams
For the proposed Prism GT integration, the following seams are identified as credible integration points based on the existing API structure:
- **Project Management:** `app/api/campaigns/route.ts` could serve as an integration point for syncing projects with a broader ecosystem.
- **Script Management:** `app/api/pieces/[id]/route.ts` could be utilized for importing/exporting script data to other Prism GT services.
- **Media Assets:** `app/api/hedra/generate/route.ts` and related media routes could potentially be exposed or adapted to share generated assets.

## Frozen source boundary

This document is limited to the exact repository, branch, and frozen source commit recorded in the package metadata and cited references. Later remote changes require a new source freeze and independent review.

## References
- [Production Logic](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/production/index.ts)
- [Screenplay Export](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/screenplay/export.ts)
- [Gather APIs](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/gather/index.ts)
