# MINIMAX EVOLUTION ENGINE

## OVERVIEW

`miniMaxEvolutionEngine/` is the Claude Code motor for the same file-based 5-phase school
protocol used by the rest of the ecosystem.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Engine contract | `CLAUDE.md` | Authoritative local operating instructions. |
| Subagents | `.claude/agents/` | Curator, devs, reviewer, benchmarker, optimizer, sonda, verifier. |
| Slash commands | `.claude/commands/devschool/` | `/devschool-*` workflow entrypoints. |
| Learning gate skill | `.claude/skills/agora-continuum/SKILL.md` | Gate protocol. |
| Shared curriculum | `curriculum -> ../../curriculum` | Symlink; do not replace with real files. |
| Shared learner state | `learner -> ../../learner` | Symlink; root remains source of truth. |
| Shared docs | `docs -> ../../docs` | Symlink to ecosystem docs. |
| Mavis state | `.mavis -> ../../.mavis` | Symlink to platform state. |

## CONVENTIONS

- Keep `CLAUDE.md` and `.claude/` in sync when changing engine behavior.
- The loop is plan -> execute -> verify across five phases; verifier runs between producer phases.
- Implementation agents may run in parallel, but verification must be isolated from producer context.
- Respect `learner/learning_state.yaml` and `learner/pipeline_status.md` before advancing phases.
- This engine should orchestrate; shared artifacts still live under root `curriculum/`, `learner/`,
  and `docs/`.

## ANTI-PATTERNS

- Do not replace symlinks with copied shared directories.
- Do not update `learner/pipeline_status.md` to a later phase before verifier PASS.
- Do not create recurring cloud schedules without explicit user confirmation.
