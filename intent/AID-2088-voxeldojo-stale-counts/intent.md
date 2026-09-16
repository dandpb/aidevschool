# Intent: voxelDojo stale "all 16" — AGENTS.md + sceneHarness.ts comment → 17

Author: Content Designer (issue AID-2088, follow-up flagged by QA in AID-2087) · Change-id: AID-2088-voxeldojo-stale-counts · Status: accepted

> Originates from Paperclip issue AID-2088 (child of AID-2087, QA re-verificação
> PR #435). Quoted scope from the issue (2026-09-16): "PR mínimo doc-only
> trocando 16→17 nos dois pontos (sem refactors adjacentes); lint/testes do
> engine permanecem verdes. QA re-verifica por amostragem."

## Problem

Two pre-existing stale counts in the voxelDojo engine (defect class D2 —
doc ≠ realidade), first-hand confirmed by QA at PR #435 head `6687067`
(AID-2087 verdict, §Flag fora de escopo) and re-verified by the producer at
base `fb711de`:

- `engines/voxelDojo/AGENTS.md:16` — WHERE TO LOOK table says "Game catalog
  (all 16 `game-*` packages)". Actual: **17** dirs + 17 entries in
  `catalog.json` (`game-04-task-queue` landed via `97cc3c6` / AID-1901,
  after the 16-count audit at merge `0a85deff`).
- `engines/voxelDojo/shared/sceneHarness.ts:4` — code comment says the
  `main.ts` bootstrap "was byte-identical across all 16 games". Actual:
  17 games, and all 17 `game-*/src/main.ts` consume `sceneHarness`
  (comment-only; no runtime impact).

## Proposed outcome

Both references say **17**, matching the base; no other line changes
(no adjacent refactors); engine CI stays green (biome does not include
`shared/` — see plan; the voxeldojo TS job is the authoritative check).

## Affected users and systems

Engines (voxelDojo AGENTS.md + one .ts comment); no runtime code, no gates,
no learner state, no CI config.

## Constraints

- Scope = exactly the two points flagged in AID-2087; sibling stale "16"
  mentions exist elsewhere (root `CLAUDE.md:18`,
  `engines/codexdojo-os-prototype/README.md:86`,
  `engines/codexDojo/ecosystem/MANIFEST.md:150`,
  `docs/handbook/03b_engine_codexdojo-os-prototype.md`, dated audits in
  `docs/*_2026-07-08.md`, `wiki/`) — **flagged in the issue thread, not
  edited here** (same discipline QA applied to PR #435).
- Count must be re-checked at QA review against the PR merge-base.

## Open questions

None — the issue names both points and both values.
