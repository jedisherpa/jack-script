# Agent Handoff

## Repository Identity
- **Repository:** `jedisherpa/jack-script`
- **Branch:** `main`
- **Commit:** `1676c549e438899a325471c32dc480e4f5f87d4b`

## Safe Start Review of Commands Present in Frozen Source
Automated agents interacting with this repository note the following commands are present in `package.json`. No commands were run by this package, and they are not certified as safe without execution or owner evidence:
- `npm install`: Install dependencies.
- `npm run typecheck`: Verify TypeScript typings without emitting files.
- `npm test`: Execute the Vitest test suite.
- `npm run build`: Build the Next.js standalone application.
- `npm run desktop:build`: Build the Tauri desktop application (requires Rust/Cargo environment).

### Mutating Commands (Require Owner Approval)
- `npm run db:generate`: Generates database migrations via Drizzle. This is a mutating command and requires explicit owner approval before execution.

## Prohibited Actions
- **Do not execute `npm run db:migrate` or `npm run db:push`** against a production database without explicit owner approval, as these alter schema state.
- **Do not expose API keys** (`HEDRA_API_KEY`, `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`) in client-side code, logs, or documentation. They must remain strictly server-side.
- **Do not modify the dual-mode data architecture.** The separation between local-first SQLite (`lib/local/database.ts`) and cloud Postgres (`db/schema.ts`) is a core architectural requirement.
- **Do not claim Prism GT integration is complete.** The integration is strictly proposed based on the frozen evidence.

## Package Map
- `README.md`: Package status and repository role.
- `CURRENT_STATE.md`: Observed capabilities and architecture.
- `ROLE_IN_ECOSYSTEM.md`: Upstream/downstream relationships.
- `TARGET_ARCHITECTURE.md`: Proposed Prism GT integration architecture.
- `INTEGRATION_CONTRACTS.md`: Observed and proposed APIs.
- `IMPLEMENTATION_PLAN.md`: Proposed steps for integration.
- `TEST_AND_ACCEPTANCE_PLAN.md`: Testing commands and proposed matrix.
- `RISKS_AND_OPEN_QUESTIONS.md`: Risk register and required decisions.
- `implementation-manifest.yaml`: Machine-readable tracking.
- `generation-metadata.json`: Machine-readable generation route and provenance.

## Remaining Work and Done Conditions
The integration of Jack Script into the Prism GT ecosystem remains pending. The following conditions must be met for the integration to be considered "done":
1. Owner approval of the proposed integration contracts.
2. Implementation of the authentication and synchronization logic.
3. Passing of all integration tests defined in the `TEST_AND_ACCEPTANCE_PLAN.md`.
4. Independent remote verification of the documentation-only draft PR branch/head/files/draft state. (Live deployed integration verification is reserved for a future owner-approved implementation project).

## Owner Sign-Off Boundary
Any modifications to cross-repository contracts, authentication mechanisms, or database schemas require explicit sign-off from the repository owner before being merged into the `main` branch.

## References
- [Package JSON](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/package.json)
- [Local Database](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/lib/local/database.ts)
- [Database Schema](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/db/schema.ts)
