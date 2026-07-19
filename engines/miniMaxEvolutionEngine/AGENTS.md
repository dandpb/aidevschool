# MINIMAX EVOLUTION ENGINE

## OVERVIEW

`miniMaxEvolutionEngine/` is the Claude Code motor for the same file-based 5-phase school
protocol used by the rest of the ecosystem.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Engine contract | `CLAUDE.md` | Authoritative local operating instructions. |
| Subagents | `.claude/agents/` | Claude Code wrappers only. Tutor personas live in `engines/minimaxDojo/prompts/per_agent/` (canonical). |
| Tutor prompt canon | `../minimaxDojo/prompts/per_agent/` | Single source for shared agent personas; evolution agents must point there, not fork bodies. |
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
- Respect `learner/learning_state.yaml` and the YAML pipeline status before advancing phases:
  `learner/pipeline_status.yaml` is always authoritative; Markdown is human narrative and is never parsed.
- This engine should orchestrate; shared artifacts still live under root `curriculum/`, `learner/`,
  and `docs/`.

## COMMANDS

```bash
python3 -m pytest .claude/commands/devschool/tests/test_phaserunner.py
```

## ANTI-PATTERNS

- Do not replace symlinks with copied shared directories.
- Do not update pipeline status to a later phase before verifier PASS.
- Do not create recurring cloud schedules without explicit user confirmation.
- Do not duplicate full agent system prompts under `.claude/agents/` when a minimaxDojo persona already exists — keep a thin wrapper + operational deltas only.
