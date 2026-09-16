# Intent: stale "16" sweep outside voxelDojo — 5 flagged sites → 17

Author: Docs & Readiness Engineer (issue AID-2092, child of AID-2091 QA re-verificação PR #436; assigned per CEO triage sweep AID-2150; scope authorized by CEO decision AID-2134/F3 instância #63) · Change-id: AID-2092-stale-16-sweep · Status: accepted

> Originates from Paperclip issue AID-2092. Quoted scope from the CEO
> decision (2026-09-16): "varredura doc-only única cobrindo os 5 pontos
> (`CLAUDE.md`, `os-prototype/README.md`, `MANIFEST`,
> `handbook 03b`, `learner/substrate/dashboard_snapshot.py:190,224`) via
> fast path §small-fix, **um único change-id** (`AID-2092-stale-16-sweep`),
> self-verification + countersign review permanecem obrigatórios
> (producer ≠ verifier)."

## Problem

Five sibling stale counts left behind by PR #436 (AID-2088 fixed only the
two in-engine voxelDojo sites and flagged these out). Defect class D2 —
doc ≠ realidade. Reality at base `2fcdf16f` (main tip):
`engines/voxelDojo/` has **17** `game-*` dirs and `catalog.json` has
**17** entries (`game-04-task-queue` TASK FORGE landed 2026-09-14 via
`97cc3c6e` / AID-1901; emitter observations via `f7640aee` / AID-1906).
The 17 fixed catalog ports are `5177`, `5202`–`5209`, `5211`–`5218`.

Stale sites (all doc/comment-only, no runtime change):

- root `CLAUDE.md:18` — "(16 games implementados; piloto game-10-hash-ring)".
- `engines/codexdojo-os-prototype/README.md:86` — "any of the 16 game packages".
- `engines/codexdojo-os-prototype/README.md:102` — "the 16 fixed voxel catalog ports".
- `engines/codexDojo/ecosystem/MANIFEST.md:46` — "**16 spatial-concept games
  implemented**" + list omitting `game-04-task-queue` + "The two rules-shaped
  concepts (01 rate limiter, 04 task queue) live in pixel-quest".
- `engines/codexDojo/ecosystem/MANIFEST.md:150` — "all 16 voxel games".
- `docs/handbook/03b_engine_codexdojo-os-prototype.md:23` — "all 16 voxelDojo
  game packages (`5177`, `5202`, `5203`, `5205`–`5209`, and `5211`–`5218`)"
  (port list omitted `5204`).
- `docs/handbook/03b_engine_codexdojo-os-prototype.md:59` — "voxelDojo includes
  all 16 game packages".
- `learner/substrate/dashboard_snapshot.py:190` — "#: All 16 voxelDojo game
  directories". `VOXEL_GAME_UNIT_IDS` is derived from `catalog.json` at
  runtime, so this is comment-only — no functional gap (verified first-hand).
- `learner/substrate/dashboard_snapshot.py:224` — docstring ratio "15/16"
  describing the historical hand-copied-stub failure mode.

## Proposed outcome

All live counts say **17**; the MANIFEST game list includes
`game-04-task-queue`; the handbook port list includes `5204`
(`5202`–`5209`); the pixel-quest sentence distinguishes 01 (pixel-only)
from 04 (pixel + voxel); the dashboard docstring keeps the historical
15-of-16 reference explicitly marked as historical (the catalog now has
17). No other line changes; CI stays green.

## Affected users and systems

Docs/comments only across root CLAUDE.md, codexdojo-os-prototype README,
codexDojo ecosystem MANIFEST, handbook 03b (docs/), and one Python
docstring/comment pair in the learner substrate. No runtime code, no
gates, no learner state, no CI config.

## Constraints

- Scope = exactly the 5 flagged points (9 lines). Dated audit records
  (`docs/*_2026-07-08.md`, `wiki/`) stay untouched — dated claims are
  evidence, not living docs (same discipline as PR #436/AID-2088).
- Domain boundary: engine/learner files are outside the Docs writer's
  default scope (`docs/`, `wiki/`); this sweep is explicitly authorized by
  the CEO decision AID-2134/F3 (single change-id, doc-only, low risk).
  Engine-domain content changes limited to stale counts + the one factual
  sentence the stale count falsified.
- **Lacuna reported, not masked**: `game-04-task-queue` has no voxel-side
  PLAN slice in `engines/voxelDojo/docs/plans/` (it records `DECISIONS.md`;
  the `04_concurrent_task_queue.md` plan slice is pixel-side). The MANIFEST
  now states this explicitly instead of implying parity. Follow-up belongs
  to the voxelDojo owner (Learning Engine Engineer).
- Count must be re-checked at QA review against the PR merge-base.

## Open questions

None — the issue names the 5 sites; values verified first-hand against
`catalog.json`, dir listing, and ports at base `2fcdf16f`.
