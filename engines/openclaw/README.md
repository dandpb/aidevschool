# OpenClaw — File-Based Continuous Runner

OpenClaw is the continuous-runner engine of the AI DevSchool ecosystem: a tracer bullet that
drives the 5-phase learning cycle (`spec → impl → review → benchmark → optimize`) with **no hidden
chat state**. Every handoff between agents is an immutable JSON event on the file-based **Hermes
bus** under `.mavis/hermes/`, and pipeline state lives in `learner/pipeline_status.md` — the
filesystem is the source of truth.

It currently runs only in **simulate mode**: adapters validate that the expected artifacts exist
on disk (specs, implementations, review/benchmark docs) instead of calling AI models. There is no
networking and no background daemon (`__main__.py` rejects any other mode with
`NotImplementedError`).

## Architecture

```
python3 -m engines.openclaw            # CLI (__main__.py)
        │
        ▼
Scheduler (runner/scheduler.py)        # reads learner/pipeline_status.md, steps the cycle
        │   producer step → verifier step → phase advance
        ▼
Adapters (runner/adapters/)            # one per role: curator, dev, reviewer,
        │                              # benchmarker, optimizer + verifier
        ▼
HermesBus (hermes/bus.py)              # file-backed pub/sub in .mavis/hermes/
```

- **HermesBus** (`hermes/bus.py`) — file-backed pub/sub. Events are immutable JSON files moved
  through `outbox/` → `inbox/` → `log/` (the idempotency ledger). Publishing is idempotent by
  `(topic, unit_id, content_hash)`; a repeated key is classified `duplicate`, and a same-key,
  different-content event is copied to `conflicts/`.
- **Topics** (`hermes/topics.py`) — canonical `dojo.*` topic names (`dojo.unit.selected`,
  `dojo.spec.ready`, `dojo.impl.ready`, `dojo.tests.ready`, `dojo.review.ready`,
  `dojo.metrics.ready`, `dojo.memory.updated`) with the minimal required payload keys per topic.
- **Scheduler** (`runner/scheduler.py`) — maps each phase to a `PhaseRule` (topic, producer
  adapter, verifier phase, next phase). Each `step()` runs the producer, then holds the cycle in
  `pending_verify_topic` until the verifier passes. It halts on blockers, on `cycle-complete`, or
  when `learner/learning_state.yaml` has `gate.implementation_blocked` (the learning gate).
  Verifier FAILs re-publish the producer event; 3 failures on the same topic append a blocker to
  `pipeline_status.md` and halt.
- **Adapters** (`runner/adapters/`) — `curator`, `dev`, `reviewer`, `benchmarker`, `optimizer`
  (producers) and `verifier`. In simulate mode producers check artifacts and emit the next topic;
  the verifier re-derives correctness from the artifacts alone (existence + minimum sizes,
  per-language implementation paths) and returns `PASS`/`FAIL`.

## Producer ≠ verifier

The ecosystem rule applies inside the runner: the `VerifierAdapter` never shares state with a
producer adapter. It receives only the published event and re-checks the artifacts on disk in a
separate step — a producer can never advance the phase by itself, only a verifier `PASS` does
(`Scheduler._run_verifier`).

## How to run

From the repo root (the package is imported as `engines.openclaw`):

```bash
python3 -m engines.openclaw --project 01_rate_limiter --mode simulate
```

Useful flags (see `__main__.py`):

- `--phase <spec|spec-done|impl-done|review-done|benchmark-done|cycle-complete>` — override the
  starting phase (writes `learner/pipeline_status.md`).
- `--max-events N` — maximum scheduler steps (default 50).
- `--reset` — clear all Hermes events before running.

Exit code is `0` only when the run ends in `cycle-complete`; otherwise it prints the halt reason
and any blockers and returns `1`.

## How to test

```bash
python3 -m pytest engines/openclaw/tests/
```

Covers the bus (`test_hermes_bus.py`), the scheduler (`test_scheduler.py`), and the adapters
(`test_adapters.py`). The repo-root `make test` also includes this suite.

## State files

| Path | Role |
| --- | --- |
| `.mavis/hermes/outbox/` | Published events waiting for delivery. |
| `.mavis/hermes/inbox/` | Events consumed by a subscriber, not yet acked. |
| `.mavis/hermes/log/` | Acked events — the idempotency ledger. |
| `.mavis/hermes/conflicts/` | Same dedup key, different content. |
| `.mavis/hermes/scheduler_state.json` | Sequence counter, `pending_verify_topic`, retry counts. |
| `learner/pipeline_status.md` | Current cycle, phase, and blockers (shared substrate). |
| `learner/learning_state.yaml` | Learning gate; `gate.implementation_blocked` halts the runner. |
