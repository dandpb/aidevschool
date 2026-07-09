# aidevschool — Domain Context

> **Scope:** domain glossary for the tutor core (threshold seam, gate, agent prompts) — not a status doc. For project/build status see [curriculum/BACKLOG_STATUS.md](curriculum/BACKLOG_STATUS.md).

Tight definitions for architecture-deepening work in this repo.

## Threshold seam

`engines/minimaxDojo/config/learner.yaml` is the **single seam** for numeric thresholds used by the tutor core. Prompts and docs must reference values here instead of hardcoding them.

## `⟨config: path⟩` reference

Substitution marker used in Markdown prompts and docs. It resolves to the scalar value at `path` inside `engines/minimaxDojo/config/learner.yaml`, where `path` is a dotted YAML key (e.g., `gates.mutation_score_min`). A runner or agent expands the marker before consuming the prompt.

## Canonical agent prompt

`engines/minimaxDojo/prompts/per_agent/<name>.md` is the single system prompt for an agent. Roster: `engines/minimaxDojo/agents/README.md`.

## Empirical gate

A unit is `DOMINADO` only after the PROMĘTOR verifies real execution against the thresholds in the threshold seam.

## Substrate write seam

`save_canonical` writes `learner/learning_state.yaml` only (atomic).
`commit_canonical` writes then regenerates derived views for the repo path.
The verifier calls `commit_canonical`; it must not plain-write the YAML.

## Teaching evidence emitter

`engines/shared/teaching-evidence/emit.ts` is the only implementation.
`engines/voxelDojo/shared/evidence.ts` is a re-export.
