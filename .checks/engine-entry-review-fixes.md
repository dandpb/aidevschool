# PR495 review fixes

Source: GitHub review F1/F2 and user instruction to fix findings and leave CI green. Approved scope: request UTF-8 decoding, current-release filtering before top-three truncation, and removal of the credential-shaped sample file rejected by existing CI. No guard/test suppression, no deployment.

Profile: light. New tests are written and demonstrated failing before production changes; existing tests remain intact.

## Landing

- `server/app.mjs`: use the request stream UTF-8 decoder; preserve the existing byte limit and validation. Filter the full ranked candidates against current enabled state, then truncate only recommended results.
- Remove `.env.example`; keep the environment-variable table in README and the default values in runtime source. Keep `.env*` excluded from Git and Docker. Do not rename a credential sample to evade the guard or relax the guard.
- No new persisted schema, dependency, API contract or one-way door.

## Checks

**R1** — A valid UTF-8 description split inside a multibyte character reaches the ranker unchanged.
Proof: `node --test --test-name-pattern="R1" tests/review-regressions.test.mjs`.

**R2** — The same valid Unicode operator password authenticates in whole and split request bodies.
Proof: `node --test --test-name-pattern="R2" tests/review-regressions.test.mjs`.

**R3** — Disabling the top three during inference returns the fourth eligible engine; disabling only the top one refills to three in descending score order.
Proof: `node --test --test-name-pattern="R3" tests/review-regressions.test.mjs`.

**R4** — The unchanged repository guard reports no violations for the committed PR diff.
Proof: from repository root, `bash scripts/sdlc_guard_check.sh --base origin/main`.

**R5** — Existing feature proofs remain green and CI completes with zero failures.
Proof: `node --test tests/*.test.mjs tests/browser.spec.mjs`; `npm run check`; GitHub checks on the pushed head (skipped jobs reported separately).

## Swept

- validation: R1/R2, unchanged description bounds in feature tests.
- failure modes: R3, existing empty/fallback proofs.
- idempotency and retry: unchanged versioned writes; no retry added.
- authorization: R2 plus unchanged auth/CSRF suite.
- concurrency and ordering: R3.
- data lifecycle: no stored-data change; sample deletion does not remove runtime configuration.
- external-dependency failure: unchanged provider fallback tests; no external API contract change.
- state transitions: R3 current release recheck retained.
- observability: CI run at exact pushed head; local failing/passing evidence retained.

## Handoff

Single bounded batch: three tests, two small code changes and configuration documentation cleanup. Fresh independent verifier after fixes; no token-scale handoff needed.
