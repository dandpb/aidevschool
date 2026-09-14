# Plan: Sentinel noopener + readiness re-grant v50 (PR #407)

Change-id: AID-1795-sentinel-noopener-regrant · From: intent/AID-1795-sentinel-noopener-regrant/intent.md · Status: approved (acceptance decision AID-1795; re-grant AID-1797)

## Files that change

Code (the security fix itself, +17/−4):
- `engines/literacyDojo/src/app/App.tsx` — `rel="noreferrer"` → `rel="noopener noreferrer"` (Pedir suporte link).
- `engines/literacyDojo/src/components/SupportCta.tsx` — same on WhatsApp link.
- `engines/codexdojo-os-prototype/src/journey/SupportCta.tsx` — same on WhatsApp link.
- `.jules/sentinel.md` — appended learning-log entry (+4).

Repo hygiene (adjudicated hunk):
- `engines/zai-duolingo-like` — orphan gitlink removed (−1; 160000 → unresolvable `81098710`, no `.gitmodules` on main). KEEP per FPE adjudication (PR comment `5658223259`); QA countersign must ratify explicitly.

Readiness re-grant v50 (AID-1797, anchored @ 89040bec = branch + main `7b5ddaf2`):
- `docs/product-readiness/assessments/2026-09-14-89040bec-noopener-regrant-v50.{yaml,md}`
- `docs/product-readiness/evidence/producers/2026-09-14-89040bec-noopener-regrant-v50/` (17 files)
- `docs/product-readiness/evidence/observations/2026-09-14-89040bec-noopener-regrant-v50/` (obs.json + 18 png + scripts os/literacy + logs)
- `docs/product-readiness/results.ndjson` (+17), `docs/product-readiness/README.md` (render).

Producer record (this file) — committed to the PR branch before merge.

## Order of work

1. noopener edits on the three links + sentinel log (Jules, original PR).
2. Readiness re-grant v50 cycle at the PR head (AID-1797): producer gates, independent observation walks, assessments, README render.
3. Producer record (this file) committed on the PR branch before merge.
4. QA countersign (fresh-context) against this plan — including explicit gitlink ratification.
5. Merge single-writer citing the countersign; #406 re-anchor follows this merge (shared os-* sourcePaths).

## Risks

- Merging this PR stales #406's os-* anchors (known overlap; #406 is routed for re-anchor after this merge — AID-1797 tradeoff).
- `rel` attribute duplication/typo — mitigated: first-hand DOM verification in walks (both surfaces).
- Readiness evidence staleness if main moves pre-merge — mitigated: anchors pinned to `7b5ddaf2`; re-anchor cycle run by the factory owner if main moves again.

## Proof

- CI at code+re-grant head `6749879c`: 37 success + 1 pre-existing skip, zero failures — `product readiness (claims)` = success, `SDLC guardrails (diff)` = success, `literacyDojo (TS + content)` = success, `codexdojo-os (TS)` = success (verified first-hand 02:40Z by FPE and by CEO at dispatch).
- Producer gates (FPE run): literacy e2e 23/23; OS `test:readiness` pilot 8/8 + desktop trio 5/5; `cli.py check` exit 0; readiness pytest 43 passed + 1 pre-existing skip.
- Independent walks (FPE ≠ Jules): 5/5 OS + 2/2 literacy specs (15/15 observation assertions) + first-hand `rel="noopener noreferrer"` DOM checks on `support-whatsapp` and `Pedir suporte`.
- After the record commit: same matrix must be green on the new head before merge (hard rule: red does not enter).

## Verification split

QA Lead (Paperclip ca6a3f95) verifies fresh-context against this plan + intent:
diff-boundedness (no hunks beyond Files that change), noopener correctness on
all three links, gitlink-hunk ratification (explicit verdict citing FPE
evidence), v50 evidence bundle consistency (assessments ↔ producers ↔
observations ↔ README render), CI green on the record head. Producer (CEO
registering; Jules authoring; FPE re-granting) ≠ verifier, never waived.
