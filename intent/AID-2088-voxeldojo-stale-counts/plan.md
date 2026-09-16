# Plan: voxelDojo stale "all 16" — AGENTS.md + sceneHarness.ts comment → 17

Change-id: AID-2088-voxeldojo-stale-counts · From: intent/AID-2088-voxeldojo-stale-counts/intent.md (bounded doc fix, issue-ordered) · Status: approved

## Files that change

- `engines/voxelDojo/AGENTS.md` — 1 line (WHERE TO LOOK row: 16 → 17)
- `engines/voxelDojo/shared/sceneHarness.ts` — 1 comment line (16 → 17)
- `intent/AID-2088-voxeldojo-stale-counts/` — (new) this record

## Order of work

1. Verify first-hand at base `fb711de`: `git ls-tree -d` → 17 `game-*` dirs;
   `catalog.json` → 17 entries; `grep -rn 'all 16'` in engine → exactly the
   two flagged points; all 17 `game-*/src/main.ts` reference `sceneHarness`.
2. Apply the two 16→17 edits; nothing else.
3. Sanity: biome config only includes `game-*/src` + `game-*/playwright`
   (`shared/` is not linted — `npx @biomejs/biome check` reports the path
   ignored), so the authoritative green proof is PR CI (voxeldojo TS job:
   install/typecheck/vitest + SDLC guardrails + DESIGN.md lint untouched).
4. Open isolated PR; request QA Lead sampling re-verification (AID-2087
   chain) in the AID-2088 thread.

## Risks

- Count drifts again before merge (a `game-19` landing) — mitigated by citing
  the base commit in the PR body; QA re-counts at review merge-base.
- Historical statement in sceneHarness.ts ("was byte-identical") could be
  read as a past-tense claim about 16 games at extraction time — kept as
  issue-ordered (QA confirmed the intended reading: the invariant holds
  across the current 17).

## Proof

- `grep -rn 'all 16' engines/voxelDojo/` → 0 hits after fix
- `ls -d engines/voxelDojo/game-* | wc -l` → 17; `catalog.json` → 17 entries
- Diff: `git diff --stat` → 2 content files + this intent record; comment/
  doc-only (no runtime surface)

## Verification split

QA Lead (independent) re-verifies by sampling the diff against this plan:
count via `git ls-tree -d` / `catalog.json` at the PR merge-base, absence of
adjacent changes, CI green on the PR head.
