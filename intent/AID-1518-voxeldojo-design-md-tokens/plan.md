# Plan: voxelDojo DESIGN.md — traceable hud-panel token + accurate game count

Change-id: AID-1518-voxeldojo-design-md-tokens · From: intent/AID-1518-voxeldojo-design-md-tokens/intent.md (spec collapsed; bounded doc fix) · Status: approved

## Files that change

- `engines/voxelDojo/DESIGN.md` — 4 line-edits (token + 2 counts + prose citation)
- `intent/AID-1518-voxeldojo-design-md-tokens/` — (new) this record

## Order of work

1. Verify defects first-hand at base `fb711de` (greps recorded in intent.md).
2. Edit DESIGN.md: `hud-panel` `#0d1119` → `#0b0e14`; "18 game-* packages" → 17 (front-matter description + Overview); Colors prose cites "transparent rail over the `#0b0e14` canvas".
3. Lint before/after — confirm 0 errors, no new warnings.
4. Open isolated PR; request QA Lead validation in the AID-1518 thread.

## Risks

- Count drifts again before merge (game-19 in flight?) — mitigated by citing
  the base commit in the PR body; QA re-counts at review. Not chosen: writing
  the audit-time "16" — it is already wrong at base (17), same defect class.
- Token ambiguity rail vs fallback surface — resolved by evidence: rail is
  transparent everywhere; `--vd-surface` is `.accessible-projection`.

## Proof

- `git grep -i '#0d1119' -- engines/voxelDojo` → 0 hits after fix
- `ls -d engines/voxelDojo/game-* | wc -l` → 17; `catalog.json` → 17 entries
- `npx -y @google/design.md lint engines/voxelDojo/DESIGN.md` →
  `summary.errors == 0` (15 pre-existing warnings, unchanged)
- Diff is doc-only: `git diff --stat` → 2 files (DESIGN.md + intent/)

## Verification split

QA Lead (independent, AID-1517 authoring chain) re-verifies by sampling the
diff against this plan: token traceability (grep in engine source), count
against `ls -d`/`catalog.json` at the PR merge-base, lint JSON summary.
