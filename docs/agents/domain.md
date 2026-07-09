# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase. Start with root `CONTEXT.md`; create per-engine `CONTEXT.md` only when a skill crystallizes terms.

## Before exploring, read these

1. **`CONTEXT.md`** at the repo root — domain language for the active context.
2. **`CONTEXT.md`** for the context you're about to work in (e.g. `engines/minimaxDojo/CONTEXT.md`).
3. **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `<context>/docs/adr/` for context-scoped decisions.
4. The **root `CONTEXT.md`** if your work crosses contexts.

If any of these files don't exist for the context you're exploring, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md                    ← domain language
├── CONTEXT.md                    ← root / ecosystem context (legacy — see note)
├── docs/adr/                     ← system-wide decisions
├── engines/
│   ├── codexDojo/
│   │   ├── CONTEXT.md            ← codexDojo context
│   │   └── docs/adr/             ← codexDojo-specific decisions
│   ├── minimaxDojo/
│   │   ├── CONTEXT.md            ← minimaxDojo context
│   │   └── docs/adr/
│   ├── miniMaxEvolutionEngine/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/
│   └── pixelDojo/
│       ├── CONTEXT.md
│       └── docs/adr/
├── docs/design/polyglot-arena/  # demoted 2026-06-21; lazy CONTEXT/adr when material graduates
├── curriculum/
│   ├── CONTEXT.md
│   └── docs/adr/
├── learner/
│   ├── CONTEXT.md
│   └── docs/adr/
└── docs/
    ├── CONTEXT.md
    └── docs/adr/
```

## Note on the current root `CONTEXT.md`

The existing `CONTEXT.md` at the root is entirely about `minimaxDojo` (threshold seam, `⟨config: path⟩`, canonical agent prompt, empirical gate). When the `engines/minimaxDojo/CONTEXT.md` is created, those definitions should be moved there. Until then, treat the root file as a stand-in for the `minimaxDojo` context, not as ecosystem-level language.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
