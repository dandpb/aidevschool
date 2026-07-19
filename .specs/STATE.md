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

### AD-004
- **Decision**: `engines/miniTown/` é promovido a engine de primeira classe e posicionado como a entrada cozy (Nível 0) do público não-técnico na visão dual-audience.
- **Reason**: Decisão do Daniel (2026-07-19) sobre a pergunta aberta do AUDIT_ENGINES_CURRICULUM; engine pronto (31/31 testes) e único sem pressupor código.
- **Trade-off**: Mais uma superfície no inventário para manter; posicionamento antecede trilha pedagógica completa.
- **Scope**: engines/AGENTS.md, MANIFEST, handbook, VISION.md, catalog.
- **Date**: 2026-07-19
- **Status**: active

### AD-005
- **Decision**: A trilha não-técnica vive no mesmo catálogo canônico como Nível 0 (`00_ai_in_practice`, status inicial `planned`), não como currículo separado por engine.
- **Reason**: Preserva "1 aprendiz, 1 currículo, vários motores"; decisão do Daniel (2026-07-19).
- **Trade-off**: Exige suporte do parser/substrato a Level 0 e fase nova no dashboard.
- **Scope**: curriculum/catalog.md, learner/substrate/catalog.py, codexDojo domain.
- **Date**: 2026-07-19
- **Status**: active

### AD-006
- **Decision**: Unidades da trilha 00 usam um gate no-code (attempt = log escrito; evidência = checklist falsificável verificado pelo Prometor; `gate_kind: no_code`), explicitamente mais fraco que evidência executável e nunca aplicável a unidades de código.
- **Reason**: Estender o roster aos não-técnicos sem corromper a régua das unidades de código.
- **Trade-off**: Duas classes de evidência coexistem; exige disciplina de rotulagem no units_log.
- **Scope**: ADR em docs/design/adr/, prompts do roster, learner.yaml (perfil_pedagogico.modo).
- **Date**: 2026-07-19
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
