# Plan: deterministic CI stability policy for codexdojo-os Playwright smokes

Change-id: AID-571-ci-playwright-flake-policy · From: intent/AID-571-ci-playwright-flake-policy/intent.md
(small-fix fast path: bounded change, plan block kept short) · Status: approved (issue scope
assigned to FPE by CEO triage AID-572)

## Files that change

- `engines/codexdojo-os-prototype/tests-pilot/pilot-build.smoke.spec.ts` (modified) —
  the WAREHOUSE retry test gains the same `expectMissionMounted` wait the other six
  mission tests already use, `test.setTimeout(120_000)` (two full warehouse playthroughs
  under one budget), and — the actual #154 fix — replaces the racy click on the
  transitional briefing `start` control with a wait for the predicting phase
  (`hud-status` "— clique na prateleira"), which hosted missions reach via the
  sceneHarness auto-launch on both renderer paths (WebGL and accessible fallback).
  Reproduced deterministically locally before the fix (no-WebGL environment: auto-start
  always wins the race); passes after.
- `engines/codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts` (modified) —
  new `checkControl(mission, testId)` helper: idempotent click on the option card label
  (`input` → `xpath=ancestor::label[1]`, the real learner target, no 20px-under-overlay
  hit) wrapped in a retrying `expect(fn).toPass()` that re-clicks only while unchecked
  and asserts `toBeChecked()`. All `check()` calls in `completeLiteracyMission` route
  through it (choice, output_comparison, missing_context, rubric_review,
  safety_classification share the same `label.option-card` markup).
- `.github/workflows/ci.yml` (modified) — codexdojo-os job: both Playwright steps get
  `--retries=1` with a policy comment citing AID-571/A5-F4 (deterministic in-process
  retry; flaky listing in the log is the trace; regression still fails; escalation path
  = quarantine + auto-issue on recurrence).
- `intent/AID-571-ci-playwright-flake-policy/{intent,plan}.md` (new — this chain).

## Order of work

1. intent/plan (this chain).
2. Spec fixes (#154 mount wait + timeout; #227 checkControl).
3. CI retry policy wiring.
4. Verify: `tsc --noEmit` for both specs; run the pilot suite locally (build + bundle +
   `playwright.pilot.config.ts`) and the `chapter-continuity` spec locally if the full
   dev-server fleet comes up; `scripts/sdlc_guard_check.sh --self-test` and
   `--base origin/main` on the branch (expects the disclosed test-edit finding without
   the trailer, clean with it).
5. Branch `aid-571/ci-playwright-flake-policy`; commit test edits with
   `SDLC-ALLOW-TEST-EDIT: AID-571`; PR with the root-cause evidence (job logs) in the
   body; CI green; independent QA verdict before merge (producer ≠ verifier).

## Risks

- Retrying could mask a real intermittent defect — bounded to 1 retry, both known
  instances root-caused to test-side fragility; the flaky listing stays visible in the
  log and the escalation path is pre-declared (quarantine + auto-issue on recurrence).
- Label-click changes the interaction target — same user gesture the UI advertises
  (`cursor: pointer` card); end-state assertions unchanged, so evidence value is
  preserved.
- `toPass` retry loop could toggle a checkbox off on re-click — guarded by the
  `isChecked()` pre-check (idempotent); radios cannot toggle off by label click.
- Not chosen: quarantine now (only 2 incidents, both root-caused — disproportionate);
  auto-issue on every flake (spam for a BAIXO finding; becomes the named escalation
  path instead); raising local `retries` in the configs (hides flakes from the producer
  where feedback should stay strict).

## Proof

- Root-cause evidence: job logs 100028707657 (step 22, pilot, 30s test timeout at
  `pilot-build.smoke.spec.ts:148`) and 100052442436 (step 23, dev-server, check()
  interception at `chapter-continuity.smoke.spec.ts:21`) — quoted in intent.md; #154
  additionally reproduced first-hand (deterministic pre-fix failure in a no-WebGL
  environment, same wait for `start`).
- Local verification (this change, `--retries=1` exactly as CI): pilot suite
  **7 passed** (17.5s; previously-failing test 3.2s); dev-server trio
  (chapter-continuity + renderer-fallback + readiness-recovery) **5 passed** (1.1m);
  `npm run lint` (biome, same scope as CI) clean; `sdlc_guard_check.sh --self-test`
  10/10. CI run on the PR is the executable proof (`sdlc-guards` clean with trailer).
