# Integration Contracts

## Repository Identity
- **Repository:** `jedisherpa/jack-script`
- **Branch:** `main`
- **Commit:** `1676c549e438899a325471c32dc480e4f5f87d4b`

## Observed Interfaces

### External Media Generation (Observed)
- **Status:** `observed_external_dependency_unapproved`
- **Owner:** external provider owner unknown/not recorded in frozen source
- **Producer:** Hedra API, ElevenLabs API
- **Consumer:** `jedisherpa/jack-script` (`lib/hedra.ts`, `lib/elevenlabs.ts`)
- **Payload/Protocol:** REST/JSON over HTTPS. Multipart form data for asset uploads.
- **Security:** Server-side API keys (`docs/SERVER_README.md`).
- **Errors:** Mapped to safe HTTP responses via `lib/errors.ts`.
- **Versioning:** external provider versioning unknown/not recorded in frozen source.
- **Approval Boundary:** not approved/locked by this package.

### LLM Provider Routing (Observed)
- **Status:** `observed`
- **Owner:** external provider owner unknown/not recorded in frozen source
- **Producer:** Anthropic, OpenAI, Gemini, Ollama (provider owners/versioning are outside the frozen repository evidence)
- **Consumer:** `jedisherpa/jack-script` (`lib/llm/providers/`)
- **Payload/Protocol:** REST/JSON over HTTPS (or HTTP for local Ollama). Standardized internal types in `lib/llm/types.ts`.
- **Security:** Server-side API keys or local desktop runtime configuration.
- **Errors:** Mapped to safe HTTP responses.
- **Versioning:** external provider versioning unknown/not recorded in frozen source.
- **Approval Boundary:** unapproved by this documentation package.

## Proposed Interfaces

### Prism GT Project Sync (Proposed)
- **Status:** Proposed
- **Owner:** Pending Owner Decision
- **Producer:** Prism GT Ecosystem Dashboard
- **Consumer:** `jedisherpa/jack-script`
- **Payload/Protocol:** Proposed REST/JSON via `app/api/campaigns/route.ts`.
- **Security:** Requires implementation of a shared authentication mechanism, replacing or augmenting the current local owner profile.
- **Errors:** proposed/unknown
- **Versioning:** proposed/unknown
- **Approval Boundary:** pending named owner decision

### Prism GT Asset Export (Proposed)
- **Status:** Proposed
- **Owner:** Pending Owner Decision
- **Producer:** `jedisherpa/jack-script`
- **Consumer:** proposed Prism GT downstream consumers, exact owner/service unknown pending decision
- **Payload/Protocol:** Proposed REST/JSON and binary file transfer via `app/api/pieces/[id]/export/route.ts`.
- **Security:** Requires authorized access tokens to retrieve sensitive script and media files.
- **Errors:** proposed/unknown
- **Versioning:** proposed/unknown
- **Approval Boundary:** pending named owner decision

## Frozen source boundary

This document is limited to the exact repository, branch, and frozen source commit recorded in the package metadata and cited references. Later remote changes require a new source freeze and independent review.

## References
- [Hedra Client](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/hedra.ts)
- [LLM Types](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/llm/types.ts)
- [Error Handling](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/errors.ts)
