# OpenClaw Engine

## Purpose

File-based **checklist runner** for the 5-phase cycle (simulate mode). Advances
`learner/pipeline_status.yaml` when required artifacts exist and pass size gates.

> **ADR-0002:** Tracer bullet, not the interactive cycle owner (miniMaxEvolutionEngine).
> Empirical mastery stays on teaching-game verifier + substrate.

## Where to Look

| Task | Location |
| --- | --- |
| Checklist | `runner/checklist.py` |
| Scheduler | `runner/scheduler.py` |
| Pipeline status | `runner/pipeline_status.py` |
| CLI | `__main__.py` |
| Tests | `tests/` |

## Commands

```bash
python3 -m engines.openclaw --project curriculum/01_rate_limiter --mode simulate
python3 -m pytest engines/openclaw/tests/
```
