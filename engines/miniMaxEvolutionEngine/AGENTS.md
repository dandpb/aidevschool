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
| School supervisor | `supervisor/` | One-transition tick, outbox, ledger, lease, recovery, autonomous spec adapter, and foreground poll. |
| Supervisor tests | `tests/test_supervisor*.py` | Focused decision, recovery, autonomy, polling, and subprocess-free tracer suites. |
| Autonomous config | `autonomous.example.yaml` | Disabled-by-default schema; local enabled config belongs under `.mavis/school-supervisor/`. |
| Supervisor runtime | `.mavis/school-supervisor/` | Operational ledger, lease, and request lifecycle; never domain or mastery authority. |
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
- A supervisor tick performs at most one transition. Start recovery with read-only `status`; do not
  redispatch interrupted autonomous work or edit the operational ledger/outbox manually.
- Autonomous execution is opt-in, kill-switch protected, and limited to `spec -> spec-done` until
  later phases have enforceable test-command sandboxes. SessionStart never enables or starts it.

## COMMANDS

```bash
rtk python3 -m pytest tests/test_supervisor.py tests/test_supervisor_autonomous.py tests/test_supervisor_poll.py tests/test_supervisor_tracer.py
rtk python3 -m pytest tests/test_os_adapter.py .claude/commands/devschool/tests/test_phaserunner.py
```

## ANTI-PATTERNS

- Do not replace symlinks with copied shared directories.
- Do not update pipeline status to a later phase before verifier PASS.
- Do not create recurring cloud schedules without explicit user confirmation.
- Do not treat foreground polling as a daemon, cloud scheduler, or multi-project service.
- Do not grant mastery, synthesize learner evidence, or mutate learner state from the supervisor.
- Do not autonomously execute implementation, review, benchmark, or optimization phases.
- Do not duplicate full agent system prompts under `.claude/agents/` when a minimaxDojo persona already exists — keep a thin wrapper + operational deltas only.
