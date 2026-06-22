# Prompt Gap Implementation Plan

## TL;DR
> **Summary**: Implement the six remaining docs/PROMPTS idea gaps without reopening already-closed work or pretending the full curriculum is complete. This plan turns the audit into bounded product, contract, tracker, and verification slices.
> **Deliverables**:
> - richer metrics/benchmark dashboard surface
> - operational memory-curation contract and learner-state evidence updates
> - explicit OpenClaw/Hermes orchestration boundary and link validation
> - distributed-cache multi-node verification slice
> - curriculum backlog status tracker for Projects 02-18
> - Polyglot Evolution Arena status decision/scaffold
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Tasks 2-6 → Final Verification Wave

## Context

### Original Request
User asked: `@docs/PROMPTS// read all the ideias and compare with what were already implemented? identify the gaps.. the implemetations its follow the guidelines? implements all gaps`

### Interview Summary
- Prometheus mode interprets direct implementation requests as a request for a decision-complete work plan.
- Repository research found no `openspec/`, no `.specify/`, and no existing `.omo/plans/*.md` before this plan.
- Test strategy default: tests-after for docs/dashboard/orchestration slices; test-first for any distributed-cache behavior implementation because multi-node correctness is subtle.
- Closed work must not be reopened:
  - `engines/codexDojo/ecosystem/LEGACY_MIGRATION.md` legacy/refactor contract
  - codexDojo overview ecosystem cards
  - state-driven project briefing from roadmap cards
  - 10 user-facing agents vs 14 tutor-core agent split

### Metis Review (gaps addressed)
- **Scope creep risk**: Projects 02-18 are not fully implemented in this plan. They receive status/tracker/scaffold treatment only.
- **Benchmark honesty**: no fake numbers; missing metrics render as `not yet measured` / `planned`, not measured results.
- **Polyglot boundary**: remains proposal unless deliberately promoted with status labels and minimal scaffold.
- **Orchestration boundary**: do not invent a full runtime; create a deterministic checklist/link validation layer unless future work explicitly approves an event bridge.
- **Acceptance**: every task has deterministic file assertions and executable commands.

## Work Objectives

### Core Objective
Close the remaining prompt-to-implementation gaps at the ecosystem/product-contract level while preserving truthful status labels.

### Deliverables
- A status vocabulary used consistently: `implemented`, `scaffolded`, `planned`, `proposal`, `blocked`.
- Metrics surface that distinguishes measured values from planned/missing measurements.
- Memory curation contract with concrete owners, inputs, outputs, triggers, and learner evidence updates.
- OpenClaw/Hermes runbook boundary that validates existing files and avoids aspirational links.
- Distributed-cache multi-node verification artifact and smallest executable simulation/test target.
- Curriculum backlog tracker for Projects 02-18.
- Polyglot Evolution Arena status file and minimal scaffold decision.

### Definition of Done (verifiable conditions with commands)
- `cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build` passes.
- `cd /Users/danielbarreto/Development/aidevschool && python3 -m learner.substrate && python3 -m unittest discover -s learner/substrate/tests -t .` passes, unless Python dependency setup is missing; if missing, record exact failure in `.omo/evidence/final-learner-substrate.txt`.
- All new/updated MANIFEST rows reference existing files.
- No artifact claims projects 02-18 are implemented unless executable evidence exists.
- No benchmark card displays fabricated runtime values.

### Must Have
- Keep `curriculum/catalog.md` canonical for project list.
- Keep `learner/` canonical for learner state.
- Keep `engines/polyglotEvolutionArena/` marked proposal unless the task explicitly adds a scaffold and status file.
- Update `engines/codexDojo/ecosystem/MANIFEST.md` for any changed coverage contract.

### Must NOT Have
- No root-level package-manager commands; the repo root is not a single app.
- No generated/dependency output edits.
- No full implementation of Projects 02-18 in this plan.
- No production OpenClaw/Hermes event bridge unless separately approved.
- No fake benchmark, mutation, coverage, or mastery claims.

## Verification Strategy
> Verification checks are agent-executed with ZERO manual test steps. Final completion still requires the user’s explicit approval after the final verification wave reports results.
- Test decision: tests-after for documentation/dashboard/orchestration; test-first for distributed-cache behavior.
- QA policy: Every task has agent-executed happy and failure/edge scenarios.
- Evidence: `.omo/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan has a foundation wave, a broad implementation wave, and a final review wave.

Wave 1: Task 1 (foundation status vocabulary and link assertions)
Wave 2: Tasks 2-6 in parallel after Task 1
Wave 3: Final verification wave F1-F4

### Dependency Matrix (full, all tasks)
| Task | Depends on | Blocks |
| --- | --- | --- |
| 1. Status vocabulary and coverage assertions | none | 2,3,4,5,6 |
| 2. Metrics/benchmark surface | 1 | F1-F4 |
| 3. Memory curation loop | 1 | F1-F4 |
| 4. OpenClaw/Hermes orchestration boundary | 1 | F1-F4 |
| 5. Distributed-cache multi-node verification | 1 | F1-F4 |
| 6. Curriculum/polyglot backlog tracker | 1 | F1-F4 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Task count | Categories |
| --- | --- | --- |
| Wave 1 | 1 | quick |
| Wave 2 | 5 | quick, writing, deep, unspecified-high |
| Wave 3 | 4 | oracle, unspecified-high, deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add Shared Status Vocabulary and Coverage Assertions

  **What to do**:
  - Add a shared status vocabulary to `engines/codexDojo/ecosystem/MANIFEST.md` under a new `## Status Vocabulary` section: `implemented`, `scaffolded`, `planned`, `proposal`, `blocked`.
  - Add a deterministic MANIFEST consistency test in the most appropriate existing test surface. Preferred: `engines/codexDojo/src/progress.test.ts` if modeled as app data; otherwise create a small documentation assertion test under `engines/codexDojo/src/manifest.test.ts` that reads `ecosystem/MANIFEST.md` and asserts every backticked workspace path in Requested Deliverables Coverage exists, except explicitly external/historical `docs/PROMPTS` references.
  - If creating `manifest.test.ts`, use Node `fs`/`path` only; do not add dependencies.

  **Must NOT do**:
  - Do not mark aspirational paths as implemented.
  - Do not alter generated files or dependency outputs.

  **Recommended Agent Profile**:
  - Category: `quick` - small doc/test foundation.
  - Skills: [] - no special skill required.
  - Omitted: [`frontend-ui-ux`] - no UI work in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4,5,6] | Blocked By: []

  **References**:
  - Pattern: `engines/codexDojo/ecosystem/MANIFEST.md` - canonical coverage map.
  - Test: `engines/codexDojo/src/progress.test.ts` - existing data/query seam assertions.
  - Rule: `AGENTS.md` - root is not a package-manager project; codexDojo uses `pnpm` locally.

  **Acceptance Criteria**:
  - [ ] MANIFEST contains exact status labels `implemented`, `scaffolded`, `planned`, `proposal`, `blocked`.
  - [ ] A test fails if a MANIFEST coverage row points at a missing in-repo path without being explicitly marked proposal/historical.
  - [ ] `cd engines/codexDojo && pnpm run test -- --run` passes.

  **QA Scenarios**:
  ```
  Scenario: Happy path manifest references exist
    Tool: Bash
    Steps: cd engines/codexDojo && pnpm run test -- --run
    Expected: manifest/status vocabulary test passes with current MANIFEST.
    Evidence: .omo/evidence/task-1-status-vocabulary.txt

  Scenario: Failure guard catches missing path
    Tool: Bash
    Steps: Temporarily inject a missing backticked path into the MANIFEST test fixture or unit-test string, run the focused test, then revert the fixture/change.
    Expected: focused test fails on missing path before revert and passes after revert.
    Evidence: .omo/evidence/task-1-status-vocabulary-error.txt
  ```

  **Commit**: YES | Message: `test(codexDojo): assert manifest coverage paths` | Files: [`engines/codexDojo/ecosystem/MANIFEST.md`, test file]

- [x] 2. Expand Metrics and Benchmark Product Surface Without Fake Data

  **What to do**:
  - Extend `Metric` or add a new `BenchmarkMetric` type in `engines/codexDojo/src/domain.ts` with fields for `status`, `evidencePath`, and `measurement`.
  - Expand `engines/codexDojo/src/data/cycle.ts` or a new `src/data/metrics.ts` to include the evaluation model dimensions: correctness, type/API safety, test quality, maintainability, security, performance, operability, benchmark variance/CV%, AI dependency.
  - Update `engines/codexDojo/src/render/overview.ts` to render `measurement` only when present; otherwise render `not yet measured` plus the evidence path or next required artifact.
  - Update tests in `engines/codexDojo/src/render.test.ts` and `progress.test.ts` to assert no missing metric displays fake numbers and at least one planned metric shows `not yet measured`.
  - Update `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` only if the app data introduces a new label that is not already documented.

  **Must NOT do**:
  - Do not invent latency, throughput, coverage, mutation, or cost numbers.
  - Do not create a new dashboard route unless the existing overview becomes unreadable.

  **Recommended Agent Profile**:
  - Category: `quick` - TypeScript data/render/test change.
  - Skills: [`frontend-ui-ux`] - preserve existing dashboard visual language.
  - Omitted: [`perf-lighthouse`] - no performance audit required.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [F1-F4] | Blocked By: [1]

  **References**:
  - Pattern: `engines/codexDojo/src/data/ecosystem.ts` - static typed dashboard contract cards.
  - Pattern: `engines/codexDojo/src/render/overview.ts` - current metric strip rendering.
  - Contract: `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` - metric dimensions and gates.
  - Test: `engines/codexDojo/src/render.test.ts` - targeted render assertions.

  **Acceptance Criteria**:
  - [ ] Dashboard renders at least 8 evaluation/benchmark signals.
  - [ ] At least one metric with no measurement renders `not yet measured`.
  - [ ] No metric card contains a numeric measurement unless an evidence path is present.
  - [ ] `cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build` passes.

  **QA Scenarios**:
  ```
  Scenario: Metrics surface shows planned values honestly
    Tool: Playwright
    Steps: Start codexDojo dev server, open /, inspect overview metric cards.
    Expected: cards include broader evaluation dimensions and show `not yet measured` for missing evidence.
    Evidence: .omo/evidence/task-2-metrics-surface.yml

  Scenario: Missing evidence does not display fake measurement
    Tool: Bash
    Steps: cd engines/codexDojo && pnpm run test -- --run render.test.ts progress.test.ts
    Expected: tests assert missing measurements use placeholder/status text instead of fake numbers.
    Evidence: .omo/evidence/task-2-metrics-surface-error.txt
  ```

  **Commit**: YES | Message: `feat(codexDojo): expand honest metrics surface` | Files: [`src/domain.ts`, `src/data/*`, `src/render/overview.ts`, tests, optional `EVALUATION_MODELS.md`]

- [x] 3. Make Memory Curation Operational and Auditable

  **What to do**:
  - Add `engines/codexDojo/ecosystem/MEMORY_CURATION.md` defining trigger, owner, input, output, status label, evidence path, and verification command for memory updates after each cycle.
  - Update `engines/codexDojo/ecosystem/MEMORY_MODEL.md` to link `MEMORY_CURATION.md` and distinguish documented memory model from active learner-state updates.
  - Update `engines/codexDojo/ecosystem/MANIFEST.md` to reference `MEMORY_CURATION.md` under learning memory model.
  - Update `learner/learner_profile.md`, `learner/pitfalls.md`, and `learner/journal.md` with current evidence from the recently completed prompt-gap work: no mastery claim; record only reusable process lessons and known pitfalls.
  - Run learner substrate regeneration/tests and record exact output.

  **Must NOT do**:
  - Do not claim the learner mastered a programming concept from this docs/dashboard work.
  - Do not dump raw chat history into learner files.

  **Recommended Agent Profile**:
  - Category: `writing` - docs and learner memory curation.
  - Skills: [] - repo-specific docs are sufficient.
  - Omitted: [`ubiquitous-language`] - no glossary extraction required.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [F1-F4] | Blocked By: [1]

  **References**:
  - Contract: `engines/codexDojo/ecosystem/MEMORY_MODEL.md` - memory layers.
  - Data: `learner/learner_profile.md`, `learner/pitfalls.md`, `learner/journal.md` - learner substrate.
  - Command: `python3 -m learner.substrate` - derived-view regeneration.

  **Acceptance Criteria**:
  - [ ] `MEMORY_CURATION.md` exists and defines trigger/input/output/owner/evidence/status.
  - [ ] Learner updates contain curated lessons only, not raw transcript.
  - [ ] MANIFEST links the new curation contract.
  - [ ] `python3 -m learner.substrate` and substrate tests pass or exact missing-dependency failure is captured.

  **QA Scenarios**:
  ```
  Scenario: Memory curation contract is discoverable
    Tool: Bash
    Steps: test -f engines/codexDojo/ecosystem/MEMORY_CURATION.md && grep -q "Trigger" engines/codexDojo/ecosystem/MEMORY_CURATION.md
    Expected: file exists and contains trigger section.
    Evidence: .omo/evidence/task-3-memory-curation.txt

  Scenario: Learner substrate rejects/flags invalid state
    Tool: Bash
    Steps: cd /Users/danielbarreto/Development/aidevschool && python3 -m learner.substrate && python3 -m unittest discover -s learner/substrate/tests -t .
    Expected: commands pass, or exact environment failure is captured without claiming success.
    Evidence: .omo/evidence/task-3-memory-curation-error.txt
  ```

  **Commit**: YES | Message: `docs(codexDojo): add memory curation contract` | Files: [`MEMORY_CURATION.md`, `MEMORY_MODEL.md`, `MANIFEST.md`, `learner/*`]

- [x] 4. Define OpenClaw/Hermes Orchestration Boundary and Validate Links

  **What to do**:
  - Update `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md` with a `## Current Automation Boundary` section using exact status labels: documented manual workflow, checklist, executable script, agent command contract, future event bridge.
  - Add a checklist table mapping each orchestration artifact to an existing path: `engines/miniMaxEvolutionEngine/CLAUDE.md`, `engines/miniMaxEvolutionEngine/.claude/commands/devschool/phaserunner.md`, `.mavis/plans/plan.yaml`, learner substrate commands, verifier agent docs if present.
  - Add or extend a deterministic test that validates every in-repo path in the checklist exists. If codexDojo tests are used, create `src/orchestration-links.test.ts` with static path assertions using Node `fs`/`path`.
  - Update MANIFEST row 11 if wording currently implies more automation than exists.

  **Must NOT do**:
  - Do not build a new event bus/scheduler.
  - Do not claim OpenClaw/Hermes are running continuously if only docs/commands exist.

  **Recommended Agent Profile**:
  - Category: `quick` - docs plus path assertion test.
  - Skills: [] - local docs only.
  - Omitted: [`cloudflare-deploy`, `vlab-deploy`] - no deployment.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [F1-F4] | Blocked By: [1]

  **References**:
  - Contract: `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md` - runbook.
  - Runtime docs: `engines/miniMaxEvolutionEngine/CLAUDE.md`, `engines/miniMaxEvolutionEngine/.claude/commands/devschool/phaserunner.md`.
  - Manifest: `engines/codexDojo/ecosystem/MANIFEST.md` row for continuous execution workflow.

  **Acceptance Criteria**:
  - [ ] Runbook explicitly states the current automation level and future event bridge is not yet implemented.
  - [ ] Every path in the orchestration checklist exists.
  - [ ] MANIFEST does not overclaim continuous automation.
  - [ ] `cd engines/codexDojo && pnpm run test -- --run orchestration-links.test.ts` passes if that test file is created.

  **QA Scenarios**:
  ```
  Scenario: Existing orchestration paths validate
    Tool: Bash
    Steps: cd engines/codexDojo && pnpm run test -- --run orchestration-links.test.ts
    Expected: all listed paths exist.
    Evidence: .omo/evidence/task-4-orchestration-boundary.txt

  Scenario: Missing path guard fails
    Tool: Bash
    Steps: Temporarily add a fake path to the test fixture/checklist parser, run focused test, then revert.
    Expected: test fails on fake path and passes after revert.
    Evidence: .omo/evidence/task-4-orchestration-boundary-error.txt
  ```

  **Commit**: YES | Message: `docs(codexDojo): clarify orchestration boundary` | Files: [`OPENCLAW_HERMES_RUNBOOK.md`, `MANIFEST.md`, optional test]

- [x] 5. Add Distributed-Cache Multi-Node Verification Slice

  **What to do**:
  - In `engines/miniMaxEvolutionEngine/curriculum/10_distributed_cache/docs/status.md`, create/refresh a `## Remaining Multi-Node Gaps` section with status labels for gossip membership, remote shard routing, node removal, data migration, and failure simulation.
  - Add `docs/multinode_verification.md` in that project folder with the smallest next executable target: local simulated 3-node harness, seed keys across shards, assert reads route to owning node, remove one node, assert remap/migration status is reported.
  - If existing Go/Rust/Node implementations already expose a test harness, add one focused test in the language with the clearest existing test pattern. If no harness exists, do not invent a full runtime; add a pending verification checklist and mark status `planned`.
  - Update `docs/evolution_report.md` and `docs/code_review.md` to reference the multi-node gap status without claiming completion.

  **Must NOT do**:
  - Do not implement production gossip, consensus, or real cluster networking in this plan.
  - Do not mark distributed cache complete if only local cache tests pass.

  **Recommended Agent Profile**:
  - Category: `deep` - distributed-system gap requires careful existing-code inspection.
  - Skills: [] - no external docs needed unless implementation uses a library not already understood.
  - Omitted: [`cloudflare-deploy`] - no deployment.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [F1-F4] | Blocked By: [1]

  **References**:
  - Current status: `engines/miniMaxEvolutionEngine/curriculum/10_distributed_cache/docs/status.md`.
  - Code roots: `engines/miniMaxEvolutionEngine/curriculum/10_distributed_cache/{go-impl,rust-impl,node-impl}`.
  - Review/evolution docs: `docs/code_review.md`, `docs/evolution_report.md` in that project.

  **Acceptance Criteria**:
  - [ ] `docs/multinode_verification.md` exists with exact local simulation steps and expected outputs.
  - [ ] `docs/status.md` marks each known multi-node gap with `planned`, `blocked`, or `implemented` based on evidence.
  - [ ] If code test is added, relevant language test command passes.
  - [ ] If no code test is added, docs explicitly say `planned, not implemented`.

  **QA Scenarios**:
  ```
  Scenario: Multi-node gap status is truthful
    Tool: Bash
    Steps: grep -E "gossip|remote shard|node removal|migration" engines/miniMaxEvolutionEngine/curriculum/10_distributed_cache/docs/status.md
    Expected: each known gap appears with a truthful status label.
    Evidence: .omo/evidence/task-5-distributed-cache.txt

  Scenario: Local verification command does not overclaim
    Tool: Bash
    Steps: Run only the focused command documented in docs/multinode_verification.md, or if command is planned, grep for `planned, not implemented`.
    Expected: either executable test passes or planned status is explicit.
    Evidence: .omo/evidence/task-5-distributed-cache-error.txt
  ```

  **Commit**: YES | Message: `docs(distributed-cache): define multi-node verification` | Files: [`status.md`, `multinode_verification.md`, optional test/code, review/evolution docs]

- [x] 6. Add Curriculum Backlog Tracker and Polyglot Arena Status

  **What to do**:
  - Add `curriculum/BACKLOG_STATUS.md` with one row per canonical project from `curriculum/catalog.md`. Use exact statuses: Project 01 `implemented` if evidence remains valid; Projects 02-18 `planned` unless a folder/evidence package exists.
  - Update `engines/codexDojo/ecosystem/ROADMAP.md` to state it is a derived product summary and link `curriculum/BACKLOG_STATUS.md` for implementation status.
  - Add `engines/polyglotEvolutionArena/STATUS.md` with `proposal` status, current files, promotion criteria, and non-goals.
  - Update `engines/codexDojo/ecosystem/MANIFEST.md` rows for curriculum and polyglot surfaces to link the new status files.
  - Add deterministic tests or scripts only if existing test infrastructure can assert these docs without adding dependencies. Preferred: extend the MANIFEST path test from Task 1.

  **Must NOT do**:
  - Do not create 17 full project packages.
  - Do not claim Polyglot Evolution Arena is runnable.

  **Recommended Agent Profile**:
  - Category: `writing` - documentation and status tracking.
  - Skills: [] - local docs enough.
  - Omitted: [`nx-workspace`] - not an Nx workspace task.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [F1-F4] | Blocked By: [1]

  **References**:
  - Canonical projects: `curriculum/catalog.md`.
  - Product summary: `engines/codexDojo/ecosystem/ROADMAP.md`.
  - Proposal: `engines/polyglotEvolutionArena/project_proposal.md`, `bootstrap_prompt.md`.
  - Manifest: `engines/codexDojo/ecosystem/MANIFEST.md`.

  **Acceptance Criteria**:
  - [ ] `curriculum/BACKLOG_STATUS.md` has 18 project rows.
  - [ ] Project statuses use only the approved vocabulary.
  - [ ] `engines/polyglotEvolutionArena/STATUS.md` says `proposal`, not runnable/implemented.
  - [ ] ROADMAP links to the backlog status and does not claim all projects are built.
  - [ ] MANIFEST links both new status files.

  **QA Scenarios**:
  ```
  Scenario: Curriculum backlog has all 18 projects
    Tool: Bash
    Steps: grep -c '^| [0-9][0-9]_' curriculum/BACKLOG_STATUS.md
    Expected: count is 18.
    Evidence: .omo/evidence/task-6-backlog-polyglot.txt

  Scenario: Proposal-only arena is not overclaimed
    Tool: Bash
    Steps: grep -q '| Status | proposal |' engines/polyglotEvolutionArena/STATUS.md
    Expected: command exits 0 and no line claims runnable implementation.
    Evidence: .omo/evidence/task-6-backlog-polyglot-error.txt
  ```

  **Commit**: YES | Message: `docs(curriculum): track backlog and arena status` | Files: [`curriculum/BACKLOG_STATUS.md`, `ROADMAP.md`, `engines/polyglotEvolutionArena/STATUS.md`, `MANIFEST.md`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify every task maps to one of the six refreshed gaps and no closed gap was reopened.
  - Evidence: `.omo/evidence/f1-plan-compliance.md`
- [x] F2. Code Quality Review — unspecified-high
  - Review changed docs/tests/TS for maintainability, truthfulness, and repo conventions.
  - Evidence: `.omo/evidence/f2-code-quality.md`
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Run codexDojo locally, verify overview metrics and agent surfaces still work, and inspect console errors.
  - Evidence: `.omo/evidence/f3-manual-qa.md`
- [x] F4. Scope Fidelity Check — deep
  - Confirm no fake benchmark/mastery/orchestration claims and no generated/dependency output edits.
  - Evidence: `.omo/evidence/f4-scope-fidelity.md`

## Commit Strategy
- Commit each task or tightly coupled pair separately.
- Suggested order:
  1. `test(codexDojo): assert manifest coverage paths`
  2. `feat(codexDojo): expand honest metrics surface`
  3. `docs(codexDojo): add memory curation contract`
  4. `docs(codexDojo): clarify orchestration boundary`
  5. `docs(distributed-cache): define multi-node verification`
  6. `docs(curriculum): track backlog and arena status`
- Before each commit: inspect `git status`, stage only intended files, and avoid unrelated untracked artifacts.

## Success Criteria
- Six refreshed gaps have concrete artifacts or truthful status trackers.
- Closed work remains untouched unless a test references it.
- Product-level verification passes: `cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build`.
- Learner substrate verification is attempted and exact output captured.
- Final verification wave approves and user gives explicit okay before completion.
