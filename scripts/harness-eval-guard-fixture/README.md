# harness-eval guard fixture

Planted-defect fixture for the Track A regression guard
(`scripts/skill_vendored_guard.py`, CI job `skill-vendored-guard`).
Mirrors the countersign fixture from AID-2591 (PR #511 QA).

## Planted defects (must be flagged — exactly these four)

| AGENTS.md cite | class |
|---|---|
| `src/missing/thing.ts` | mandated path does not exist |
| `docs/does-not-exist.md` | doc cite does not exist |
| `.agents/skills` | directory contract missing |
| `pnpm run definitely-not-a-script` | unknown script |

## Negatives (must NOT be flagged — the six Track A fix classes from PR #511)

| AGENTS.md cite | fix class |
|---|---|
| `lib/...`, `.agents/…` | shorthand placeholders |
| `pnpm run lint` (packages/web) | subpackage manifest depth-3 |
| `pnpm --filter pixel-quest dev` | runner flags are not script names |
| `src/game/encounters/registry.ts` | package-relative cite (suffix lookup) |
| `references/view.md` | foreign-skill anchor (`dev` skill not vendored) |
| `pnpm run build` (root) | control: plain resolvable script |

If the guard reports anything beyond the four planted defects, the vendored
checker lost one of the six fixes (e.g. an `agent-skills update` overwrote the
hot-fixed tree with the pristine catalog). If it reports fewer, the checker is
over-pruning or the fixture drifted.
