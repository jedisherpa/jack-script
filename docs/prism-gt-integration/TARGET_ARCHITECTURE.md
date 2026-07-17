# Target Architecture

## Repository Identity
- **Repository:** `jedisherpa/jack-script`
- **Branch:** `main`
- **Commit:** `1676c549e438899a325471c32dc480e4f5f87d4b`

## Proposed Target State
The target architecture proposes integrating `jedisherpa/jack-script` into the broader Prism GT ecosystem. This integration is currently strictly proposed, as the frozen source evidence shows the application operating as an independent, local-first workstation. The target state envisions Jack Script acting as a specialized node for screenwriting and pre-edit video production within a larger, interconnected media pipeline.

## Component and Data Flows (Proposed)
- **Inbound Data Flow:** Prism GT services would push project briefs and reference materials into Jack Script via the `app/api/campaigns/route.ts` and `app/api/campaigns/[id]/references/route.ts` endpoints.
- **Outbound Data Flow:** Completed scripts, generated audio (via ElevenLabs), and animatics (via Hedra) would be exported from Jack Script to downstream Prism GT editing and rendering services using the `app/api/pieces/[id]/export/route.ts` and media asset endpoints.
- **State Synchronization:** Sync mechanism unknown pending owner decision. Proposed alternatives include a synchronization agent polling Jack Script's local SQLite database (or connected Postgres instance), API-based push, or cloud-mode sync to reflect stage-gate progress (Brief -> Script -> Audio -> Storyboard -> Animatic) in a centralized Prism GT dashboard, all pending explicit owner approval.

## Migration Boundary
The migration boundary requires adapting the existing standalone authentication model (`lib/auth.ts`) to accept delegated authorization tokens from the Prism GT identity provider. The dual-mode data layer (`lib/local/database.ts` vs `db/schema.ts`) must be preserved, ensuring that local-first desktop users can still operate offline while syncing to the ecosystem when online.

## Security and Operations Controls
- **API Key Management:** The strict server-side management of LLM and media generation API keys (`docs/SERVER_README.md`) must be maintained. Prism GT integration must not expose these keys to the client bundle.
- **Data Isolation:** The existing workspace and campaign scoping mechanisms must be rigorously enforced to prevent cross-tenant data leakage when operating in a cloud-connected Prism GT environment.

## Approval Dependencies
The realization of this target architecture is blocked pending explicit owner decisions on:
1. The authentication protocol for Prism GT service-to-service communication.
2. The data synchronization strategy (push vs. pull) for local-first desktop clients.
3. The exact schema mapping between Jack Script's internal `pieces` and Prism GT's global asset registry.

## References
- [Campaign API](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/app/api/campaigns/route.ts)
- [Auth Logic](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/auth.ts)
- [Local Database](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/local/database.ts)
