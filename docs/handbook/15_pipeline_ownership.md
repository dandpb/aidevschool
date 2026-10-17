# Pipeline state and ownership

Reading map checked against `b9f77774643b94bfd9fafbd756a1b17482c33e45`
(2026-10-04). The linked implementations and contracts remain the sources for
behavior. This page describes the current boundaries before any code move.

## Follow the state and its implementation

| Responsibility | Source | Boundary |
| --- | --- | --- |
| Canonical software-cycle state | [`learner/pipeline_status.yaml`](../../learner/pipeline_status.yaml) | Machine phase, project, blockers and provenance shared by engines. |
| Human narrative | [`learner/pipeline_status.md`](../../learner/pipeline_status.md) | Notes; `load_status` does not parse this Markdown. |
| Typed status, load, serialization and persistence | [`pipeline_status.py`](../../engines/openclaw/runner/pipeline_status.py) | OpenClaw currently houses `Phase`, `Grade`, `PipelineStatus`, `load_status`, `dump_status` and `save_status`; callers also include MME. |
| Interactive cycle | [ADR-0002](../design/adr/0002-openclaw-role.md) | MME owns the interactive cycle; OpenClaw owns the simulate checklist control flow. |
| Learning-state validation, gate commits and projections | [`learner/substrate/interface.md`](../../learner/substrate/interface.md) | Separate learner-state API; a pipeline phase or grade does not promote canonical mastery. |

`load_status(path)` reads the sibling `.yaml` even when given a `.md` path.
Missing YAML returns a fresh typed status; malformed YAML raises
`StateCorruptionError`. `save_status` writes the YAML without overwriting the
Markdown. `dump_status` is shared by persistence and the supervisor's planned
digest, so changing its fields affects both callers.

## Follow the callers

| Caller / consumer | Source | Current behavior |
| --- | --- | --- |
| Checklist advance | [`Scheduler.step`](../../engines/openclaw/runner/scheduler.py) | Checks blockers, learning gate and artifact checklist; writes `simulate` / `openclaw-checklist` through `write_status` → `save_status`. Also mirrors the coarse evidence phase into curriculum status. |
| CLI phase override | [`OpenClaw CLI`](../../engines/openclaw/__main__.py) | `--phase` sets phase/project, clears blockers and writes `simulate` / `openclaw-cli-override` before running steps. `--preview` returns through a read-only branch before this override. |
| Autonomous supervisor | [`autonomous.py`](../../engines/miniMaxEvolutionEngine/supervisor/autonomous.py) | After independent verifier PASS, records durable `advancement_authorized`; `_compare_and_advance` checks identity and digests, then calls `save_status` with `verified` / `mme-supervisor`. |
| Interactive PhaseRunner | [`phaserunner.md`](../../engines/miniMaxEvolutionEngine/.claude/commands/devschool/phaserunner.md) | Prompt contract instructs the orchestrator to call `save_status` after independent PASS with `verified` and the command name. This is an instruction, not another executable writer enforced by the helper. |
| Session briefing | [`os_adapter.py`](../../engines/miniMaxEvolutionEngine/os_adapter.py) | Reads status and learning gate, displays provenance and selects a suggested command by phase/gate. It does not execute or advance that phase. |

The existing provenance change and its criteria are recorded in
[context-authority.md](../../.tasks/context-authority.md). This map does not
introduce another writer or revise that decision.

## Interpret provenance and concurrency

- `simulate` describes checklist/override provenance; it does not prove an
  independent verifier passed. `verified` declares verifier-backed advancement.
  `unspecified` represents legacy or fresh state without declared provenance.
- `advanced_by` identifies the declared writer. The helper validates the grade
  enum and requires a non-empty writer for declared grades, but does not
  authenticate callers or inspect a verifier receipt. The supervisor enforces
  its own authorization checks; the PhaseRunner has a prompt-level contract.
- The persisted fields describe the latest write, not a complete transition
  history. Consumers requiring independent verification must interpret grade;
  displaying it in a briefing does not itself enforce authorization.
- Writes use [atomic file replacement](../../shared/fsio.py). The scheduler
  saves previous bytes and attempts to restore its curriculum/pipeline pair on
  failure. This is local rollback, not an isolated transaction across writers.
- The supervisor checks baseline identity/digests again before writing. These
  checks do not provide a lock shared with checklist or CLI writers; concurrent
  interleavings remain outside a global serialization guarantee.

## Before changing this boundary

Start with the status helper, scheduler, CLI, supervisor and PhaseRunner linked
above. Preserve the shared serialization/digest contract and the distinct
[fine/coarse phase mapping](../../engines/openclaw/runner/scheduler.py).
Check the [substrate failure contract](../../learner/substrate/interface.md)
separately when a change also affects learning-state writes or projections.

A move of the helper or a new writer needs a bounded plan covering imports,
read/write effects, provenance and concurrent callers, followed by independent
review. This documentation change performs no such migration.
