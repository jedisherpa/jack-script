# Risks and Open Questions

## Repository Identity
- **Repository:** `jedisherpa/jack-script`
- **Branch:** `main`
- **Commit:** `1676c549e438899a325471c32dc480e4f5f87d4b`

## Evidence-Grounded Risk Register

1. **Dual-Mode Data Synchronization Conflict:**
   - *Observation:* The application supports both a local SQLite database (`lib/local/database.ts`) and a cloud Postgres database (`db/schema.ts`).
   - *Risk:* Integrating with Prism GT requires synchronizing state. If a user modifies a script offline via the desktop app while Prism GT pushes an update to the cloud database, a merge conflict will occur. The frozen source lacks a robust conflict resolution mechanism for this specific scenario.

2. **API Key Management in Hybrid Environments:**
   - *Observation:* `docs/SERVER_README.md` mandates that API keys (Hedra, ElevenLabs) remain server-side. However, the desktop application (`src-tauri/`) bundles a local Node server.
   - *Risk:* If Prism GT integration requires the desktop application to directly communicate with external APIs on behalf of the ecosystem, securing these keys within the distributed desktop binary presents a significant security risk.

3. **LLM Provider Rate Limiting:**
   - *Observation:* The application relies heavily on LLMs for stage-gated reviews (`lib/gates.ts`).
   - *Risk:* If Prism GT integration significantly increases the volume of automated requests routed through Jack Script, the configured LLM providers (especially local Ollama instances) may face severe rate limiting or performance degradation.

## Contradictions and Unknowns
- **Prism GT Integration Status:** The file `README.PRISM-GT-INTEGRATION.md` exists but explicitly states it is "preparation evidence only, not runtime integration or publication evidence." The exact mechanism by which Jack Script will communicate with Prism GT remains unknown and undocumented in the executable source.
- **Authentication Model:** The current authentication model (`lib/auth.ts`) is designed for a standalone application. It is unknown how this will map to the centralized identity provider expected by the Prism GT ecosystem.

## Owner Decisions and Stop Conditions
The following issues represent publication stop conditions for the implementation phase and require explicit owner decisions:
- **Decision Required:** Define the authoritative source of truth (Local SQLite vs. Cloud Postgres) when resolving synchronization conflicts with Prism GT.
- **Decision Required:** Approve the specific authentication protocol (e.g., OAuth2, JWT) to be used for service-to-service communication.
- **Stop Condition:** Implementation must not proceed until the security model for API key distribution in the Tauri desktop application is formally approved by the security owner.

## References
- [Local Database](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/local/database.ts)
- [Server README](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/docs/SERVER_README.md)
- [Auth Logic](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/auth.ts)
