# AI DevSchool Ecosystem Goal Specification

> **Source prompt:** [`docs/PROMPTS/-01_GOAL.md`](../../../docs/PROMPTS/-01_GOAL.md)  
> **Mapped:** 2026-06-26 · **Scope:** Large (ecosystem-wide)  
> **Canonical contracts:** [`engines/codexDojo/ecosystem/MANIFEST.md`](../../../engines/codexDojo/ecosystem/MANIFEST.md), [`curriculum/catalog.md`](../../../curriculum/catalog.md)

## Problem Statement

The learner wants a **multi-agent programming school** — inspired by MiniMax Agent Team long-running evolution — that runs on OpenClaw and Hermes and teaches through **practice, review, cross-technology comparison, metrics, and continuous iteration**. Small curriculum projects should grow into robust polyglot applications. The human must learn; agents orchestrate, verify, and compare — they must not replace reasoning or mark mastery without executable evidence.

Today the ecosystem has strong **documentation, orchestration seams, one verified project, and runnable apps**, but the **learning gate is blocked**, **17 projects are scaffolded-not-verified**, and **continuous OpenClaw/Hermes automation is planned but not deployed**.

## Goals

- [ ] ECO-04: Learner completes attempt + empirical gate before AI marks mastery or advances implementation
- [ ] ECO-03: Project 01 completes the full 5-phase cycle with adversarial verifier PASS
- [ ] ECO-05: At least 3 catalog projects reach `implemented` status with polyglot parity evidence
- [ ] ECO-10: OpenClaw/Hermes event bridge runs at least one unattended cycle end-to-end

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Treating scaffolded projects (02–18) as `implemented` | Catalog requires adversarial gate; code folders alone are insufficient |
| Mastery from docs/dashboard/substrate work | Learning gate rule: learner attempt + verifier evidence required |
| heropa-vlab or other workspaces | Different repo; not part of aidevschool goal |
| Resurrecting `engines/polyglotEvolutionArena/` | Demoted to `docs/design/polyglot-arena/` (proposal-only) |
| Benchmark superiority claims without N≥3 + CV caveats | MANIFEST evaluation model |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Primary orchestration surface for now | Claude Code (`miniMaxEvolutionEngine`) | Implemented with 18 `/devschool-*` commands; OpenClaw/Hermes auto is planned | y |
| Catalog source of truth | `curriculum/catalog.md` | MANIFEST and BACKLOG derive from it | y |
| Project 01 Node impl pre-exists | Reframe diagnostic as critique, not greenfield design | Documented in `curriculum/01_rate_limiter/docs/diagnostic.md` | y |
| Continuous scheduler timing | Defer until ECO-04 + Project 01 cycle complete | Gate integrity before automation scale | n |
| Hermes topic naming vs minimaxDojo agent names | Keep runbook topic schema; map at integration time | Runbook already defines 7 idempotent topics | n |

**Open questions:** Hermes continuous scheduler cadence and credential boundaries for unattended runs — resolve during ECO-10 design phase.

---

## User Stories

### P1: Close the learning gate on Project 01 ⭐ MVP

**User Story**: As a learner, I want my diagnostic attempt evaluated with executable evidence so that the system unlocks implementation practice without AI dependency.

**Why P1**: The entire ecosystem goal ("teach me to program better") is blocked while `gate.implementation_blocked: true` and U0 remains `presenting`. No other requirement delivers learner value until this closes.

**Acceptance Criteria**:

1. WHEN the learner submits the diagnostic (`curriculum/01_rate_limiter/docs/diagnostic.md` tasks 1–4) THEN `sonda` SHALL classify Dreyfus/Bloom dimensions in `learner/learner_profile.md`
2. WHEN the attempt is evaluated THEN `learner/learning_state.yaml` SHALL advance past `presenting` and set `gate.implementation_blocked: false` only after `unblock_condition: learner_attempt_evaluated` is satisfied
3. WHEN implementation practice begins THEN tests SHALL assert spec-defined outcomes (≥80% core coverage, ≥60% mutation when tooling available) verified by isolated `verifier` context
4. WHEN a unit is promoted to `mastered` THEN `units_log` SHALL contain `{id, mastered_at, evidence}` with executable proof paths

**Independent Test**: Complete diagnostic → run `/devschool-diagnose` → confirm `learning_state.yaml` shows `practicing` or `evaluating` with gate unblocked; streak remains 0 until empirical gate PASS.

---

### P2: Complete Project 01 five-phase cycle

**User Story**: As a learner, I want Project 01 to run spec → polyglot impl → review → benchmark → optimize with verifier gates so that I have one fully certified reference cycle.

**Why P2**: One verified project is the template for "small projects growing into robust applications." Pipeline is stuck at partial `impl`.

**Acceptance Criteria**:

1. WHEN Go and Rust implementations are produced THEN `go test -race -cover ./...` and `cargo test` SHALL pass with catalog-aligned coverage thresholds
2. WHEN Node impl is claimed done THEN isolated `verifier` SHALL re-validate (not trust pre-Ágora impl)
3. WHEN review phase completes THEN `code_review.md`, `learning_notes.md`, and `quiz.md` SHALL exist under `curriculum/01_rate_limiter/docs/`
4. WHEN benchmark phase completes THEN k6 scenarios SHALL run with N≥3 samples per MANIFEST benchmark rule
5. WHEN optimizer completes THEN `evolution_report.md` SHALL exist and `learner/pipeline_status.md` SHALL reach `cycle-complete` only after verifier PASS

**Independent Test**: Run validation commands from MANIFEST § Validation Commands for Project 01 + substrate; confirm `pipeline_status.md` phase is `cycle-complete`.

---

### P3: Scale curriculum with honest status labels

**User Story**: As a learner, I want projects 02–18 promoted from `scaffolded` to `implemented` one at a time so that the 18-project progression reflects real evidence, not folder presence.

**Why P3**: Goal requires evolutionary school across many projects; 17 rows are scaffolded with unverified code.

**Acceptance Criteria**:

1. WHEN a project moves to `implemented` THEN `curriculum/BACKLOG_STATUS.md`, `curriculum/catalog.md`, and `curriculum/<NN>/docs/status.md` SHALL be updated in the same change
2. WHEN a project is promoted THEN the 5-phase cycle + verifier PASS SHALL be recorded before catalog status changes
3. WHEN comparing languages THEN benchmark results SHALL use shared `curriculum/_shared/benchmarks/` and arena trust gating

**Independent Test**: Pick Project 02; run full cycle; confirm BACKLOG row shows `implemented` with evidence cell populated.

---

### P4: Deploy continuous OpenClaw/Hermes automation (future)

**User Story**: As a learner, I want the documented runbook to execute unattended so that the MiniMax long-running vision operates without manual Claude Code sessions.

**Why P4**: Explicit in `-01_GOAL.md` (OpenClaw + Hermes); currently `planned` per runbook automation boundary.

**Acceptance Criteria**:

1. WHEN a cycle event is emitted THEN Hermes payload SHALL include `cycle_id`, `unit_id`, `artifact_path`, and `content_hash`
2. WHEN the same `content_hash` is reprocessed THEN the consumer SHALL acknowledge and skip (idempotent)
3. WHEN verifier runs THEN it SHALL never share producer context (author ≠ verifier)
4. WHEN unattended schedule fires THEN at least one full unit transition SHALL complete without human prompt

**Independent Test**: Deploy event bridge; trigger `dojo.unit.selected` → `dojo.memory.updated` for a sandbox unit; confirm file artifacts and no duplicate processing.

---

## Edge Cases

- WHEN learner submits diagnostic without attempting tasks THEN `sonda` SHALL report `awaiting: learner_attempt` and keep gate blocked
- WHEN Node impl exists but learner never attempted THEN pipeline SHALL NOT mark U0 `mastered`
- WHEN benchmark CV ≥ 20% THEN system SHALL block speed superiority claims
- WHEN scaffolded project has passing local tests but no verifier PASS THEN catalog status SHALL remain `scaffolded`
- WHEN OpenClaw/Hermes bridge fails mid-cycle THEN conflict note SHALL be written and transition SHALL stop (fail-closed)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status | Evidence |
| --- | --- | --- | --- | --- |
| ECO-01 | P2 | Design | **Verified** | 14 tutor prompts + Claude Code subagents + verifier isolation |
| ECO-02 | P4 | Design | **Partial** | `OPENCLAW_HERMES_RUNBOOK.md` ✅; auto bridge ❌ |
| ECO-03 | P2 | Execute | **Partial** | 5-phase commands ✅; Project 01 cycle incomplete |
| ECO-04 | P1 | Execute | **Blocked** | Gate infra ✅; U0 `presenting`, 0 mastered units |
| ECO-05 | P2/P3 | Execute | **Partial** | 01 `implemented`; 02–18 `scaffolded` |
| ECO-06 | P2 | Execute | **Verified** | `_shared/arena/`, `_shared/benchmarks/`, `predictions.yaml` |
| ECO-07 | P1 | Execute | **Partial** | pitfalls/journal/FSRS ✅; no gate passes yet |
| ECO-08 | — | Execute | **Verified** | codexDojo 55 tests pass (2026-06-26) |
| ECO-09 | — | Execute | **Verified** | pixel-quest 23 tests pass + Playwright smoke |
| ECO-10 | P4 | Design | **Pending** | Runbook § automation boundary: `planned` |

**Coverage:** 10 total · 3 verified · 5 partial · 1 blocked · 1 pending

### Implementation map (current snapshot)

| Layer | Implemented | Partial / blocked | Not built |
| --- | --- | --- | --- |
| Architecture & contracts | MANIFEST, 14 agents, 18-project catalog, Allium specs | — | — |
| Orchestration | Claude Code motor, `.mavis/plans/plan.yaml`, manual runbook | Project 01 pipeline partial | OpenClaw↔Hermes bridge, scheduler |
| Learning gate | State machine, socratic agent, FSRS/streak | U0 diagnostic awaiting learner | Any `mastered` unit |
| Curriculum | Project 01 polyglot (tests green) | Go/Rust pipeline pending; N≥3 benchmark | 02–18 catalog verification |
| Apps | codexDojo, pixelDojo, learner substrate | Dashboard data stale until substrate regen | — |

---

## Success Criteria

How we know the ecosystem goal is successful:

- [ ] Learner has ≥1 unit at `mastered` with published verifier evidence (not self-report)
- [ ] Project 01 pipeline reaches `cycle-complete` with all three language impls verifier-validated
- [ ] `curriculum/catalog.md` shows ≥3 projects at `implemented` with honest benchmark evidence
- [ ] Learner can open codexDojo and see live gate state matching `learner/learning_state.yaml`
- [ ] At least one unattended OpenClaw/Hermes cycle completes end-to-end (ECO-10)

---

## Validation Commands

```bash
# Learning gate + substrate
python3 -m learner.substrate
python3 -m unittest discover -s learner/substrate/tests -t .

# Dashboard
cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build

# Teaching game
cd engines/pixelDojo/pixel-quest && pnpm run lint && pnpm run test && pnpm run build && pnpm run smoke

# Project 01 polyglot
cd curriculum/01_rate_limiter/node-impl && npm test
cd curriculum/01_rate_limiter/go-impl && go test -race -cover ./...
cd curriculum/01_rate_limiter/rust-impl && cargo test

# Engine contracts
python3 engines/miniMaxEvolutionEngine/.claude/commands/devschool/tests/test_phaserunner.py
python3 -m unittest engines.test_engine_contracts
```
