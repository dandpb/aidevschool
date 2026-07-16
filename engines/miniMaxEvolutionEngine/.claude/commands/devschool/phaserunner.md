---
description: PhaseRunner protocol — reusable orchestration seam for every AI DevSchool slash command. Commands invoke run_phase(spec); this file defines the interface.
argument-hint: "(internal protocol — not invoked directly by users)"
---

# PhaseRunner

The **PhaseRunner** is the single seam that collapses the repeated
read-state → check-gate → dispatch producer → dispatch verifier → update status → retry
pattern shared by every AI DevSchool phase command.

It is a protocol, not a subagent. The Orquestrador executes `run_phase(spec)` by reading
this interface and applying it to the phase-specific `spec` provided by each slash command.

## Interface: `run_phase(spec)`

### Inputs

`spec` is a plain map with the following fields:

| Field | Required | Description |
| --- | --- | --- |
| `phase` | yes | Canonical phase name: `spec`, `impl`, `review`, `benchmark`, `optimize`. |
| `producer` | yes | Subagent(s) to dispatch. String for one agent; list for multiple. |
| `verifier_phase` | yes | Phase argument passed to the `verifier` subagent. |
| `next_status` | yes | Value to write through the YAML-first status helper on verifier PASS. |
| `pre_condition` | no | Required current `phase` from YAML-first pipeline state. Skip if absent. |
| `parallel` | no | If `true`, dispatch all producers in the same message (one Task each). Default `false`. |
| `learning_gate_check` | no | If `true`, stop when `gate.implementation_blocked: true`. Default `false`. |
| `retry_limit` | no | Max consecutive FAIL verdicts before halting. Default from `plan.yaml` (`max_consecutive_failures`). |
| `artefact` | no | Primary deliverable path pattern for logging (e.g., `curriculum/{NN}/docs/spec.md`). |
| `project` | no | Project slug. Resolved from `$ARGUMENTS` if present, else `current_project` in status. |

### Invariants

1. **Filesystem is source of truth.** Read `learner/pipeline_status.yaml` when present (Markdown only cold-start fallback); write machine fields only with `engines.openclaw.runner.pipeline_status.save_status`, which updates YAML without clobbering Markdown narrative. Read `learner/learning_state.yaml` directly.
2. **Verifier never shares producer context.** Dispatch the verifier as a fresh Task with no hand-off from the producer except the artefact files themselves.
3. **Status advances only on PASS.** Never write YAML machine state before the verifier returns PASS.
4. **Gate is respected.** When `learning_gate_check: true`, a blocked gate halts the phase and suggests `/devschool-diagnose`.
5. **Failures are concrete.** Every FAIL includes file:line evidence and actionable feedback to the producer.

### Steps

1. **Resolve project.** Read YAML-first pipeline state with `load_status(Path("learner/pipeline_status.yaml"))`; Markdown is only a cold-start/narrative fallback. Use `$ARGUMENTS` if provided; otherwise use `current_project`.
2. **Read state.** Load pipeline state with that YAML-first helper and `learner/learning_state.yaml`.
3. **Check learning gate.** If `learning_gate_check` is true and `gate.implementation_blocked` is true, stop and tell the user to run `/devschool-diagnose`.
4. **Check pre-condition.** If `pre_condition` is set and the current phase does not match, stop and report the blocker.
5. **Dispatch producers.**
   - If `parallel: true`, send all producer Tasks in the same assistant message.
   - If `parallel: false`, send one producer Task and wait for it.
6. **Dispatch verifier.** After all producers finish, run the `verifier` subagent with phase `verifier_phase`.
7. **Apply verdict.**
   - **PASS**: update the status object, then call `save_status(status, Path("learner/pipeline_status.yaml"))` → `next_status`; never overwrite Markdown narrative.
   - **FAIL**: send the feedback to the producer(s) and retry from step 5, counting failures. Halt after `retry_limit` consecutive failures and record a blocker.
8. **Report.** Present the verdict, the updated status, and the next recommended command.

## Why this seam?

Before PhaseRunner, every phase command reimplemented the same six-step dance.
After PhaseRunner, each command is a thin `spec` declaration; the orchestration logic
lives in one place, gains locality, and can be tested through its interface fields.
