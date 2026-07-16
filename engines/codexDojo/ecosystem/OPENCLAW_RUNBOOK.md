# OpenClaw checklist-runner runbook

## Goal

Run the five-phase artifact checklist against the shared curriculum without
claiming empirical verification or learner mastery. OpenClaw is a tracer bullet;
miniMaxEvolutionEngine owns the interactive software cycle, and `learner/gate/`
owns the independent learning gate.

## Sources of truth

- Read machine cycle state from `learner/pipeline_status.yaml`.
- Treat `learner/pipeline_status.md` as human narrative only.
- Read the learning gate from `learner/learning_state.yaml`.
- Read project identity and status from `curriculum/catalog.md`.

## Preview the next check

Run the read-only preview before advancing a phase:

```bash
python3 -m engines.openclaw --preview
```

The receipt names the YAML source, active project, phase, learning-gate result,
and next artifact checklist. Preview mode does not mutate canonical state.

## Run a simulate-grade phase

```bash
python3 -m engines.openclaw \
  --project curriculum/01_rate_limiter \
  --phase spec \
  --mode simulate
```

The scheduler checks paths and minimum sizes. Those checks prove artifact
presence only. They do not compile, test, review semantics, or establish
mastery.

## Verify the runner

```bash
python3 -m pytest engines/openclaw/tests/
```

## Stop conditions

Stop the runner when the learning gate blocks implementation, an expected
artifact is absent, pipeline state is invalid, or a canonical write fails. Do
not add an event bus, hidden daemon state, or AI dispatch under this runbook.
Such a change requires a new architecture decision that supersedes ADR-0002.
