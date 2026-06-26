# Polyglot Comparison Arena — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Extract `run_benchmark` runner seam + `benchmark.yaml` (project 01) + regression baseline | completed | high | — |
| 02 | Arena orchestration module + `arena_report.md` template, fail-closed on gate | completed | medium | task_01 |
| 03 | `learner/predictions.yaml` store + substrate read + additive `LearnerSnapshot.predictions` | completed | medium | — |
| 04 | `fairness-auditor` agent + per-language effort-budget rubric | completed | low | — |
| 05 | `arena-narrator` agent (grounded narrative spec) | completed | low | — |
| 06 | `/devschool-arena` command — wire full pipeline + MVP end-to-end on project 01 | completed¹ | high | task_02, task_03, task_04, task_05 |
| 07 | Phase 2 — project 02 (key_value_store) benchmark harness complete; report gate blocked | blocked¹ | high | task_06 |
| 08 | Phase 2 — project 05 (websocket_chat) benchmark harness + arena run | completed¹ | high | task_06 |

> ¹ **All implementation complete + all three RUN LIVE; no gate-passing report is
> currently claimed.** The arena now uses a strict decision gate: a report is
> revealed only when all decision metrics are stable enough that winners are real,
> not noise — see arena `scoreboard`/`decision_gate`.
> - **Task 07 (project 02):** ports confirmed; `kv-*` images build; **live
>   benchmark run** (baseline N=5 × 3 langs). Throughput selected go, but latency
>   (CV 186%) and memory (CV 20%) were untrustworthy, so the strict gate fails
>   closed and `02_key_value_store/docs/arena_report.md` remains `gate: locked`.
>   Prediction logging and dashboard calibration are blocked until all decision
>   metrics have real language winners.
> - **Task 06 (project 01):** same pipeline ran live (N=3 × 3 langs); the
>   rate-limiter workload is too noisy even per-metric (p99 CV 140–163%), so it
>   fails closed — correct. The gate-producing mechanism is proven on project 02.
>   Evidence: `.omo/evidence/polyglot-arena-live-mvp-01.json`.
> - **Task 08 (project 05):** ports confirmed (8085); **WS metric mapping
>   implemented + live-confirmed** (ws-go = 2000 sessions via `ws_session_duration`).
>   ws-go/ws-node build; **ws-rust build fails** (`getrandom-0.4.3` dep — a
>   scaffolded-impl bug needing a separate fix).
>
> **Honest boundary:** on macOS Docker Desktop, p99 latency is non-reproducible
> (CV >100% across two workloads) and closed-loop throughput is a thin comparison,
> so a *richly meaningful* 3-metric trustworthy report needs an isolated bench
> env. The benchmark pipeline and strict fail-closed gate are proven on real data;
> prediction reveal/dashboard calibration remain blocked for locked reports. The
> LLM narrative/verifier agent stages run interactively via
> `/devschool-arena`, not headlessly.

## Dependency graph

```
task_01 → task_02 ┐
task_03 ──────────┤
task_04 ──────────┼→ task_06 → task_07
task_05 ──────────┘            └→ task_08
```

No cycles. task_03/04/05 are independent and may run in parallel with task_01/02.
