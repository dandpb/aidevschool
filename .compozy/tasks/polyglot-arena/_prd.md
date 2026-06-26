# PRD: Polyglot Comparison Arena

## Overview

The Polyglot Comparison Arena turns the curriculum's existing multi-language
implementations into **graded learning artifacts**. For a chosen challenge, AI
agents implement the solution in Go, Rust, and Node, benchmark them fairly, and
produce one **arena report** — a teaching narrative (which language wins each
metric and *why*, plus the concept to take away), a benchmark scoreboard, and an
annotated side-by-side code study. The report stays **locked** until the learner
commits a per-metric prediction.

**Problem it solves:** the knowledge of *why* a language wins a given problem is
scattered across per-project, per-language docs with no single "here's the
lesson" artifact, and passive reading of such material builds recognition, not
mastery.
**Who it's for:** the solo developer learning architecture and language
trade-offs (n=1 today; self-taught devs later).
**Why it's valuable:** it occupies a market gap no incumbent fills — narrative +
scoreboard + diff + a prediction gate as one learning artifact — while honoring
the ecosystem's learning gate.

## Goals

- **G1 (primary):** Ship only **trustworthy lessons** — every published
  comparison is fair (effort-budgeted, audited) and every narrative claim is
  verifier-confirmed against the numbers. Zero wrong lessons.
- **G2:** Prove the arena experience on **3 contrasting projects** (01
  rate_limiter, 02 key_value_store, 05 websocket_chat) — latency, memory, and
  concurrency "winner" shapes.
- **G3:** Convert passive study into active recall — **100% of reports** are
  preceded by a logged per-metric prediction (hard gate).
- **G4:** Produce durable learning — **≥2 transferable concepts** logged per
  report and a measurable per-metric prediction accuracy.
- **Milestone:** V1 complete when all three projects have a gate-passing,
  verifier-confirmed arena report on the dashboard.

## User Stories

**Primary persona — the Learner (solo developer):**

- As a learner, I want to **predict which language wins each metric** before
  seeing results, so that I commit a falsifiable hypothesis instead of nodding
  along to an answer.
- As a learner, I want a **narrative that explains *why* a language won, grounded
  in the measured numbers**, so that I take away a transferable concept, not a
  trivia fact.
- As a learner, I want to **see the same logic side by side in three languages
  with idiom callouts**, so that I understand *how* each language expresses the
  solution differently.
- As a learner, I want to **trust that the comparison is fair**, so that I don't
  internalize a wrong lesson from a rigged benchmark.
- As a learner, I want **my predictions and the actual outcomes recorded**, so
  that my calibration can be tracked over time (toward the V2 meter).

**Secondary persona — the Verifier (governance role, agent-enforced):**

- As the verifier, I want to **block any narrative claim not supported by the
  scoreboard or diff**, so that no unsupported "Rust won 3×" reaches the learner.
- As the fairness auditor, I want to **flag any implementation that is hand-tuned
  beyond its effort budget**, so that the benchmark measures languages, not
  uneven agent effort.

## Core Features

**F1 — Grounded teaching narrative (Critical).** The hero output. For each
metric, names the winner and explains *why* citing the measured number and the
relevant code difference; closes with one transferable concept. Asserts only what
the evidence supports.

**F2 — Per-metric prediction gate (Critical).** Before the report unlocks, the
learner commits a predicted winner for **latency, memory, and throughput** (plus
an optional one-line reason). Hard gate: the report is fully hidden until all
three are logged. Prediction + actual outcome + gap are recorded.

**F3 — Benchmark scoreboard (High).** Latency (p50/p95/p99), throughput, and
memory across the three languages, with statistical rigor (N≥3 runs, variance
gate) so rankings are trustworthy.

**F4 — Annotated side-by-side code study (High).** The same logic in Go/Rust/Node
laid out for reading, with callouts on how each language expresses the solution
(ownership, concurrency model, idiom).

**F5 — Fairness controls (High).** Each implementation carries a written effort
budget (idiomatic, not hand-tuned); an independent auditor agent checks each impl
for unfair handicapping before benchmarking; the run is reproducible so results
can be re-checked by perturbing inputs.

**Feature interaction:** F5 gates F3 (no benchmark runs on an unfair impl set);
F3 + F4 supply the evidence F1 may cite; F1 is verifier-confirmed before F2's gate
releases it; F2's record feeds the dashboard and the future calibration meter.

## User Experience

**Entry:** the learner runs the arena for a chosen project
(`/devschool-arena <project>`).
**Generation (unattended):** agents implement the three languages under effort
budgets, the auditor checks fairness, benchmarks run, the code study and narrative
are produced, and the verifier confirms every narrative claim against the numbers.
Nothing is shown yet.
**Prediction (hard gate):** the learner is prompted for three per-metric winners
and an optional reason. The report is locked until all three are committed.
**Reveal:** the full arena report appears as a Markdown artifact and surfaces on
the existing codexDojo dashboard. The learner sees, per metric, *their guess vs.
the measured winner*, the grounded "why," and the annotated code.
**Regular use:** repeat across the three V1 projects; each run logs concepts to
the learner journal and predictions to the calibration record.

UX considerations: prediction must be fast (three one-tap picks + optional text);
the guess-vs-result gap should be visually obvious at reveal (that gap is the
learning moment); the report must be self-contained and readable without tooling.

## High-Level Technical Constraints

- **Reuse, don't rebuild:** V1 is a projection over existing curriculum
  infrastructure (benchmark harness, producing/verifying agents,
  evidence→dashboard pipeline). No new engine, no new dashboard UI.
- **Producer ≠ verifier:** the agent that writes an implementation or narrative
  must not be the one that certifies its fairness or accuracy.
- **Auditable state:** predictions, outcomes, and reports are stored as
  human-readable Markdown/YAML/NDJSON under `learner/` and `curriculum/`; the
  filesystem is the source of truth.
- **Statistical trust:** benchmark rankings must meet the existing rigor bar (N≥3,
  variance-gated) before a winner is declared.
- **Source-of-truth boundary:** the arena report links and summarizes canonical
  per-language docs; it never duplicates raw evidence.

## Non-Goals (Out of Scope)

- **All-18-project coverage** — V1 covers 01/02/05 only; the rest is content,
  deferred.
- **"Fix the slow impl to beat the bench" graded mode** — the active-coding V2
  escalation.
- **Calibration meter / cross-run accuracy track-record** — needs a prediction
  corpus that only exists after several V1 runs.
- **Predict-ahead two-phase flow** — V1 predicts at reveal time; predicting from
  the bare spec is a V2 refinement.
- **Interactive dashboard viewer** (in-UI scoreboard/diff/prediction form) — V1
  reuses the existing dashboard as-is.
- **Generic multi-language benchmark framework** (autodiscovery, container
  matrices, per-language config schemas) — the over-build that demoted the prior
  design.

## Phased Rollout Plan

### MVP (Phase 1)

- F1–F5 on **project 01** (the verified baseline), reusing its known-good
  benchmarks to validate the report format end to end.
- **Success criteria to proceed:** one gate-passing, verifier-confirmed arena
  report; the prediction gate works; zero unsupported narrative claims.

### Phase 2

- Extend to **projects 02 and 05**, proving the pipeline generalizes across
  contrasting problem shapes.
- **Success criteria to proceed:** all three reports fair + verifier-confirmed;
  ≥2 concepts logged per report; per-metric predictions recorded for every run.

### Phase 3 (V2 candidates — out of this PRD's scope, listed for direction)

- Calibration meter, "fix the slow impl" graded mode, predict-ahead flow,
  cross-project comparison matrix, broader project coverage.

## Success Metrics

| Metric | Target | Perspective |
| ------ | ------ | ----------- |
| Reports that are fair + verifier-confirmed | 100% | Trust (primary, G1) |
| Projects with a complete gate-passing report | 3 of 3 (01/02/05) | Coverage (G2) |
| Reports preceded by a logged per-metric prediction | 100% | Engagement (G3) |
| Transferable concepts logged per report | ≥ 2 | Learning outcome (G4) |
| Per-metric prediction accuracy | Recorded (baseline established) | Calibration (seeds V2) |
| Time from "pick project" → report on dashboard | < 1 day, unattended | Pipeline health |

## Risks and Mitigations

- **Unfair comparison teaches the wrong lesson** (highest, adoption-killing): if a
  naive Node impl loses to a tuned Rust impl, the learner internalizes a false
  rule. → Effort budgets + independent fairness audit + reproducible runs the
  learner can perturb.
- **Narrative confabulation:** a plausible-but-unsupported "why." → Verifier
  confirms every claim against the numbers before reveal; unsupported claims are
  blocked.
- **Prediction friction suppresses use:** the gate feels like a chore. → Three
  one-tap picks + optional reason; reveal makes the guess-vs-result gap
  immediately rewarding.
- **Passive-reading relapse:** the learner treats reports as articles. → Hard gate
  (no peeking) plus the per-metric self-scoring keep engagement active.
- **Scope creep back toward a generic framework:** "while we're here, let's
  support any language." → Explicit non-goal; V1 proves on three projects first.
- **Single-user signal:** with n=1, metrics are anecdotal. → Treat V1 as a
  personal-validation bet; defer externalization until the loop demonstrably
  changes the learner's calibration.

## Architecture Decision Records

- [ADR-001: Polyglot Arena V1 — narrative-led projection with a prediction gate](adrs/adr-001.md)
  — V1 is a thin projection over existing substrate; narrative is the hero;
  prediction gate and benchmark fairness are in scope; 2–3 projects.
- [ADR-002: V1 experience — reveal-time per-metric prediction gate, CLI-triggered](adrs/adr-002.md)
  — per-metric predictions, hard gate, projects 01/02/05, reveal-time flow, no new
  dashboard UI.

## Open Questions

- **Effort-budget enforcement:** is "idiomatic, not hand-tuned" judged by the
  auditor agent alone, or does it need a written per-language rubric to be
  repeatable across projects?
- **Narrative verification depth:** does the verifier check every claim-to-metric
  link or a sample? (Full is safer; sampling is cheaper — G1 leans toward full.)
- **Concept logging:** who decides what counts as a "transferable concept" worth
  logging — the learner, an agent, or both?
- **Reason field on predictions:** required or optional? Required reasons enrich
  calibration but add friction.
