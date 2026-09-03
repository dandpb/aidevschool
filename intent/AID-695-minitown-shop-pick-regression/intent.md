# Intent: permanent regression coverage for miniTown `Town.pickRandomShopId`

Author: Paperclip AID-695 (owner FPE; dispatched by CEO order AID-700/AID-701) ·
Change-id: AID-695-minitown-shop-pick-regression · Status: executed (PR pending)

> One source of truth: the AID-695 issue body. Gap: `Town.pickRandomShopId`
> (`engines/miniTown/src/scene/state.ts:222`) had no direct test. The AID-694
> triage proved PR #254's functional equivalence with a disposable harness
> (lockstep rng, eligibility, null-without-rng, ~uniform distribution) — none
> of it stayed locked in the suite. Done: a permanent test in
> `engines/miniTown/tests/` covering eligibility, rng discipline, and
> result-in-eligible-set, via normal SDLC (intent/ + PR with green CI).

## Problem

Shopping trips (`src/sim/residents.ts:299`) depend on `pickRandomShopId` for
target selection. The optimized implementation (PR #254, merged at main
`22c5fdd1`) is behaviorally identical to the pre-merge version per AID-694's
differential triage, but that evidence was ephemeral. A future refactor (e.g.
another filter/sort chain swap) could silently change eligibility, rng
consumption, or distribution and no suite would fail.

## Proposed outcome

New test file `engines/miniTown/tests/shopPicker.test.ts` (added, not an edit —
no `SDLC-ALLOW-TEST-EDIT` trailer required per the AID-554/PR #255 policy)
asserting, over the current implementation:

1. **Eligibility** — only `stage === "inhabited"` buildings whose zone type is
   `shop` are returned; inhabited residential/workspace and earlier-stage
   shops are excluded (mixed-town fixture, eligible set of exactly 3, every
   draw inside the set, all 3 seen over 300 draws).
2. **rng discipline** — a successful pick consumes exactly one roll; with no
   eligible shop the call returns `null` consuming zero rolls (monkey-patched
   `town.rng` counter around the call).
3. **Lockstep mapping** — the pick equals `floor(nextRoll * eligibleCount)`
   over the deterministic splitmix32 stream (twin-town comparison; both towns
   roll the same next value afterwards, proving exactly-one advancement).
4. **Distribution** — chi-square bound (df=3, critical ~16.27) over 10k draws
   across 4 eligible shops.

## Affected users and systems

`engines/miniTown/tests/shopPicker.test.ts` (new), this intent folder. Test-only:
zero production surface, catalog, content, or product-doc changes; no changes to
existing tests. Verification: engine-local `npm run test` (31/31), `npm run lint`
(biome), `npm run typecheck` (tsc) — all green locally; PR CI runs the same
vitest suite plus the SDLC guardrail self-test.

## Verification / ship gate

Producer ≠ verifier: after green CI, independent QA verdict (QA Lead ca6a3f95)
is required before merge; merge happens single-writer on main via the FPE's own
board confirmation card — not before acceptance. AID-695 closes with a receipt
on its own thread after merge.
