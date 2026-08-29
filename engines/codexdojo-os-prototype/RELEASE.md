# Release metadata and rollback — codexDojo OS pilot

Scope: the pilot deploy of the canonical host (`engines/codexdojo-os-prototype/`,
Netlify site `aidevschool-codexdojo-os`). Readiness claims live in
`docs/product-readiness/`; this file only records what a release is, how it is
promoted, and how it is rolled back.

## Release metadata

A release candidate is identified by:

- **Git SHA** of `main` that passed the blocking CI checks (`../../.github/workflows/ci.yml`;
  branch protection on `main` requires them for every merge — verification trail
  in the AID-58 QA report work-product).
- **`dist/pilot-bundle-manifest.json`**, written by `npm run build:pilot`
  (`scripts/build-pilot-bundle.mjs`): records the bundle's `sourceRevision`
  (`COMMIT_REF`) and the SHA-256 of every surface (os, literacydojo, warehouse,
  wormhole, relay-station) plus the staged verifier function. A bundle
  that does not match its manifest is refused by `verifyPilotBundle` — the
  deploy commands abort instead of publishing drifted artifacts.
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

1. `npm run build:pilot` — builds every surface into a staged bundle, stages the
   same-origin verifier function from canonical
   `learner/gate/netlify-functions/`, writes and verifies the bundle manifest,
   and promotes it atomically into `dist/`.
2. `npm run deploy:pilot` — re-verifies the bundle and that the staged verifier
   is byte-identical to the canonical `learner/gate` source, then publishes
   `dist/` plus `netlify/functions` via the Netlify CLI. The deployed verifier
   serves `__dojo/bridge/v1/*` (redirects in `netlify.toml`) so hosted missions
   verify through the independent learner-gate boundary in production.
3. Pre-check the published deploy before announcing it:
   `QA_BASE_URL=https://<draft-or-alias>--aidevschool-codexdojo-os.netlify.app/ npm run test:smoke:remote`.

## Rollback

The deploy is static plus a stateless verifier function: there is no
server-side learner state or database to restore. To roll back:

1. Redeploy the last known-good release: publish the previously promoted SHA
   through the same pipeline (step 1–2 above), or publish an earlier deploy of
   the same site in the Netlify UI. Do not roll back by editing mission content
   or the staged function in place — the function is a projection of
   `learner/gate/netlify-functions/` and the manifest hashes must match.
2. Confirm the rollback with the remote pre-check against the site alias.

What a rollback does **not** touch:

- Learner progress and verification receipts are on-device (IndexedDB
  `codexdojo-os`, `codexdojo-os-verification`) and survive host releases.
- Canonical learner state (`learner/learning_state.yaml`) is never written by
  the OS, so no canonical rollback is needed or possible from this surface.
- Locally queued analytics batches remain content-free and re-flush after
  rollback; their version stamps still identify the release that emitted them.

## Known limitations

- Deployed verification depends on the Netlify function. If it is unavailable,
  the host reports `Verificador indisponível` honestly and local progress stays
  saved — the remote smoke asserts both the working approval path and the
  absence of false failures (`tests-remote/release-journeys.remote.smoke.spec.ts`).
- Local progress is device-bound; there is no cross-device sync in the pilot
  (stated in-product in onboarding copy).
