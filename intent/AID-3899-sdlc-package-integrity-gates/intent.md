# Intent: sdlc-quest package integrity wired into blocking gates (D1 stale manifest + D2 disconnected check)

Author: FPE (agent fa8130d5) · Change-id: AID-3899-sdlc-package-integrity-gates ·
Status: accepted (carrier AID-3899, high-priority DEFECT; small-fix fast path —
intent/spec/plan collapsed into this file; self-verification and independent
review are NOT skipped)

> Paperclip carrier: AID-3899 "DEFECT (alto) sdlc-quest: SHA256SUMS stale no RC
> r4 + check-package fora dos gates bloqueantes (achado L13/AID-3687)".
> Source finding (quoted, one source of truth):
> `/paperclip/aid3687-evidence/l13-round-r4-results.md` §Defeitos D1/D2
> (AID-3687 lens L13, executed on RC r4 `b20fdc74`): D1 — manifest stale
> (`src/core.js` sha `dd82013e…` ≠ pin `7f9e24ad…`; cause: `a40aff81` changed
> source without rehash, practice precedent `3cb97522`); D2 — tamper detection
> disconnected (`npm test` and `npm run gate` never call `check-package.cjs`;
> tampered README passes 339/339). Authorization quoted there: "rehash
> autorizado + wiring em gate".

## Problem

The sdlc-quest self-verification manifest (`SHA256SUMS.txt`) does not match the
shipped bytes (`node tools/check-package.cjs` → exit 1: `sdlc-quest.html`,
`src/core.js` altered), and the only tool that detects tampering is not part of
any blocking gate (`npm test`, `npm run gate`, CI `sdlc-quest (TS)` job), so a
tampered package passes every gate (AID-3687/L13 D1+D2, reproduced first-hand
in this session before the fix: exit 1 with the same two entries).

## Proposed outcome

Observable, no implementation detail: `node tools/check-package.cjs` exits 0 on
a clean tree (227/227 listed files); any divergence of a listed file makes
`npm test` and `npm run gate` fail closed BEFORE tests/campaigns run, in both
console languages; CI (which runs `node tools/test.cjs`) inherits the gate.

## Decisions (plan block)

- **D1 rehash:** update ONLY stale/edited pins in place (`src/core.js`,
  `sdlc-quest.html` + the files this change edits), preserving the 227-line
  list and ordering — same practice as `3cb97522` ("manifest rehash"). No
  regeneration from a file walk (scope: pinned delivery list stays frozen).
- **D2 wiring, fail-closed, bilingual:**
  - `tools/test.cjs` runs `tools/check-package.cjs --lang <lang>` as a blocking
    precondition (stdio inherited; on non-zero exit prints the bilingual
    blocked message and returns 1 WITHOUT running the suite);
  - `tools/quest-gate.cjs` gains `['package', node, ['tools/check-package.cjs']]`
    as the FIRST command step (receipt-logged like every step; a failure stops
    the chain before build/campaigns);
  - no new npm scripts; `test`/`gate` entries stay `node tools/…`
    (`tests/local-package.test.cjs` contract); no test file edited.
- **Docs:** README.md + README.pt-BR.md describe the blocking check, the gate
  sequence (local contract → package → build → …), and the rehash discipline
  (intentional edits/reruns that change listed evidence update the manifest in
  the same change; the failure output names each divergent file). Heading
  parity and verbatim anchors preserved (`tests/docs-bilingual.test.cjs`).
- **Out of scope:** evidence-rerun idempotence of `evidence-v1.3/legacy/`
  pins (campaigns rewrite screenshots; surfaced honestly by the new gate),
  CI workflow changes (already covered by the by-name job), release/deploy.

## Self-verification (first-hand, same session)

- `node tools/check-package.cjs` → `227 arquivos conferidos` exit 0.
- `node tools/test.cjs` → 339/339 pass, exit 0.
- Tamper repro (isolated copy, README comment appended): `node tools/test.cjs`
  → exit 1 `README.md (alterado)` + blocked message (pt and en); gate receipt
  shows `package` failed and no dependent step ran.
- Clean-copy gate: `contract-shape` → `package` (passed, exit 0) → `build`
  (passed; rebuild is byte-identical) → `rules` (passed) → `campaign-desktop`
  fails (missing Python/Playwright toolkit — pre-existing, fail-closed, same
  limitation L13 documented on r4).
- `--help`/`--lang en` surfaces updated on both tools (exit 0/64 contract).

## Review

Producer ≠ verifier: independent fresh-context countersign required before
merge (this diff touches a gate — `docs/sdlc/README.md` §Founder-direct item
3); merge only through `scripts/merge_pr.sh`.
