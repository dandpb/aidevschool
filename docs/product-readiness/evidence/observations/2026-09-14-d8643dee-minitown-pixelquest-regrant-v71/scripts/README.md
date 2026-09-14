# QA observation bundle — re-grant v71 (AID-1924, PR #427)

Independent observation phase (runbook `docs/product-readiness/REGRANT-RUNBOOK.md`
§Fluxo automatizado passo 4). Tree: PR #427 head `d8643dee` (branch
`regrant/auto-20260914-7dfc665f`); base main `c552a1e9` (pós-#424).

Use cases in scope (exactly the STALE-WINDOW set flagged by the factory @7dfc665f):

- `minitown-explore-only` — intended tier `experimental`
- `pixelquest-evidence-encounter` — intended tier `customer-ready`

Pending independent assertions (from `regrant --propose` exit 3 checklist):

- minitown-explore-only
  - [ ] `experimental-boundary-is-understood` (document-review)
- pixelquest-evidence-encounter
  - [ ] pixelquest-encounter-evidence: `learner-distinguishes-evidence-from-mastery` (observation)
  - [ ] pixelquest-evidence-recovery: `replay-recovers-evidence-without-state-promotion` (document-review)
  - [ ] pixelquest-evidence-recovery: `missing-evidence-does-not-count-as-completion` (observation)
  - [ ] pixelquest-returning-evidence-handoff: `no-false-mastery-on-return` (observation)

Methodology (same as v35 @79bf72c8 / v53 @dd98e96a precedents):

1. Producer gates re-run on this tree (`pnpm run smoke` in `engines/miniTown`
   and `engines/pixelDojo`) — reports re-emitted with `gitSha == HEAD` and
   fingerprints of the final tree (aggregation.py:142 rejects the @7dfc665f
   snapshot as input here).
2. QA-authored Playwright walk specs in `scripts/` drive each surface
   first-hand; screenshots land in `ev/`, structured walk logs in `logs/`.
3. `aggregate --reports <minitown+pixelquest only> --observations <this bundle>`
   → candidate; `regrant --propose` → exit 0 writes assessment v71
   (re-promotion only: tiers preserved, no new claims, no gate relaxation).
