# miniMaxEvolutionEngine

The **runnable Claude Code orchestration motor** for AI DevSchool — the 5-phase software loop
(Spec → Implement → Review → Benchmark → Optimize) plus an adversarial verifier and the learning
gate, implemented as `.claude/` subagents and `/devschool-*` slash commands.

This engine implements the **same protocol** as `engines/minimaxDojo/`, on a different platform:
minimaxDojo is the prompt/spec layer for the MiniMax Agent Team; this engine is the Claude Code
motor. The main Claude Code loop is the Orchestrator — it delegates to subagents and runs the
verifier gate between phases; it never writes implementation code itself.

## Run it

```text
1. Open Claude Code rooted at this directory (engines/miniMaxEvolutionEngine/).
2. /devschool-status      # see pipeline_status.md + the learning gate
3. /devschool-diagnose    # if the gate is blocked, run the diagnostic (sonda)
4. /devschool-cycle       # run the full 5-phase loop once unblocked
```

Before any commit: run `/simplify` on the diff, apply the recommendations, then commit.

## Layout

| Path | Role |
| --- | --- |
| `CLAUDE.md` | The authoritative orchestrator doc (phases, gate, subagents, commands, model routing). |
| `AGENTS.md` | Terse "where to look" + conventions + anti-patterns. |
| `.claude/agents/*.md` | 17 subagent definitions. |
| `.claude/commands/devschool/*.md` | 18 `/devschool-*` slash commands + a `tests/` subdir. |
| `.claude/skills/agora-continuum/SKILL.md` | The learning-gate protocol skill. |
| `.claude/hooks/briefing.sh` | SessionStart hook (injects pipeline + gate state). |
| `curriculum/`, `learner/`, `docs/`, `.mavis/` | Symlinks to the shared root substrate — do not replace with copies. |

## Conventions

- Never advance `learner/pipeline_status.md` before the verifier returns `PASS`.
- The verifier never shares the producer's context (anti-anchoring).
- Never replace the symlinks with copied directories — the root stays the source of truth.
- Recurring cloud schedules are billed — only create them with explicit user confirmation.

## Learn more

- Full reference: [`docs/handbook/06_engine_miniMaxEvolutionEngine.md`](../../docs/handbook/06_engine_miniMaxEvolutionEngine.md)
- Architecture & the two loops: [`docs/handbook/01_architecture.md`](../../docs/handbook/01_architecture.md)
