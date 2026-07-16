# DOCS

## OVERVIEW

`docs/` holds ecosystem knowledge, the handbook, prompt seeds, design references, dated analyses,
and archive material. It informs engines but is not itself the runtime source of learner state.
Start at [`DOCUMENTATION.md`](DOCUMENTATION.md) to choose the correct source for a question.

## STRUCTURE

```text
docs/
├── DOCUMENTATION.md         # canonical documentation map and classification rules
├── handbook/                # ecosystem navigation and inter-engine operating guidance
├── PROMPTS/
│   ├── -01_GOAL.md
│   ├── 00_IDEIAS.md
│   └── IDEIAS/
├── design/                  # active contracts, ADRs, and design proposals
└── archive/                 # superseded or historical material; never current guidance
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Choose the authoritative document | `DOCUMENTATION.md` | Start here before editing or consolidating docs. |
| Ecosystem orientation | `handbook/README.md` | Architecture, onboarding, engine pages, curriculum, and substrate. |
| Primary goal | `PROMPTS/-01_GOAL.md` | Main ecosystem intention. |
| Original idea seed | `PROMPTS/00_IDEIAS.md` | Broad project ideation. |
| codexDojo prompt set | `PROMPTS/IDEIAS/codexDojo/` | Architecture, agents, metrics, bootstrap prompts. |
| Polyglot arena ideas | `design/polyglot-arena/` | Demoted from `PROMPTS/IDEIAS/polyglotEvolutionArena/` on 2026-06-21. Proposal-stage. |
| Design examples | `design/` | Reference artifacts. |

## CONVENTIONS

- Keep prompt docs aligned with concrete ecosystem files.
- When a prompt changes agent roles, gates, roadmap, memory, metrics, or deliverables, update
  `../engines/codexDojo/ecosystem/MANIFEST.md`.
- Treat older idea files as historical unless the manifest or current engine docs point to them.
- Prefer links to canonical files over copying long protocol sections.
- Keep runtime setup beside the owning engine; keep cross-engine relationships in the handbook.
- Keep project evidence in `curriculum/<project>/docs/`; do not move it into `docs/` for indexing.

## ANTI-PATTERNS

- Do not turn docs-only ideas into claimed implementation status.
- Do not make `docs/` the source of truth for active learner state; that belongs in `../learner/`.
- Do not leave prompt changes unmapped from product-facing ecosystem files.
- Do not treat dated analyses, ADRs, archive material, or tool outputs as operational truth.
