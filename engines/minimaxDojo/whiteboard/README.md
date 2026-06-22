# minimaxDojo Whiteboard

> **This directory is a derived view of `learner/`.** Do not edit files here by
> hand — edit `learner/learning_state.yaml` (and the related files) and run
> `python3 -m learner.substrate` to regenerate.

## What's here

| File | Type | Owner | Source |
| --- | --- | --- | --- |
| `profile.yaml` | **derived** (regenerated) | Mnemosyne | `learner/learning_state.yaml` |
| `learner_profile.md` | **derived** (regenerated) | Mnemosyne | `learner/learning_state.yaml` |
| `trail.md` | **derived** (regenerated) | Cartógrafo | `learner/learning_state.yaml` |
| `cron_registry.yaml` | **config** (hand-maintained) | Cronos | `engines/minimaxDojo/prompts/per_agent/cronos.md` schema |
| `decisions/cycle-01-intake.md` | **history** (immutable) | Sêneca | append-only ADR per cycle |
| `diagnostics/sonde-000-template.md` | **template** | Sonda | first-cycle Sonda output template |
| `event_log/cycle-01.jsonl` | **history** (append-only) | Mnemosyne | NDJSON per cycle |
| `event_log/events-2025-W00.ndjson` | **history** (append-only) | Mnemosyne | NDJSON per week |

The **derived** files carry `derived_from: ../../learner/learning_state.yaml` in
their frontmatter; the substrate (`learner/substrate/__init__.py: sync()`)
overwrites them on every run. The **config** and **history** files are
hand-maintained and must not be regenerated automatically.

## Why the split exists

The minimaxDojo 14-agent tutor core expects to read its whiteboard from this
directory (the canonical path inside the engine). The substrate keeps that
expectation honest by regenerating the derived files whenever the canonical
state changes, while leaving the config + history untouched. This way the
whiteboard never silently forks global learner state.

## Regeneration

```bash
python3 -m learner.substrate
```

This regenerates `.mavis/learning_state.yaml`, the three derived files above,
and `engines/codexDojo/src/data/learner.ts`. The config and history files
remain untouched.