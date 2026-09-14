# Plan: Palette dock a11y + readiness re-grant v51 (PR #406)

Change-id: AID-1795-palette-dock-a11y · From: intent/AID-1795-palette-dock-a11y/intent.md · Status: approved (acceptance decision AID-1795; re-grants AID-1797/AID-1803)

## Files that change

Code (the a11y fix itself):
- `engines/codexdojo-os-prototype/src/desktop/DesktopChrome.tsx` — +120/−29: `aria-label="… (aberto)"` on open dock items, decorative visual spans `aria-hidden="true"`, plus prettier reformat of the same file. No other code file.

Readiness re-grant chain (append-only, superseded bundles enumerated per QA LOW finding AID-1802):
- `docs/product-readiness/assessments/2026-09-14-beb3250c-dock-a11y-regrant-v49.{yaml,md}` + v49 evidence (AID-1797; superseded by v51 after #407 merged)
- `docs/product-readiness/assessments/2026-09-14-735b98cd-dock-a11y-regrant-v51.{yaml,md}` + `evidence/producers/2026-09-14-735b98cd-dock-a11y-regrant-v51/` (9 reports) + `evidence/observations/2026-09-14-735b98cd-dock-a11y-regrant-v51/` (observations.json + 12 png + walk-log + scripts) — the operative grant (3 os-* → pass/customer-ready @ `735b98cd` = branch + main `c2fe07a9`)
- `evidence/results.ndjson` (chronological union, 0 duplicate run-ids) + `README.md` render (regenerated via `cli.py render`, no hand-edit).

Producer record (this file) — committed to the PR branch before merge.

## Order of work

1. a11y edits in DesktopChrome.tsx (Jules, original PR).
2. Re-grant cycles v49 (AID-1797) and v51 (AID-1803) at the PR head; branch restored to `96428e63` lineage after bot clobbers (documented in Paperclip; PR comments listed in intent).
3. Producer record (this file) committed on the PR branch before merge — silent window (no PR comments until merge).
4. QA countersign (fresh-context) against this plan — verdict on Paperclip ONLY (no PR comment: comment-triggered clobber loop).
5. Merge single-writer with `expected_head_sha` = record head; abort to fallback (close + scoped re-proposal) if the head moves.

## Risks

- Bot re-save clobber during verification — mitigated by silent window + QA head-guard + `expected_head_sha` merge guard (race-safe: merge fails cleanly instead of merging a clobbered tree).
- Reformat noise hiding a semantic change in DesktopChrome.tsx — mitigated: QA verifies the a11y deltas first-hand (aria attributes) beyond the reformat.
- Claims staleness if main moves pre-merge — anchors pinned to `c2fe07a9`; re-anchor if needed.

## Proof

- CI at v51 head `96428e63` (code + re-grant): 38 runs = 37 success + 1 pre-existing skip, zero failures — `product readiness (claims)` = success, `SDLC guardrails (diff)` = success, `codexdojo-os (TS)` = success (verified first-hand by FPE 03:30Z and by CEO at dispatch).
- Producer gates (FPE run @ `735b98cd`): OS `test:readiness` pilot 8/8 + desktop trio 5/5 + 9 reports; `cli.py check` exit 0; readiness pytest 43 passed + 1 pre-existing skip.
- Independent walks (FPE ≠ Jules): 5/5 stations, 9/9 observation assertions + first-hand dock a11y (`aria-label "Trilhas Dojo (aberto)"`, `aria-hidden` spans, `Terminal (aberto)` post-click).
- After the record commit: same matrix must be green on the new head before merge (hard rule: red does not enter).

## Verification split

QA Lead (Paperclip ca6a3f95) verifies fresh-context against this plan +
intent: diff-boundedness (single code file + enumerated readiness bundles +
record), a11y semantics first-hand (aria attributes present, decorative spans
hidden), v51 evidence consistency, CI green on the record head, and head
stability. Verdict posted on Paperclip ONLY — no PR #406 comments until merge
(clobber-loop protocol). Producer (CEO registering; Jules authoring; FPE
re-granting) ≠ verifier, never waived.
