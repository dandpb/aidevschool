# Polyglot Evolution Arena — Demotion Notice

**Status:** `proposal` (archived)
**Demoted on:** 2026-06-21
**From:** `engines/polyglotEvolutionArena/`
**To:** `docs/design/polyglot-arena/`

The `Polyglot Evolution Arena` is the polyglot-implementation loop (Curator → Developers → Reviewer
→ Tester → Optimizer, with the same 5-phase protocol that drives the rest of the ecosystem).
It was originally proposed as its own engine root, but the loop itself already lives in
[`engines/miniMaxEvolutionEngine/`](../../../engines/miniMaxEvolutionEngine/CLAUDE.md) and the
IDEIAS material duplicates the canonical prompt set there.

## Why demoted

The original engine root carried only design material:

- `bootstrap_prompt.md` — merged into `.claude/commands/devschool/` of `miniMaxEvolutionEngine/`
- `project_proposal.md` — preserved here for historical context
- `STATUS.md` — replaced by this file

There was **no executable scaffold**, no test harness, and no comparison runner, so the project
remained at `proposal` per the [MANIFEST status vocabulary](../../../engines/codexDojo/ecosystem/MANIFEST.md#status-vocabulary).
The deletion test on the engine root passed: removing it concentrated complexity into
`miniMaxEvolutionEngine/` and the engine-root count dropped from 6 to 4.

## Where the loop lives now

| Need | Location |
| --- | --- |
| Phase commands | `engines/miniMaxEvolutionEngine/.claude/commands/devschool/` |
| Polyglot subagents | `engines/miniMaxEvolutionEngine/.claude/agents/{curator,dev-go,dev-rust,dev-node,reviewer,benchmarker,optimizer,verifier}.md` |
| Operating model | `engines/codexDojo/ecosystem/OPERATING_MODEL.md` |
| Curriculum catalog | `curriculum/catalog.md` |

## Resurrecting

If the polyglot arena graduates from `proposal` to a real engine, follow the
[MANIFEST promotion criteria](../../../engines/codexDojo/ecosystem/MANIFEST.md#status-vocabulary):
executable scaffold + test harness + working comparison runner. Until then, treat the material
in this directory as design history, not as code.
