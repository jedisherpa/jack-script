# Package Status and Repository Identity

- **Repository:** `jedisherpa/jack-script`
- **Branch:** `main`
- **Commit:** `1676c549e438899a325471c32dc480e4f5f87d4b`
- **Package Status:** Proposed Documentation Architecture

## Source Freeze
The evidence for this documentation package is strictly bounded by the frozen source commit `1676c549e438899a325471c32dc480e4f5f87d4b` on the `main` branch. Current-state claims are derived exclusively from the files present at this exact point in time. Target architecture, implementation steps, and Prism GT contracts are proposed and unapproved owner-decision items, not implemented reality. Future changes or unmerged pull requests are not considered.

## Repository Role
`jedisherpa/jack-script` is a local-first screenwriting and stage-gated video production workstation. It is designed for the pre-edit production flow, including Brief, Script, Audio, Storyboard, and Animatic stages. The application operates in a dual-mode data layer, supporting local execution via SQLite and cloud execution via Postgres. It integrates with various LLM providers (e.g., Ollama, Anthropic, OpenAI) and media generation services (e.g., Hedra, ElevenLabs).

## Package Map
This canonical documentation package consists of the following files:
- `README.md`: Package status, source freeze, and repository role.
- `CURRENT_STATE.md`: Observed capabilities, architecture, and test coverage.
- `ROLE_IN_ECOSYSTEM.md`: Upstream/downstream dependencies and proposed integration seams.
- `TARGET_ARCHITECTURE.md`: Proposed architectural state for Prism GT integration.
- `INTEGRATION_CONTRACTS.md`: Observed and proposed API contracts.
- `IMPLEMENTATION_PLAN.md`: Phased approach for realizing the proposed target architecture.
- `TEST_AND_ACCEPTANCE_PLAN.md`: Baseline commands and proposed validation matrix.
- `RISKS_AND_OPEN_QUESTIONS.md`: Evidence-grounded risk register and owner decisions.
- `AGENT_HANDOFF.md`: Safe start commands and boundary conditions for automated agents.
- `implementation-manifest.yaml`: Machine-readable tracking of milestones and contracts.
- `generation-metadata.json`: Machine-readable generation route, provenance, and file lists.

## Evidence Boundary
The claims made in this package are based solely on the source code, configuration files, and documentation present in the repository at the frozen commit. The existing file `README.PRISM-GT-INTEGRATION.md` is explicitly identified as preparation evidence only and is not treated as proof of implementation, merge readiness, or live verification.

## References
- [Repository README](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/README.md)
- [Desktop Local First Docs](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/docs/DESKTOP_LOCAL_FIRST.md)
- [Server README](https://github.com/jedisherpa/jack-script/blob/1676c549e438899a325471c32dc480e4f5f87d4b/docs/SERVER_README.md)
