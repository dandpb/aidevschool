# LEARNER

## OVERVIEW

`learner/` is the shared learner-state substrate for every engine. It stores the one canonical
journey, not engine-specific progress.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Gate state | `learning_state.yaml` | `presenting -> practicing -> evaluating -> mastered`. |
| Pipeline state | `pipeline_status.yaml` | Canonical machine-readable software-cycle phase and next action. |
| Pipeline narrative | `pipeline_status.md` | Human notes only; never parsed as machine state. |
| Substrate implementation | `substrate/AGENTS.md` | Python validator/adapters for generated views. |
| Learner profile | `learner_profile.md` | Dreyfus/Bloom, prerequisites, gaps. |
| Recurring traps | `pitfalls.md` | Append concise, reusable learning traps. |
| Learning journal | `journal.md` | Append-only knowledge base. |
| Local overview | `README.md` | Compatibility and mirror notes. |

## CONVENTIONS

- A unit reaches `mastered` only after learner attempt plus executable/verifier evidence.
- Keep state changes small, auditable, and tied to concrete evidence paths.
- Append to `journal.md` and `pitfalls.md` for new observations; avoid rewriting history.
- If changing `learning_state.yaml`, check whether `.mavis/learning_state.yaml` needs a matching
  platform mirror update.
- Engines may read this directory through symlinks, but they must not fork it.

## ANTI-PATTERNS

- Do not mark mastery from explanation, consensus, or static review alone.
- Do not erase failed attempts; they are learning evidence.
- Do not store engine-private state here unless it affects the shared learner journey.
