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

## Conventions

- `learner/pipeline_status.yaml` is machine authority; Markdown is a human-readable fallback and
  must not be clobbered by scheduler writes.
- Checklist gates prove artifact presence and minimum size only. They do not compile, test,
  semantically review, or establish mastery.
- OpenClaw is a tracer bullet; miniMaxEvolutionEngine owns the interactive cycle.
- Until the CLI project-selection seam is fixed, `--project` changes persisted scheduler state only
  when paired with `--phase`.

## Commands

```bash
python3 -m engines.openclaw --phase spec --project curriculum/01_rate_limiter --mode simulate
python3 -m pytest engines/openclaw/tests/
```

## Anti-Patterns

- Do not infer a Hermes/event-bus implementation from legacy glossary material; the current runtime
  is the checklist scheduler described here and in `README.md`.
- Do not treat a completed checklist as verifier PASS or learner mastery.
