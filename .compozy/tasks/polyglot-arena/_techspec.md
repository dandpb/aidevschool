# TechSpec: Polyglot Comparison Arena

## Executive Summary

The arena is a **command-driven projection** over existing curriculum
infrastructure. A new `/devschool-arena <project>` command orchestrates a fixed
pipeline — produce/confirm the three impls → audit fairness → benchmark →
analyze → code-study review → narrate → verify → prediction gate → reveal →
refresh dashboard — reusing the existing `BenchmarkAnalyzer` (with its CV<20% /
N≥3 gates), the existing `dev-*`/`reviewer`/`verifier` agents, and the existing
`learner/` → substrate → codexDojo pipeline. Net-new is small: one extracted
runner module, two thin agents, an arena orchestration module, a per-project
`benchmark.yaml`, an `arena_report.md` template, and a structured
`predictions.yaml`.

**Primary technical trade-off:** we **extract and parameterize** the project-01
runner (a `run_benchmark(project_dir, lang, scenario, run)` seam + per-project
metadata) rather than build a generic benchmark framework. This buys reuse of the
proven analyzer and statistical gates and keeps V1 small, at the cost of a
one-time risky extraction of working project-01 code (mitigated by a mandatory
regression baseline) and the reality that projects 02/05 need their benchmark
harness authored in Phase 2.

## System Architecture

### Component Overview

| Component | New? | Responsibility |
| --------- | ---- | -------------- |
| `/devschool-arena <project>` command | new | Orchestrates the pipeline; owns state transitions and the prediction gate |
| `curriculum/_shared/arena/` (Python) | new | Orchestration helpers, report assembly, prediction logging |
| `curriculum/_shared/benchmarks/runner.py` | new (extracted) | `run_benchmark(project_dir, lang, scenario, run)` — generic k6 + docker-stats runner |
| `benchmark.yaml` (per project) | new | Declares images, container ports, host-port overrides, scenarios |
| `BenchmarkAnalyzer` (`analyzer.py`) | reused unchanged | Aggregates raw samples → `aggregated.json`; enforces CV<20% / N≥3 |
| `fairness-auditor` agent | new (judge) | Pre-benchmark audit of the 3 impls vs. effort budget |
| `arena-narrator` agent | new (producer) | Drafts `arena_report.md` narrative from scoreboard + code study |
| `verifier` / PROMĘTOR | reused | Re-checks every narrative claim vs. `aggregated.json` before reveal |
| `reviewer` / CRITICO, `dev-{go,rust,node}` | reused | Code study; implementation production |
| `learner/predictions.yaml` + substrate ext | new + modified | Structured prediction/outcome log; rendered into `LearnerSnapshot` |
| `arena_report.md` (per project) | new template | Learner-facing aggregation view linking canonical docs |

**Data flow:** `benchmark.yaml` → `runner.py` writes raw k6/stats JSON →
`analyzer.py` → `aggregated.json` (gated) → `arena-narrator` reads scoreboard +
CRITICO study → `arena_report.md` (locked) → `verifier` confirms claims → command
prompts per-metric predictions → on commit, append to `predictions.yaml` + reveal
report → `python3 -m learner.substrate` → `learner.ts` (dashboard).

**External interactions:** Docker + k6 (existing benchmark dependency); no network
services.

## Implementation Design

### Core Interfaces

> The arena layer is Python + Markdown agent specs + shell — there is no Go in it.
> Interfaces are shown in the actual stack.

**Runner seam** (`curriculum/_shared/benchmarks/runner.py`):

```python
def run_benchmark(
    project_dir: Path,      # e.g. curriculum/02_key_value_store
    lang: str,              # "go" | "rust" | "node"
    scenario: str,          # "baseline" | "stress" | ...
    run_num: int,           # 1..N
    cfg: "BenchmarkConfig", # parsed from benchmark.yaml
) -> dict:                  # {"metrics": {...}, "stats": {...}}  (k6 + docker stats)
    """Build/start the lang container per cfg, run one k6 scenario, capture
    docker stats, write results under {project_dir}/benchmarks/results/{lang}/
    {scenario}_run{run_num}.json (+ _stats.json), and return parsed samples."""
```

**Per-project benchmark config** (`benchmark.yaml`, parsed into `BenchmarkConfig`):

```yaml
images:     { go: kv-go,  rust: kv-rust,  node: kv-node }
ports:      { go: 8080,   rust: 8082,     node: 8081 }   # container ports
host_ports: { go: 18080 }                                # optional overrides (dev-machine conflicts)
scenarios:  [baseline, stress, spike, endurance]
```

**Arena orchestration entry** (`curriculum/_shared/arena/__init__.py`):

```python
def run_arena(project_dir: Path, n: int = 3) -> "ArenaResult":
    """Drive runner across (lang × scenario × n), call BenchmarkAnalyzer,
    fail closed if report.all_pass is False. Returns the aggregated report +
    the path to the assembled (still-locked) arena_report.md."""
```

**Reused analyzer contract (unchanged):**
`BenchmarkAnalyzer.analyze_raw_samples(project_id, raw_data) -> BenchmarkReport`;
gate via `report.all_pass` (CV<20% and N≥3 across the 4 scenarios × 3 languages).

### Data Models

**Prediction record** (`learner/predictions.yaml`, append-only):

```yaml
predictions:
  - project: "01_rate_limiter"
    run: "2026-06-25T18:00:00Z"   # supplied by the command; not read from clock inside arena logic
    metric: latency               # latency | memory | throughput
    predicted: rust               # go | rust | node
    actual: rust
    correct: true
    reason: "ownership avoids GC pauses"   # optional, one line
```

**LearnerSnapshot extension** (additive, rendered by the substrate):

```yaml
predictions:
  count: 9
  byMetric:
    latency:    { correct: 2, total: 3 }
    memory:     { correct: 1, total: 3 }
    throughput: { correct: 3, total: 3 }
```

**Arena report** (`curriculum/NN/docs/arena_report.md`): frontmatter (`project`,
`run`, `gate: locked|revealed`) + sections: Prediction (filled at gate),
Scoreboard (table from `aggregated.json`), Narrative (per-metric winner + grounded
why + one concept), Code Study (links/embeds CRITICO output), Links (to canonical
`benchmark_results.md`, `code_review.md`).

### Command & File Contracts

No HTTP API. The surface is one command plus file artifacts.

- **`/devschool-arena <project>`** — argument: project slug (e.g.
  `02_key_value_store`). Preconditions: `benchmark.yaml` + the three `*-impl/`
  dirs exist. Effects: writes `benchmarks/results/**`, `aggregated.json`,
  `arena_report.md`, appends `predictions.yaml`; triggers substrate refresh.
- **Prediction gate (interactive):** the command prompts three per-metric winners
  (+ optional reason); the report stays `gate: locked` until all three commit.

## Integration Points

- **Docker + k6** — existing benchmark dependency invoked by `runner.py`; auth:
  none (local). Retry: a scenario whose samples fail the CV/N gate is re-run up to
  N; persistent failure fails the run closed (no report revealed).
- **Substrate** (`python3 -m learner.substrate`) — reads the new
  `predictions.yaml`, writes the additive `predictions` field into `learner.ts`;
  existing outputs unchanged.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
| --------- | ----------- | -------------------- | --------------- |
| `curriculum/01_rate_limiter/benchmarks/` | modified | Runner logic lifted to `_shared`; risk of behavior drift | Diff extracted-runner output vs. committed `aggregated.json` baseline |
| `curriculum/_shared/benchmarks/runner.py` | new | Generic runner; medium risk (docker/port handling) | Build + validate on 01, then 02/05 |
| `curriculum/_shared/arena/` | new | Orchestration; low risk | Build after runner |
| `analyzer.py` | unchanged | Reused as-is | None |
| `learner/predictions.yaml` + substrate | new + modified | Additive snapshot field; low risk (non-breaking) | Extend substrate reader + snapshot |
| `learning_state.yaml` / its schema | unchanged | Deliberately untouched (ADR-004) | None |
| `.claude/agents/{fairness-auditor,arena-narrator}.md` | new | Two thin agents | Author in existing format |
| `.claude/commands/devschool/arena.md` | new | Orchestrator | Author after agents + module |
| projects 02, 05 | modified | Need `benchmark.yaml` + k6 scenarios + bench Dockerfiles (absent today) | Phase 2 authoring |

## Testing Approach

### Unit Tests

- `runner.py`: `benchmark.yaml` parsing (defaults, host-port overrides),
  result-path construction, k6/stats JSON parsing into the analyzer's expected
  `{scenario: {lang: [samples]}}` shape. Mock docker/k6 subprocess calls.
- `arena/` report assembly: given a fixed `aggregated.json` + a stub code study,
  the assembled `arena_report.md` contains the right per-metric winners and stays
  `gate: locked` until predictions are written.
- `predictions.yaml` append + the substrate `byMetric` aggregation (correct/total
  counts).
- Critical edge: a sub-gate report (`all_pass == False`) must **not** produce a
  revealable report.

### Integration Tests

- **Regression baseline (mandatory):** run the extracted runner on project 01 and
  assert the aggregated output matches the committed project-01 `aggregated.json`
  within tolerance.
- **End-to-end MVP:** `/devschool-arena 01_rate_limiter` produces a
  verifier-confirmed, gate-passing `arena_report.md`; the prediction gate blocks
  reveal until three predictions are logged; `predictions.yaml` and the dashboard
  field update after substrate run.
- Environment deps: Docker + k6 available; the three project-01 images buildable.

## Development Sequencing

### Build Order

1. **Extract runner seam** — `runner.py` + `benchmark.yaml` for project 01;
   validate output against project-01's committed `aggregated.json`. *No
   dependencies.*
2. **Arena orchestration module** — `_shared/arena/` calling `runner.py` +
   `analyzer.py`, failing closed on `all_pass == False`. *Depends on 1.*
3. **Prediction store + substrate extension** — `predictions.yaml` format, append
   helper, substrate reader, additive `LearnerSnapshot.predictions`. *Depends on
   the record schema only; integrated in step 6.*
4. **`fairness-auditor` agent** — Markdown spec (no Write tools), effort-budget
   audit, pass/flag verdict. *No code dependency; consumed in step 6.*
5. **`arena-narrator` agent** — Markdown spec (producer), grounded narrative from
   scoreboard + code study. *No code dependency; consumed in step 6.*
6. **`/devschool-arena` command** — wire the full pipeline: dev-{go,rust,node} →
   fairness-auditor → arena module (runner+analyzer) → reviewer → arena-narrator →
   verifier → prediction gate → reveal → substrate. *Depends on 2, 3, 4, 5.*
7. **`arena_report.md` template + MVP run on project 01** end-to-end (Phase 1
   success criteria). *Depends on 6.*
8. **Phase 2: author benchmark harness for 02 and 05** (`benchmark.yaml` + k6
   scenarios + bench Dockerfiles), then run the pipeline. *Depends on 7.*

### Technical Dependencies

- Docker + k6 on the dev machine (existing).
- Project-01 images buildable (regression baseline in step 1).
- Effort-budget rubric drafted before step 4 can audit meaningfully (see Known
  Risks / Open Questions).

## Monitoring and Observability

- **Per run:** log gate outcomes — `all_pass`, per-scenario CV%/N, fairness
  verdict (pass/flag), verifier result (claims checked / blocked). Structured
  fields: `project`, `run`, `lang`, `scenario`, `cv_percent`, `passes_cv`,
  `passes_n`.
- **Artifacts as audit trail:** `aggregated.json`, `arena_report.md` frontmatter
  (`gate`), `predictions.yaml` are the durable record (filesystem = source of
  truth).
- **Alert condition (manual):** any revealed report whose narrative contains a
  claim not present in `aggregated.json` — this is the G1 failure mode and must be
  impossible by construction (verifier blocks it); surface verifier-block counts
  per run.

## Technical Considerations

### Key Decisions

- **Extract-and-parameterize over generic framework** (ADR-003). Rationale: reuse
  the proven analyzer + gates, keep V1 small. Trade-off: a one-time risky
  extraction + 02/05 harness authoring later. Rejected: a generic multi-language
  benchmark framework (the over-build that demoted the prior design).
- **Dedicated `predictions.yaml`** (ADR-004). Rationale: structured calibration
  data without a breaking change to the four-consumer `learning_state.yaml`
  schema. Trade-off: a second state file. Rejected: extending `units_log` reviews
  (breaking) or journal prose (unstructured).
- **Two new agents + reused verifier** (ADR-005). Rationale: producer ≠ verifier
  at both risk points (impl fairness, narrative truth). Trade-off: two extra
  pipeline stages. Rejected: a single combined arena agent (producer = verifier).

### Known Risks

- **Runner extraction drifts from project-01 behavior** (medium) → regression
  baseline diff in step 1 is a gate, not a nicety.
- **02/05 scenarios don't mirror 01** (medium) → scenarios are per-project in
  `benchmark.yaml`; do not assume portability.
- **Fairness rubric subjectivity** (medium) → start with a written per-language
  effort-budget rubric; the auditor is only as good as the rubric. Needs drafting
  before step 4 (flagged as an open question).
- **Fairness auditor false-confidence** (low–medium) → learner-reproducible runs
  (perturb N/inputs) provide an independent sanity check on rankings.

## Architecture Decision Records

- [ADR-001: Polyglot Arena V1 — narrative-led projection with a prediction gate](adrs/adr-001.md)
  — V1 scope: thin projection, narrative hero, prediction gate, 2–3 projects.
- [ADR-002: V1 experience — reveal-time per-metric prediction gate, CLI-triggered](adrs/adr-002.md)
  — per-metric hard gate, projects 01/02/05, no new dashboard UI.
- [ADR-003: Arena orchestration — `/devschool-arena` command + extracted runner seam](adrs/adr-003.md)
  — command-driven pipeline; `run_benchmark` seam + per-project `benchmark.yaml`;
  analyzer reused.
- [ADR-004: Prediction + outcome storage — dedicated `learner/predictions.yaml`](adrs/adr-004.md)
  — structured, non-breaking calibration log surfaced via the substrate.
- [ADR-005: Agent topology — fairness-auditor + arena-narrator, verifier reused](adrs/adr-005.md)
  — producer ≠ verifier at impl-fairness and narrative-truth checkpoints.

## Open Questions

- **Effort-budget rubric** — what concrete per-language criteria define
  "idiomatic, not hand-tuned"? Needed before the fairness auditor is meaningful
  (blocks step 4's usefulness, not its build).
- **Narrative verification depth** — verifier checks every claim-to-metric link
  (G1 leans here) vs. sampling. Default: full.
- **Scenario authoring for 02/05** — reuse 01's four scenarios adapted, or design
  problem-shape-specific scenarios (memory-pressure for 02, connection-churn for
  05)? Affects Phase-2 effort.
- **Concept logging** — who authors the ≥2 transferable concepts per report
  (arena-narrator proposes, learner confirms)?
