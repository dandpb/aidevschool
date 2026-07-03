# OpenClaw And Hermes Runbook

## Goal

Run `codexDojo` continuously as a multi-agent learning ecosystem with file-based state, reproducible handoffs, and empirical verification.

## Shared Startup Checklist

1. Read `engines/codexDojo/ecosystem/MANIFEST.md`.
2. Read current state from `learner/learning_state.yaml`, `.mavis/learning_state.yaml`, and `learner/pipeline_status.md`.
3. Read the learner profile and pitfalls.
4. Select the next project or unit from `engines/codexDojo/ecosystem/ROADMAP.md`.
5. Confirm the learning gate state before allowing implementation.
6. Dispatch producer and verifier as separate contexts.
7. Write all outputs to project files.
8. Update memory and event log.

## OpenClaw Execution Plan

1. Create a workspace session rooted at `/Users/danielbarreto/Development/aidevschool`.
2. Paste the system bootstrap from `docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md`.
3. Add this control note:

```text
Use engines/codexDojo/ecosystem/MANIFEST.md as the product-facing contract.
Use engines/minimaxDojo/ as the deep tutor core.
Use .agora and .mavis as authoritative state.
Do not bypass the learner attempt gate.
```

4. Start with the current `next_action` in `learner/learning_state.yaml`.
5. For every cycle, write:
   - `curriculum/NN_name/docs/spec.md`
   - implementation files
   - `code_review.md`
   - `technology_comparison.md`
   - `benchmark_results.md`
   - `learning_notes.md`
   - `evolution_report.md`
6. Run verifier commands and record command output summaries.
7. Update `learner/pipeline_status.md` only after verifier PASS.

## Hermes Execution Plan

Hermes is treated as an event bus. Each message is idempotent and references file paths, not hidden chat state.

### Topics

| Topic | Producer | Consumer | Payload |
| --- | --- | --- | --- |
| `dojo.unit.selected` | Curriculo | Mentor, Arquiteto | unit id, project path, prerequisite evidence |
| `dojo.spec.ready` | Arquiteto | Implementador, Testes | spec path, ADR path |
| `dojo.impl.ready` | Implementador | Revisor, Testes | implementation path, test command |
| `dojo.tests.ready` | Testes | Metricas, Revisor | test results, coverage path |
| `dojo.review.ready` | Revisor | Implementador, Memoria | findings path |
| `dojo.metrics.ready` | Metricas | Arquiteto, Curriculo | scorecard path |
| `dojo.memory.updated` | Memoria | All agents | profile path, next action |

### Idempotency Rules

- Every payload includes `cycle_id`, `unit_id`, `artifact_path`, and `content_hash`.
- If the same `content_hash` was already processed, acknowledge and skip.
- If an artifact path exists with a different hash, create a conflict note and stop the transition.
- Verifier messages must never be produced by the same context that produced the artifact.

## Long-Running Schedule

| Cadence | Agent | Action |
| --- | --- | --- |
| Daily | Mneme/Memoria | Spaced review from pitfalls. |
| Every cycle | Metricas | Metrics snapshot and trend update. |
| Weekly | Curriculo | Roadmap adjustment from evidence. |
| Weekly | DevOps | CI/deploy/observability audit. |
| Monthly | Pesquisador | Refresh unstable library/tooling recommendations. |

## Stop Conditions

Stop and request human decision only when:

- A credential or external account is required.
- A destructive action is required.
- The learner asks to skip a gate.
- A verifier fails the same unit three times.
- Two platform states disagree and no file evidence resolves it.

## Current Automation Boundary

| Layer | Status | Artifact |
| --- | --- | --- |
| Documented manual workflow | `implemented` | `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md` |
| Phase commands (Claude Code) | `implemented` | `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` |
| Engine contract | `implemented` | `engines/miniMaxEvolutionEngine/CLAUDE.md` |
| Phase runner command | `implemented` | `engines/miniMaxEvolutionEngine/.claude/commands/devschool/phaserunner.md` |
| Platform state | `implemented` | `.mavis/plans/plan.yaml` |
| Learner substrate regeneration | `implemented` | `python3 -m learner.substrate` |
| Hermes file-based event bus | `implemented` | `engines/openclaw/hermes/bus.py` |
| OpenClaw scheduler + simulation adapters | `implemented` | `engines/openclaw/runner/scheduler.py`, `engines/openclaw/runner/adapters/` |
| OpenClaw CLI | `implemented` | `engines/openclaw/__main__.py` |
| Continuous background daemon | `planned` | Not yet implemented (invoke CLI explicitly or via cron) |

The tracer-bullet implementation provides a working file-based event bridge and scheduler that can run the 5-phase cycle for Project 01 end-to-end in simulation mode. Real AI dispatch via Claude Code remains a future override inside the adapter layer.
