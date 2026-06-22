# ENGINES

## OVERVIEW

`engines/` contains separate machines for the same school; engine code and prompts live here,
while learner state and curriculum evidence stay at the root.

## STRUCTURE

```text
engines/
├── codexDojo/              # pnpm dashboard + product-facing ecosystem contract
├── minimaxDojo/            # 14-agent tutor core, docs, prompts, whiteboard
├── miniMaxEvolutionEngine/ # Claude Code motor with .claude agents/commands/skills
└── pixelDojo/              # 8-bit teaching-game engine (Playwright evidence contract). arcadeAcademy/ merged here 2026-06-21.
```

The polyglot evolution arena design material is archived at `docs/design/polyglot-arena/`
(proposal-stage; was `engines/polyglotEvolutionArena/` until 2026-06-21).

## WHERE TO LOOK

| Need | Location | Notes |
| --- | --- | --- |
| App UI or ecosystem manifest | `codexDojo/` | The only runnable app under `engines/`. |
| Long-running tutor protocol | `minimaxDojo/` | Use `INDEX.md` as the map. |
| Claude Code orchestration | `miniMaxEvolutionEngine/` | Local `CLAUDE.md` is the engine contract. |
| Teaching games + evidence | `pixelDojo/` | `pixel-quest/` has the Playwright smoke contract. |
| Polyglot arena design (read-only) | `docs/design/polyglot-arena/` | Archived proposal material. |

## CONVENTIONS

- Do not put shared learner or curriculum state under an engine.
- Engine-local docs may reference root `learner/`, `curriculum/`, and `docs/`.
- If an engine changes the learning gate, memory contract, roadmap, or prompts, update the
  codexDojo manifest mapping at `codexDojo/ecosystem/MANIFEST.md`.

## ANTI-PATTERNS

- Do not copy `learner/` or `curriculum/` into a new engine.
- Do not assume a command works from `engines/`; commands are engine-local.
- Do not resurrect `polyglotEvolutionArena/` as an engine root — its design material lives at `docs/design/polyglot-arena/` and the loop lives in `miniMaxEvolutionEngine/`.
