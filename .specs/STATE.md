# STATE

## Decisions

### AD-001
- **Decision**: Filesystem (`learner/`, `curriculum/`, `docs/`) is the source of truth for learner and pipeline state; `.mavis/` is derived.
- **Reason**: Auditability, no hidden DB state, multi-engine compatibility (Claude Code, Codex, OpenClaw, Hermes).
- **Trade-off**: Manual substrate regeneration required after learner edits.
- **Scope**: All features touching learner progress, dashboard snapshots, or gate state.
- **Date**: 2026-06-26
- **Status**: active (inherits from AGENTS.md / MANIFEST)

### AD-002
- **Decision**: Catalog status `implemented` requires adversarial verifier PASS across the 5-phase cycle; scaffolded folders with local tests are not sufficient.
- **Reason**: Prevents false progress from AI-generated bulk scaffolding (projects 02–18).
- **Trade-off**: Slower visible progress; honest backlog labels.
- **Scope**: `curriculum/catalog.md`, `curriculum/BACKLOG_STATUS.md`, all curriculum projects.
- **Date**: 2026-06-26
- **Status**: active

### AD-003
- **Decision**: ECO-10 (continuous OpenClaw/Hermes automation) is deferred until ECO-04 closes (learner attempt evaluated on U0) and Project 01 cycle completes.
- **Reason**: Automation ran ahead of the learner once (Node pre-fill); gate integrity before scale.
- **Trade-off**: Manual Claude Code orchestration continues for now.
- **Scope**: `.specs/features/ecosystem-goal/`, runbook automation boundary.
- **Date**: 2026-06-26
- **Status**: active

## Handoff

- **Feature**: ecosystem-goal / `.specs/features/ecosystem-goal/spec.md`
- **Phase / Task**: Specify complete → next: P1 Execute (learner diagnostic U0)
- **Completed**: Requirement map, formal spec, STATE decisions AD-001–AD-003
- **In-progress**: None
- **Next step**: Learner completes `curriculum/01_rate_limiter/docs/diagnostic.md` tasks 1–4, then run `/devschool-diagnose` or `/agora-continuum` for sonda evaluation.
- **Blockers**: `gate.implementation_blocked: true` · `active_unit.state: presenting` · `awaiting: learner_attempt`
- **Uncommitted files**: `.specs/features/ecosystem-goal/spec.md`, `.specs/STATE.md` (new)
- **Branch**: architecture-deepening
