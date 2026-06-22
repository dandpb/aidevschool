# Context Map

This repo has multiple contexts. Each has its own `CONTEXT.md` (domain language) and its own `docs/adr/` (architectural decisions). System-wide decisions go to `docs/adr/` at the root.

## Layout

| Context | `CONTEXT.md` | `docs/adr/` |
| --- | --- | --- |
| Ecosystem (root) | `CONTEXT.md` | `docs/adr/` |
| `engines/codexDojo/` | `engines/codexDojo/CONTEXT.md` | `engines/codexDojo/docs/adr/` |
| `engines/minimaxDojo/` | `engines/minimaxDojo/CONTEXT.md` | `engines/minimaxDojo/docs/adr/` |
| `engines/miniMaxEvolutionEngine/` | `engines/miniMaxEvolutionEngine/CONTEXT.md` | `engines/miniMaxEvolutionEngine/docs/adr/` |
| `engines/pixelDojo/` | `engines/pixelDojo/CONTEXT.md` | `engines/pixelDojo/docs/adr/` |
| `docs/design/polyglot-arena/` | (lazy) | (lazy) |
| `curriculum/` | `curriculum/CONTEXT.md` | `curriculum/docs/adr/` |
| `learner/` | `learner/CONTEXT.md` | `learner/docs/adr/` |
| `docs/` | `docs/CONTEXT.md` | `docs/adr/` |

## Note on the current root `CONTEXT.md`

The existing `CONTEXT.md` at the root is entirely about `minimaxDojo` (threshold seam, `⟨config: path⟩` reference, canonical agent prompt, empirical gate). When the `engines/minimaxDojo/CONTEXT.md` is created, those definitions should be moved there. Until then, treat the root file as a stand-in for the `minimaxDojo` context.

## Conventions

- Per-context `CONTEXT.md` files and `docs/adr/` directories are created **lazily** by the `grill-with-docs` skill when terms or decisions crystallize. Do not pre-create empty ones.
- ADRs use the format `NNNN-<slug>.md`.
- An ADR that affects more than one context lives at `docs/adr/` (root) and is referenced from each context's `CONTEXT.md`.

## How skills consume this

Skills that read domain context (`improve-codebase-architecture`, `diagnose`, `tdd`, `grill-with-docs`, …) read `CONTEXT-MAP.md` first, then the per-context `CONTEXT.md` for the area they are about to work in, then the relevant ADRs.
