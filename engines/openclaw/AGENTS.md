# OpenClaw Engine

## Purpose

OpenClaw is the file-based continuous-runner layer for the AI DevSchool ecosystem. It implements the Hermes pub/sub protocol and a scheduler that drives the 5-phase learning cycle without hidden chat state.

> **ADR-0002:** OpenClaw is a **tracer-bullet continuous runner**, not the primary
> owner of the interactive polyglot cycle (that remains miniMaxEvolutionEngine).
> Adapters are simulate-grade; empirical mastery stays on the teaching-game
> verifier + substrate path. See `docs/design/adr/0002-openclaw-role.md`.

## Where to Look

| Task | Location | Notes |
| --- | --- | --- |
| Hermes event bus | `engines/openclaw/hermes/bus.py` | File-based topics, idempotency, conflicts. |
| Topic schemas | `engines/openclaw/hermes/topics.py` | Canonical `dojo.*` topic names and payloads. |
| Scheduler | `engines/openclaw/runner/scheduler.py` | Reads state, dispatches adapters, advances status. |
| Structured pipeline status | `engines/openclaw/runner/pipeline_status.py` | YAML seam + Markdown narrative twin. |
| Agent adapters | `engines/openclaw/runner/adapters/` | One adapter per role; simulation mode by default. |
| CLI | `engines/openclaw/__main__.py` | `python3 -m engines.openclaw --project 01_rate_limiter --mode simulate`. |
| Tests | `engines/openclaw/tests/` | pytest coverage for bus, scheduler, adapters. |

## Conventions

- Filesystem is the source of truth. All handoffs are events in `.mavis/hermes/`.
- Events are idempotent by `(topic, unit_id, content_hash)`.
- The verifier adapter never shares state with a producer adapter.
- Simulation mode validates artifacts; real AI dispatch is an optional override.
- Keep the tracer bullet small: no networking, no background daemon, no AI model calls.
- Machine-readable phase fields live in `learner/pipeline_status.yaml`; Markdown keeps agent notes.

## Commands

```bash
python3 -m engines.openclaw --project 01_rate_limiter --mode simulate
python3 -m pytest engines/openclaw/tests/
```
