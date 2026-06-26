# Idea: Polyglot Comparison Arena

## Overview

A learning lab where AI agents implement each curriculum challenge in **Go,
Rust, and Node**, and you learn the *trade-offs between languages* by predicting
and then studying a grounded comparison. Each run produces one per-project
**arena report** with a teaching narrative (which language won and *why*, plus
the concept to take away), a benchmark scoreboard (latency/throughput/memory,
N≥3), and an annotated side-by-side code study — but the report unlocks only
after you commit a **prediction**.

**For:** the solo developer learning architecture and language trade-offs by
analysis (you), with a future path to other self-taught devs.
**Why valuable:** it occupies a market gap no incumbent fills — narrative +
scoreboard + annotated diff as one learning artifact — while honoring the
ecosystem's learning gate via the prediction hook.
**V1 ambition:** deliberately small. ~70% of the infrastructure already exists;
V1 is a thin projection over it, proven on **2–3 projects**, not all 18.

## Problem

You want to learn *why* one language wins a given problem shape — the
architectural judgment of "given this kind of work, which trade-off am I actually
choosing?" Today that knowledge is scattered across
`curriculum/NN/docs/{benchmark_results,code_review,evolution_report}.md` per
project, per language, with no single artifact that says "Rust won here, and
here's the concept." The raw material exists; the *lesson* doesn't.

The existing tools each deliver a fragment. Raw benchmark sites give numbers
without pedagogy; single-language practice gives depth without comparison; syntax
cheatsheets give form without performance or "why." None of them connect
*measured behavior* to *a transferable concept* for a learner.

A pure "agents code, you read" lab would fail differently: passive reading
produces recognition ("yeah, that makes sense"), not mastery ("I could have
predicted that"). And an agent that writes all three implementations *and*
declares a winner is measuring its own per-language effort, not the languages — a
confident, wrong lesson the learner is least equipped to catch. V1 must defend
against both.

### Market Data

- **47.2M developers globally (2025)**; software industry ~$823.9B
  (SlashData/Keyhole).
- **Rust = #1 most admired language (72%, SO 2025)** and the fastest-growing
  major language (>2× since 2022); **Node/JS most-used (>60%)**;
  Python/TypeScript/Rust/Go are the top "want to learn next."
- The trade-off is real and quantifiable: Rust ≈ 2–3× Go ≈ 5–10× Node on
  throughput, but Node prototypes in days vs. Rust's ~3 months to productivity
  (DevPro/Markaicode) — *that gap is the lesson*.
- Multilingual code-gen eval went from 1 → 40 languages (2023–25;
  MultiPL-E/McEval), so the agent tech is mature.
- Per-report agent cost ≈ low single-digit dollars and falling ~80%/yr
  (CloudZero) — not a constraint for n=1.

## Summary / Differentiator

Incumbents miss the intersection: **Aider Polyglot / MultiPL-E** (model eval, not
learner-facing), **Computer Language Benchmarks Game / TechEmpower** (numbers, no
pedagogy), **Exercism** (single-language, no comparison), **Rosetta Code /
codeCompare** (code/syntax museum, no perf, no "why"). The arena's wedge is
**narrative + scoreboard + annotated diff + a prediction gate, as one learning
artifact for a solo dev** — pedagogy *plus* cross-language performance *plus*
active recall, which none of them combine.

## Core Features

| #  | Feature | Priority | Description |
| -- | ------- | -------- | ----------- |
| F1 | Grounded teaching narrative | Critical | The hero output. Declares the winner and *why*, citing measured metrics + the code diff; ends with one transferable concept. May assert only what the scoreboard/diff support. |
| F2 | Prediction gate (active recall) | Critical | Before the report unlocks, you commit a single prediction ("which language wins on latency, and why?"). The logged prediction + outcome is the learning-gate evidence; the guess-vs-measured gap is the lesson. |
| F3 | Benchmark scoreboard | High | Latency (p50/p95/p99), throughput, memory across the 3 languages, N≥3 runs, CV%<20% gate. Reuses the existing harness + `_shared/benchmarks/analyzer.py`. |
| F4 | Annotated side-by-side code study | High | The same logic in three languages with idiom callouts. Sourced from CRITICO's existing cross-language review. |
| F5 | Fairness controls | High | Each impl carries a written effort budget (idiomatic, not hand-tuned); a *second* agent audits each impl for unfair handicapping before benching; the run is learner-reproducible (perturb N/inputs/flags and watch the ranking move). |
| F6 | De-hardcoded runner seam | Medium | Extract `run_benchmark(project_dir, lang)` from the project-01 hardcode (reusing `analyzer.py`), validated against 01's known-good output. The one reusable investment; unlocks 2–3 projects in V1. |

## KPIs

| KPI | Target | How to Measure |
| --- | ------ | -------------- |
| Projects with a complete, gate-passing arena report | ≥ 2 of 18 (V1) | Count `curriculum/NN/docs/arena_report.md` files passing N≥3 / CV<20% / coverage≥80% |
| Reports where the narrative's claims are verifier-confirmed against numbers | 100% | PROMĘTOR check log (no unsupported claim reaches the learner) |
| Predictions logged before report reveal | 100% of reports | Prediction entries in `learner/` vs. reports generated |
| Transferable concepts logged to `learner/journal.md` per report | ≥ 2 | Count journal entries tagged to the arena report |
| Time from "pick project" → report on dashboard | < 1 day, unattended | Timestamp delta (run start → substrate refresh) |

## Feature Assessment

| Criteria | Question | Score |
| -------- | -------- | ----- |
| **Impact** | How much more valuable does this make the product? | Strong |
| **Reach** | What % of users would this affect? | Strong (all 18 projects; n=1 learner) |
| **Frequency** | How often would users encounter this value? | Strong (every project advancement) |
| **Differentiation** | Does this set us apart or just match competitors? | Must-do (unoccupied market intersection) |
| **Defensibility** | Is this easy to copy or does it compound over time? | Maybe → Strong with the calibration meter (V2) |
| **Feasibility** | Can we actually build this? | Must-do (~70% infra exists) |

Leverage type: **Compounding Feature** (the prediction log seeds a V2 calibration
meter).

## Council Insights

- **Recommended approach:** A narrative-led *projection* over existing substrate
  (`/devschool-arena` + thin `curriculum/_shared/arena/`), not a new engine. The
  arena report is an aggregation/view (`arena_report.md`) that links the
  canonical per-language docs; the narrative is the only net-new content. Gated by
  a learner prediction.
- **Key trade-offs:** Narrative (hard, risky, net-new) ≠ scoreboard/diff (easy,
  mostly exist) → don't treat them co-equally. "Agents code, you study" trades
  learning-by-doing for coverage → reclaimed partially by the prediction gate.
  Cover 2–3 projects deeply over 18 shallowly.
- **Risks identified:** (1) *Unfair agent-authored benchmarks teach the wrong
  lesson* → effort budgets + adversarial impl audit by a second agent +
  learner-reproducible runs. (2) *Narrative confabulation* → PROMĘTOR verifies
  claims against numbers (producer ≠ verifier). (3) *Runner-generalization scope
  creep* → extract only the `run_benchmark(project_dir, lang)` contract,
  validated against project 01.
- **Stretch goal (V2+):** "Fix the slowest impl to beat the bench"
  graded-challenge mode + a **calibration meter** (track guess-vs-reveal accuracy
  per problem-shape — "71% on memory winners, 40% on concurrency") to drive
  return + cross-project comparison matrix.

## Integration with Existing Features

| Integration Point | How |
| ----------------- | --- |
| `curriculum/01_rate_limiter/benchmarks/` harness + `_shared/benchmarks/analyzer.py` | Reused; runner de-hardcoded behind `run_benchmark(project_dir, lang)` |
| GALILEU / CRITICO / PROMĘTOR agents + `/devschool-{benchmark,review}` | Orchestrated by `/devschool-arena`; producer ≠ verifier preserved |
| `learner/learning_state.yaml` → `python -m learner.substrate` → `codexDojo/src/data/learner.ts` | Arena report + prediction outcome flow through the existing evidence→dashboard pipeline untouched |
| Canonical per-project docs (`benchmark_results.md`, `code_review.md`, `evolution_report.md`) | Remain the source of truth; `arena_report.md` links/summarizes, never duplicates |

## Out of Scope (V1)

- **All-18-project coverage** — the other 15 are content, not engineering; prove
  the pipeline on 2–3 first.
- **"Fix the slow impl to beat the bench" graded mode** — the ambitious active
  version; deferred to V2 to keep V1 shippable.
- **Calibration meter / cross-run track-record** — depends on a prediction-log
  corpus that only exists after several V1 runs.
- **Generic multi-language benchmark framework** (autodiscovery, container
  matrices, per-language config schemas) — a V3 platform masquerading as a V1
  prerequisite; the council flagged it as the trap that demoted the prior design.
- **New dashboard UI work** — the existing evidence→codexDojo pipeline renders
  arena results as-is.

## Architecture Decision Records

- [ADR-001: Polyglot Arena V1 — narrative-led projection with a prediction gate](adrs/adr-001.md)
  — V1 is a thin projection over existing substrate, narrative as hero,
  prediction gate in scope, benchmark-fairness mandatory, 2–3 projects.

## Open Questions

- **Prediction granularity:** one prediction per report (overall winner) or
  per-metric (latency/memory/throughput separately)? Per-metric gives richer
  calibration data but more friction.
- **Which 2–3 projects for V1?** Project 01 (verified, known-good baseline) is a
  given; which 1–2 scaffolded projects best exercise the runner seam and show
  contrasting winners?
- **Effort-budget enforcement:** is "idiomatic, not hand-tuned" judged by the
  auditing agent alone, or does it need a written per-language rubric to be
  repeatable?
- **Narrative verification depth:** does PROMĘTOR check every claim-to-metric
  link, or sample? Full is safer; sampling is cheaper.
