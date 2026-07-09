# OpenClaw — Checklist Runner

Tracer bullet that advances the 5-phase cycle (`spec → impl → review → benchmark → optimize`)
by checking that required artifacts exist (and meet size floors). No Hermes bus, no AI calls.

Pipeline state: `learner/pipeline_status.yaml` (Markdown notes are human-only).

## Architecture

```
python3 -m engines.openclaw
        │
        ▼
Scheduler (runner/scheduler.py)
        │
        ▼
Checklist (runner/checklist.py)   # path exists + min size per phase
```

Learning gate: if `learner/learning_state.yaml` has `gate.implementation_blocked: true`, the
runner halts.

## CLI

```bash
python3 -m engines.openclaw --project curriculum/01_rate_limiter --mode simulate
python3 -m engines.openclaw --project curriculum/01_rate_limiter --phase spec --max-events 20
python3 -m pytest engines/openclaw/tests/
```

## Role (ADR-0002)

Simulate-grade orchestration only. Empirical mastery stays on teaching-game verifier + substrate.
Interactive polyglot cycle remains miniMaxEvolutionEngine.
