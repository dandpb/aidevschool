# Plan: Permanent regression test for Town.pickRandomShopId (rng discipline + eligibility)

Change-id: AID-695-pickrandomshopid-regression-test · From: intent/AID-695-pickrandomshopid-regression-test/intent.md · Status: approved (AID-695 issue body done-criteria; CEO execution order AID-704)

## Files that change

- `engines/miniTown/tests/shopping.test.ts` (new) — the only code artifact.
- `intent/AID-695-pickrandomshopid-regression-test/intent.md`, `plan.md` (new) — SDLC artifacts.

## Order of work

1. Add `tests/shopping.test.ts` with twin-town builders (`buildShoppingTown`: 3 inhabited
   shops + inhabited residential/workspace + one late shop left on `plot`;
   `buildNoShopTown`: inhabited non-shops + uninhabited shop). `placeZone`/`tick` never
   consume rng, so identically-built towns share one splitmix32 stream — that lockstep is
   the draw-count oracle.
2. Five cases: eligibility set; membership per call; one-draw lockstep + index mapping
   (`eligible[floor(draw * count)]`); null + zero draws (empty and no-shop towns);
   ~uniform spread over 3000 draws within a 4σ multinomial band.
3. Proof run + negative controls (mutation checks), then PR.

## Risks

- Grid-coordinate collisions between placements would make builders silently lose zones —
  mitigated by asserting every `placeZone` result is `"placed"` inside the builders.
- Statistical test flake — impossible by construction (deterministic splitmix32; 4σ band
  is orders of magnitude wider than the observed deviation).
- Testing implementation details instead of behavior — the lockstep/index assertions pin
  the observable contract (draw discipline + eligible-order mapping) that the AID-694
  triage established; no private state is poked.
- Alternatives considered and NOT chosen: exposing/injecting the PRNG (production change,
  forbidden by the test-only window); copying the triage's differential old-vs-new harness
  (duplicates the old implementation as an oracle; single-implementation lockstep is
  smaller and sufficient).

## Proof

Commands (from `engines/miniTown/`, per AGENTS.md COMMANDS):

- `pnpm run test` → 4 test files, 31 tests passed (was 26; +5 in `tests/shopping.test.ts`).
- `pnpm run lint` → biome check clean. `pnpm run typecheck` → tsc --noEmit clean.
- Negative controls (temporary mutations of `src/scene/state.ts`, reverted after each):
  consume-rng-on-empty → 1 failed; drop stage check → 3 failed; clamp index to 0 →
  uniformity failed; extra draw per call → lockstep failed. Every mutation caught;
  `git status` clean afterwards (only the new test file + intent artifacts).
