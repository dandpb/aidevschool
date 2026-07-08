# aidevschool — Domain Context

> **Scope:** domain glossary for the tutor core (threshold seam, gate, agent prompts) — not a status doc. For project/build status see [curriculum/BACKLOG_STATUS.md](curriculum/BACKLOG_STATUS.md).

Tight definitions for architecture-deepening work in this repo.

## Threshold seam

`engines/minimaxDojo/config/learner.yaml` is the **single seam** for numeric thresholds used by the tutor core. Prompts and docs must reference values here instead of hardcoding them.

## `⟨config: path⟩` reference

Substitution marker used in Markdown prompts and docs. It resolves to the scalar value at `path` inside `engines/minimaxDojo/config/learner.yaml`, where `path` is a dotted YAML key (e.g., `gates.mutation_score_min`). A runner or agent expands the marker before consuming the prompt.

## Canonical agent prompt

`engines/minimaxDojo/prompts/per_agent/<name>.md` is the single system prompt for an agent. `engines/minimaxDojo/agents/<id>/README.md` is only a thin index that links to it.

## Empirical gate

A unit is `DOMINADO` only after the PROMĘTOR verifies real execution against the thresholds in the threshold seam.

## Substrate write seam

`learner.substrate.save_canonical` is the single write path for `learner/learning_state.yaml`
(atomic). The teaching-game verifier decides eligibility/outcome but must not plain-write the
canonical file; it calls `save_canonical` (and auto-resyncs derived views for the repo path).

## Teaching evidence emitter

`engines/shared/teaching-evidence/emit.ts` (mirrored at `engines/voxelDojo/shared/evidence.ts`)
is the deep module for dual-channel evidence emission. Games supply unit identity + metrics only.
