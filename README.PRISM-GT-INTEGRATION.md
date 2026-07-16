# Jack Script Integration Guide

> **Documentation status:** Pending. This repository was selected for the Signal Room's 44-repository expansion after excluding the 34 repositories already represented. It has not completed documentation integration or exact-head verification. This guide is preparation evidence only, not runtime integration or publication evidence.

## Current status
The repository is selected for the Signal Room but NOT YET integrated into the documentation corpus completed for the original 24 repositories. This guide is preparation evidence only, not runtime integration or publication evidence.

## Repository role
Jack Script is a local-first screenwriting and stage-gated video production workstation built for the pre-edit production flow (Brief, Script, Audio, Storyboard, and Animatic) [1]. It implements Skill 11 production pipeline logic [2] and is repurposed from the Pillar Press / King's Press Editorial Desk [3].

## Observed architecture and authoritative entry points
- **Architecture**: The application features a dual-mode data layer utilizing SQLite for local-first operations and Postgres for cloud deployments via Drizzle ORM [4]. It employs a Next.js App Router backend for API routes [5] and a Tauri desktop shell for local execution [6]. A provider-neutral LLM layer routes tasks to local models like Ollama or cloud providers [7].
- **Entry Points**:
  - `public/index.html` served via Next.js rewrites for the browser/web interface [8].
  - `src-tauri/src/main.rs` for the Desktop/Tauri application [9].
  - Next.js App Router routes under `app/api/` for API access [10].

## Data, egress, authentication, and deployment boundaries
- **Data**: Data is stored in SQLite for local-first mode or Postgres via Drizzle ORM [4].
- **Egress**: The application integrates with external media APIs such as Hedra for video generation and ElevenLabs for text-to-speech [11]. It also utilizes research APIs including Brave Search, Tavily, Crossref, arXiv, PubMed, X API, and YouTube [12].
- **Authentication**: Authentication is handled via a local owner profile (disabled auth) or HTTP Basic Auth [13].
- **Deployment**: Deployment seams include a Tauri macOS DMG for desktop [14] and Next.js standalone output for Vercel/Docker deployment [15].

## Credible Prism GT integration seams
- `app/api/campaigns/route.ts` for project management integration.
- `app/api/pieces/[id]/route.ts` for script management.
- `app/api/pieces/[id]/review/route.ts` for coverage gates.
- `app/api/pieces/[id]/revision/route.ts` for AI revision.
- `app/api/pieces/[id]/outputs/route.ts` for artifact generation.
- `app/api/pieces/[id]/export/route.ts` for Fountain/FDX/PDF export.
- `app/api/hedra/generate/route.ts` for media generation.
- `app/api/gather/run/route.ts` for research gathering.
- Explicit unknowns remain regarding the exact integration mechanisms with the broader Prism GT ecosystem beyond the identified API routes.

## Controlled agent workflow
1. **Discovery**: Analyze the repository structure, identifying the dual-mode data layer, Next.js App Router backend, and Tauri desktop shell.
2. **Dependency and contract mapping**: Map dependencies across the TypeScript/React frontend, Rust backend, and external API integrations (Hedra, ElevenLabs, LLM providers).
3. **Implementation only after approval**: Implement integration logic only after explicit approval, ensuring provider keys remain server/native-side and stage gates are preserved.
4. **Testing**: Run the repository-specific validation matrix to ensure the integration does not break existing functionality.
5. **Documentation-draft creation**: Draft documentation reflecting the integration, noting the specific roles of the stage-gated AI pipelines.
6. **Exact-head evidence**: Record the exact commit SHA (`git rev-parse HEAD` at verification time) as evidence of the integration state.
7. **Independent remote verification**: Verify the remote state independently to ensure the integration is correctly applied.
8. **Canonical-ledger update**: Update the canonical integration ledger with the integration details.
9. **Signal Room promotion**: Change the registry from `pending` to `published` only after every promotion-gate artifact is complete and independently verified.

## Repository-specific validation matrix
| Command | Type | Description |
|---|---|---|
| `npm install` | Safe | Install dependencies |
| `npm run dev` | Safe | Start the development server |
| `npm run build` | Safe | Build the application |
| `npm run typecheck` | Safe | Run TypeScript type checking |
| `npm test` | Safe | Run tests |
| `npm run desktop:dev` | Safe | Start the Tauri desktop development environment |
| `npm run desktop:build` | Safe | Build the Tauri desktop application |
| `npm run db:generate` | Safe | Generate database migrations |
| Media generation verification | Credentialed | Verify media generation (requires Hedra/ElevenLabs keys) |

## Required evidence packet
- Successful execution logs of the validation commands.
- The generated `README.PRISM-GT-INTEGRATION.md` file.
- The exact commit SHA (`git rev-parse HEAD` at verification time).

## Safety and non-regression boundaries
- **AI Execution**: The application executes AI-generated code/prompts; ensure LLM outputs are sanitized before rendering or execution.
- **API Keys**: API keys for cloud providers (Hedra, ElevenLabs, Anthropic, etc.) must remain server-side and never be exposed to the client bundle.
- **Data Security**: Local-first mode stores data unencrypted in the user's app data directory; sensitive scripts should be protected by OS-level user access controls.
- **Authentication**: The HTTP Basic Auth gate uses plain text passwords in the environment; ensure `SITE_PASSWORD` is strong if deployed publicly.
- **Stage Gates**: Preserve stage gates and parser contracts; distinguish generated artifacts from approved production evidence.

## Documentation integration promotion gate
This repository must remain **documentation pending** in the Signal Room until every item below is complete. The presence of this guide alone does not satisfy the gate.

| Gate | Required evidence |
|---|---|
| Code-grounded discovery | Files, manifests, boundaries, and existing repository instructions inspected and cited in the integration draft |
| Ecosystem contract | Confirmed producer, consumer, protocol, data, security, and ownership boundaries with the other Prism GT repositories; unknowns remain explicitly labeled |
| Documentation package | Repository-specific architecture, setup, operations, security, troubleshooting, and integration documents added or updated |
| Draft pull request | A reviewable documentation pull request exists on a non-protected branch |
| Exact-head verification | The agent records `git rev-parse HEAD`, pull-request number and URL, branch name, check results, and independent remote verification |
| Canonical ledger | The canonical Prism GT integration repository records this repository and its evidence packet |
| Signal Room promotion | Only after the preceding gates pass may the registry status change from `pending` to `published` with the exact PR and head SHA |

## Canonical links
- [Signal Room production site](https://prism-gt-handoff-dashboard.vercel.app)
- [Canonical Prism-GT-Broadcast-Integration repository](https://github.com/jedisherpa/Prism-GT-Broadcast-Integration)

## References
[1]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/README.md "Observed Product Purpose"
[2]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/README.md "Skill 11 production pipeline logic"
[3]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/JACK_SCRIPT_MIGRATION.md "Repurposed from Pillar Press"
[4]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/db/schema.ts "Data Storage"
[5]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/README.md "Next.js App Router API routes"
[6]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/README.md "Tauri desktop shell"
[7]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/lib/llm/config.ts "LLM APIs"
[8]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/next.config.mjs "Browser/Web Entry Point"
[9]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/src-tauri/src/main.rs "Desktop/Tauri Entry Point"
[10]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/app/api/campaigns/route.ts "API Entry Point"
[11]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/docs/SERVER_README.md "Media APIs"
[12]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/docs/GATHER_BRIEF.md "Research APIs"
[13]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/middleware.ts "Authentication"
[14]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/src-tauri/tauri.conf.json "Desktop Deployment"
[15]: https://github.com/jedisherpa/jack-script/blob/a44c34039037d0e4707b4f298cadf1081b565364/next.config.mjs "Web/Cloud Deployment"
