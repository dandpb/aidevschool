# DOCS

## OVERVIEW

`docs/` holds ecosystem knowledge, prompt seeds, idea work, and design references. It informs
engines but is not itself the runtime source of learner state.

## STRUCTURE

```text
docs/
├── PROMPTS/
│   ├── -01_GOAL.md
│   ├── 00_IDEIAS.md
│   └── IDEIAS/
└── design/
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Primary goal | `PROMPTS/-01_GOAL.md` | Main ecosystem intention. |
| Original idea seed | `PROMPTS/00_IDEIAS.md` | Broad project ideation. |
| codexDojo prompt set | `PROMPTS/IDEIAS/codexDojo/` | Architecture, agents, metrics, bootstrap prompts. |
| Polyglot arena ideas | `PROMPTS/IDEIAS/polyglotEvolutionArena/` | Design/proposal material. |
| Design examples | `design/` | Reference artifacts. |

## CONVENTIONS

- Keep prompt docs aligned with concrete ecosystem files.
- When a prompt changes agent roles, gates, roadmap, memory, metrics, or deliverables, update
  `../engines/codexDojo/ecosystem/MANIFEST.md`.
- Treat older idea files as historical unless the manifest or current engine docs point to them.
- Prefer links to canonical files over copying long protocol sections.

## ANTI-PATTERNS

- Do not turn docs-only ideas into claimed implementation status.
- Do not make `docs/` the source of truth for active learner state; that belongs in `../learner/`.
- Do not leave prompt changes unmapped from product-facing ecosystem files.
