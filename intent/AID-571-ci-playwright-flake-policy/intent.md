# Intent: deterministic CI stability policy for codexdojo-os Playwright smokes

Author: Paperclip AID-571 (Auditoria SDLC #5, achado A5-F4 BAIXO; owner FPE, dispatched by
CEO triage AID-572) · Change-id: AID-571-ci-playwright-flake-policy · Status: accepted
(issue gate passed — CEO dispatch: "execute a AID-571 … Escopo e critério de aceite na
issue. Padrão da casa: PR + CI verde + QA independente pre-merge.")

> One source of truth: the AID-571 issue body. Action: "Definir e landar política de
> estabilidade de CI para os smokes playwright do codexdojo-os: retry determinístico,
> quarantine com issue automática, ou fix de causa-raiz — proporcional à recorrência."
> Acceptance: "Política visível no workflow (`.github/workflows/`) ou flake root-caused
> com evidência; próxima ocorrência não deve exigir rerun manual ad hoc sem rastro."

## Problem

Two Playwright flakes in the `codexdojo-os (TS)` CI job during the AID-561 burst window,
both resolved by ad-hoc `rerun-failed-jobs` with no policy or trace (Auditoria #5, A5-F4;
2nd consecutive cycle for this incident class):

- **#154** @ `8ab331f9` (job 100028707657, 2026-09-01T21:15Z): pilot step
  `npx playwright test --config=playwright.pilot.config.ts` — 1/7 failed.
  `tests-pilot/pilot-build.smoke.spec.ts:144` "a corrected WAREHOUSE retry supersedes the
  failed attempt verification state": `Test timeout of 30000ms exceeded` waiting for
  `iframe[title="Missão WAREHOUSE…"]` → `getByTestId('start')`. Root cause (confirmed
  locally: reproduced deterministically in a no-WebGL environment): a hosted mission
  AUTO-STARTS on launch — voxelDojo `shared/sceneHarness.ts` runs
  `hostedMission.launch(game)` → `game.start()` right after renderer activation — so the
  briefing `start` control is transitional and can disappear before the test's
  `dispatchEvent('click')` lands. The incident was this race lost; `rerun-failed-jobs`
  won it. The test also lacked the `expectMissionMounted` wait the other six mission
  tests use and ran on the default 30s budget.
- **#227** @ `0d120247` (job 100052442436, 2026-09-01T22:39Z): dev-server step — 1/5
  failed. `tests/chapter-continuity.smoke.spec.ts:21` (`completeLiteracyMission`,
  l22 output_comparison radio `output-out-a`): `locator.check: Clicking the checkbox did
  not change its state` with call log `<span>…</span> intercepts pointer events` →
  `element is not stable` → click dispatched but state unchanged. Root cause: the
  literacyDojo option cards render `<label class="option-card"><input/><span>…</span></label>`
  with a hover `transform` transition (`styles.css` §1188: `transition: transform 140ms…`,
  `:hover { translateY(-2px) }`); Playwright's `check()` targets the 20px input under the
  text span, and a re-render mid-click can swallow the state change. Test-side interaction
  fragility, not an app defect — a real learner clicks the card.

## Proposed outcome

1. Both known flakes root-caused and fixed at the source (test robustness; assertions
   unchanged — no check is weakened).
2. A visible, deterministic CI retry policy in `.github/workflows/ci.yml`: the
   `codexdojo-os` job's two Playwright steps run with `--retries=1`. A transient flake is
   retried in-process (run stays green without ad-hoc manual rerun) and surfaces as
   Playwright's named `flaky` listing in the job log plus the retained trace — the
   durable trace the audit demanded. A real regression fails twice and still fails the job.
3. Recurrence escalation path documented here: if the flaky listing re-appears on the
   same test after this lands, the follow-up is quarantine-with-auto-issue (promote the
   flaky summary to a Paperclip issue automatically), not another silent retry bump.

## Affected users and systems

`.github/workflows/ci.yml` (codexdojo-os job only), `engines/codexdojo-os-prototype/tests-pilot/pilot-build.smoke.spec.ts`,
`engines/codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts`,
`intent/AID-571-ci-playwright-flake-policy/`. No engine runtime, learner state, or
curriculum content changes. Local `npm run test:smoke` / `test:smoke:pilot` defaults stay
`retries: 0` (fast local feedback); the retry policy is CI-scoped and lives in the
workflow where the acceptance criterion requires it visible.

## Constraints

- Both edited spec files are existing tests: guarded by `protect-tests` (CI job
  `sdlc-guards`). Owner acceptance for the test edit is the AID-571 assignment itself
  (CEO dispatch via AID-572 triage, recorded in the issue thread); the commit carries
  `SDLC-ALLOW-TEST-EDIT: AID-571` as the auditable trailer. Assertions preserved:
  same end states (`toBeChecked`, mission completion, verification-state copy).
- No new dependencies; `--retries` is a Playwright CLI flag.
- `workers: 1` stays (fixed-port shared engine servers); an in-process retry re-runs the
  spec serially in a fresh browser context, so IndexedDB/localStorage state is clean.
- Producer ≠ verifier: independent QA verdict on the PR before merge (house pattern).
