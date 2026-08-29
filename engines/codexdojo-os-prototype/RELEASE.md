# Release metadata and rollback — codexDojo OS pilot

Scope: the static pilot deploy of the canonical host (`engines/codexdojo-os-prototype/`,
Netlify site `aidevschool-codexdojo-os`). Readiness claims live in
`docs/product-readiness/`; this file only records what a release is, how it is
promoted, and how it is rolled back.

## Release metadata

A release candidate is identified by:

- **Git SHA** of `main` that passed the blocking CI checks (`../../.github/workflows/ci.yml`;
  branch protection on `main` requires them for every merge — verification trail
  in the AID-58 QA report work-product).
- **Mission catalog versions** pinned in `config/mission-bindings.yaml`
  (e.g. literacy `contentVersion: "2026-08-21.1"`, per-game
  `contentVersion: "game-02-warehouse@0.1.0"`) and projected, read-only, into
  `src/data/missions.ts` by `python3 -m learner.substrate`. Never hand-edit the
  projection.
- **Runtime version stamps on every behavioral analytics event**: `engineId`,
  `engineVersion`, `contentVersion`, and `missionRunId` are part of the
  content-free event context (`src/analytics/events.ts`), so a queued batch can
  always be attributed to the exact release that produced it.

Record the promoted SHA (and deploy URL) in the release/QA evidence trail —
e.g. the work-product QA report or the readiness assessment that covers the
promotion.

## Promotion

1. `npm run build:pilot` — builds the OS with same-origin mission URLs and
   bundles all four mission runtimes into `dist/apps/`.
2. Publish `dist/` (Netlify build from `netlify.toml` or
   `npx netlify deploy --prod --dir=dist`).
3. Pre-check the published deploy before announcing it:
   `QA_BASE_URL=https://<draft-or-alias>--aidevschool-codexdojo-os.netlify.app/ npm run test:smoke:remote`.

## Rollback

The deploy is static: there is no server-side learner state, database, or
backend to restore. To roll back:

1. Redeploy the last known-good release: publish the previous promoted SHA
   (Netlify "publish" an earlier deploy of the same site, or redeploy that SHA
   with the commands above). Do not roll back by editing mission content in
   place — content versions are pinned per release.
2. Confirm the rollback with the same remote pre-check against the site alias.

What a rollback does **not** touch:

- Learner progress and verification receipts are on-device (IndexedDB
  `codexdojo-os`, `codexdojo-os-verification`) and survive host releases.
- Canonical learner state (`learner/learning_state.yaml`) is never written by
  the OS, so no canonical rollback is needed or possible from this surface.
- Locally queued analytics batches remain content-free and re-flush after
  rollback; their version stamps still identify the release that emitted them.

## Known limitations

- A static deploy has no local verification bridge: hosted missions report the
  verifier as unavailable rather than fake a PASS (covered by
  `tests-remote/release-journeys.remote.smoke.spec.ts`).
- Local progress is device-bound; there is no cross-device sync in the pilot
  (stated in-product in onboarding copy).
