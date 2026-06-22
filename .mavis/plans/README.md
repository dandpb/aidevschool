# `.mavis/plans/` — agent-team plan registry

This directory holds plan files that the **Mavis runtime** uses to coordinate
multi-agent runs. Each plan has the schema `{version, plan: {name, tasks[]}}` and
the runtime drives the task lifecycle (dispatch → verify → update decision file).

## Live vs historical

| File | Status | Purpose |
| --- | --- | --- |
| `plan.yaml` | **Live** | The current Project 01 cycle plan (5-phase loop: sonda → devs → reviewer → benchmarker → optimizer + verifier). Pinned to the current cycle. |
| `decision.json` | Live (last write) | Final decision from the most recently completed plan (`override_accept` on the optimize task). |
| `plan-personas-agora.yaml` | **Historical** | The previous plan that produced 12 `PERSONA.md` files for the Ágora Continuum agents. Completed in 3 cycles (12/12 accepted). |
| `decision-cycle-{1,2,3}.json` | **Historical** | Per-cycle decisions from the personas plan. Audit trail; not read by any active runtime. |
| `persona-*-deliverable.md` (12 files) | **Historical** | Outputs of the personas plan. Useful for future agents to understand what was produced and why. |
| `personas-agora-deliverable.tar.gz` | **Historical** | Bundled archive of all persona deliverables; kept for traceability. |

## Naming convention

When a new plan starts, the convention is:

1. The plan file is named `plan.yaml` (overwriting the current live plan).
2. The previous plan is moved to `plan-<descriptive-name>.yaml` (e.g. `plan-personas-agora.yaml`).
3. Decisions are appended as `decision-cycle-{N}.json` per cycle, plus a final `decision.json` summarising the last cycle.
4. Per-task deliverables are written as `<task-id>-deliverable.md` in this directory.

The substrate at `learner/substrate/__init__.py` does NOT touch `.mavis/plans/`; the
Mavis runtime owns this directory directly.

## Why not gitignore the historical files?

Historical plan artifacts ARE valuable: they document what was attempted, what
verdicts were reached, and what files were produced. Removing them loses the
audit trail that future agents need to understand "why was this file created?"
and "was this verified?". The cost is a small amount of repo clutter; the
benefit is durable provenance.

If a historical plan is genuinely stale (e.g., the underlying plan never ran,
or the runtime was discontinued), move it to `docs/archive/mavis-plans/<name>/`
instead of deleting it outright.