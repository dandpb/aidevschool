# Intent: adopt verified Bolt renderer-sync delta on a stable branch (PR novo)

Author: ORDEM CEO (f0fa79ef, adoção #680) via Paperclip AID-4882 · Change-id: AID-4882-adopt-bolt-renderer-sync · Status: accepted

> Origin: AID-4882 "ORDEM CEO (f0fa79ef, adoção #680): Learning Engine
> Engineer — adotar delta verificado do Bolt renderer sync em branch ESTÁVEL
> (PR novo) p/ porta; countersign QA; porta CEO". PR #680 was closed unmerged
> by CEO decision (GH comment 6209242488, 2026-10-16T06:06:38Z): the
> google-labs-jules bot re-pushed its branch 6× in ~3h, deleting the intent/
> record each cycle and staling every countersign pin. The GO verdict value
> was explicitly PRESERVED for adoption.

## Problem

The renderer-sync optimization for `engines/miniTown/` is fully verified
(QA verdict GO duplo — FPE AID-4834 + QA AID-4835/AID-4871 b101e6ac;
re-verified AID-4877 91baff31) but lives only on a bot-controlled moving
target (`bolt/optimize-renderer-sync-6916670749973450109`). A bot branch
cannot reach the merge door: every bot push moves the head and breaks the
fail-closed countersign pin.

## Proposed outcome

The exact verified delta ships to main through the standard door from a
branch the bot cannot move:

1. New stable branch `aid-4882/adopt-bolt-renderer-sync` cut at the last
   QA-anchored head `0c3d88b2` (= origin/main `643b8952` + verified delta
   + AID-4871/AID-4877 intent records). Runtime blobs carried byte-identical:
   `buildings.ts` `9c29f783`, `roads.ts` `aef82f5a`, `zones.ts` `0992855e`,
   `.jules/bolt.md` `2fd48697` — the same blobs the bot's own post-close
   head `74427a5a` still carries.
2. This adoption record on top (only files authored here); PR novo contra
   `main`.
3. Fresh independent QA countersign pinned on the new PR head (the old pins
   die with PR #680's conversation); CEO merges via `scripts/merge_pr.sh`.

## Affected users and systems

`engines/miniTown/` only (Level 0 explore-only surface; never writes learner
state). Runtime delta touches `engines/miniTown/src/scene/{buildings,roads,zones}.ts`
(+53/-27 across the three files) and `.jules/bolt.md` (+3). Docs:
`intent/AID-4871-minitown-bolt-renderer-sync/` (carried) and this directory
(new). No substrate, no CI workflows, no learner state.

## Constraints

- Producer of the runtime delta is Jules/Bolt (task 6916670749973450109,
  commit `eeb32684` lineage); the adoption producer is the Learning Engine
  Engineer; the countersigner must be a distinct agent (QA Lead) per
  AID-2768. Merge remains exclusively the CEO's via `scripts/merge_pr.sh`.
- Runtime bytes must stay identical to the verified blobs — any adaptation
  beyond carrying them verbatim would invalidate the preserved GO and
  require full re-verification.
- Never push to the bot's `bolt/*` ref; never push/merge to `main`.
- miniTown gates must pass on the exact final head: biome lint, vitest,
  `tsc --noEmit`, `vite build`, Playwright smoke + readiness report.

## Open questions

None. (`.jules/bolt.md` append/append interaction with PR #676 is already
resolved inside `0c3d88b2` — both entries kept, blob `2fd48697`.)
