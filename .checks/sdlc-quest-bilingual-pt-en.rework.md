# sdlc-quest bilingual PT/EN — PR #497 rework record (findings + test-edit trailer)

Rework lane AID-2455 (delegated from triage AID-2453). Branch
`feature/sdlc-quest-bilingual`; rework findings commit
`3cb975227e419a810f00f0f97e1fd089361a28ef`; this commit carries the owner-approved
test-edit trailer. **Merge stays with the FPE via AID-2453** (verdict + countersign);
this lane does not merge.

## Review findings resolution (all 🟠 + 3 of 4 🟡)

| Finding | Resolution at `3cb9752` |
|---|---|
| 🟠 SHA256SUMS stale at HEAD (22 `(alterado)`) | manifest rehashed over the same 227 tracked paths; `tools/check-package.cjs` exit 0 (pt and en) |
| 🟠 build.py omits `lang` | `'lang'` inlined first (same SCRIPTS order as build.cjs); `sdlc-quest.html` rebuilt; both builders byte-identical (`cmp` clean, 393,725 bytes, 0 external src refs) |
| 🟠 6 pt-BR chrome literals in EN sessions | `gateCandidate`/`gatePolicy`/`stationEyebrow` STRINGS keys; `backLabel` in tlc-app; world.js nameplates via `QuestLang.field(name_en)` + CAPTIONS table following the active language; oversized-backup pre-check reuses core `backupTooLarge` (exposed as `QuestCore.message`); PT-visible bytes unchanged |
| 🟠 dead `t()` in lang.js | promoted to the superset resolver (strings resolve, functions called with args, sub-tables raw, pt fallback, absent → `''`); world.js is the first production caller; unit assertions kept and extended |
| 🟠 parity walker misses STRINGS/STEPS | additive C8 walker in `tests/i18n.test.cjs`: 11 STRINGS/CHROME/CAPTIONS tables across src+tools, harness STEPS `*_en` guard, runtime glossary 4-column guard, planted-drift proofs |
| 🟡 harness glossary tuples 2-col | EN pair added; 4-column guard test |
| 🟡 EXCLUDE literal out of sync | `.design`/`.tasks`/`.checks` synced to the 20-key test literal; comment reworded (code = pt-BR fixtures by scope) |
| 🟡 lang.js header claim | reworded to "never a raw key or undefined" |
| 🟡 CHROME nested under STRINGS | not taken (data-i18n consumption path mirrors CHROME keys; parity now guarded) — rationale posted in the PR thread |

`tests/i18n.test.cjs` edits are additive on a file ADDED by this PR (base-relative `A`),
so the guard's new-test-allowed semantics hold; the only existing-test edit in the range
remains the 3 `local-package.test.cjs` lines below.

## Owner approval for the existing-test edit (3 lines, commits 897d7d8a/da9d7060)

- Acceptance record: **AID-2454**, comment `35cada7e-64aa-4332-af4e-ff276b7b1883`
  (posted 2026-09-18T18:47:42Z, issue `done`): scope = the exact 3 lines, first-hand
  diff/contract/13th-ref verification, explicit non-weakening declaration (AID-554).
- Trailer carried by THIS commit's message (audit hook; the acceptance lives in AID-2454):
  `SDLC-ALLOW-TEST-EDIT: AID-2454`

## Verification at rework head

- `node tools/test.cjs`: 339 pass / 0 fail (was 336 at `2ed5502`).
- `node tools/check-package.cjs`: exit 0, 227/227.
- quest-gate local run: build + rules PASSED; browser journeys not runnable in this
  sandbox (no playwright) — unchanged coverage argument: journeys assert PT bytes that
  did not change; CI runs the node suite.
- CI at `3cb9752` pre-trailer: all jobs green except `SDLC guardrails (diff)` failing
  solely on the local-package.test.cjs existing-test edit (annotations checked).
