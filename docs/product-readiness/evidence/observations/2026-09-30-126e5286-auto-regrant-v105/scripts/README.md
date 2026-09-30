# Reproduction scripts — observation bundle v105 (AID-3404)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`.

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check --require-current`
  at the branch tree 2b571a55 (rc=1, 1 STALE-WINDOW group — `../logs/red-gate-branch.txt`);
  same output from the CI job `product readiness (claims)` of main push run 36649267067
  @126e5286 — `../logs/claims-job-36649267067-red-gate.txt`.
- Drift cause: `git diff --name-only a1f0d724..126e5286` (only
  `engines/dojoToday/src/main.ts`; single-line `role="group"` addition on the
  `streak-freezes` paragraph of `streakCard` at main.ts:65, PR #606
  palette-streak-freezes-a11y — hunk `@@ -62,7 +62,7 @@`, no renumbering,
  boundary strings preserved — window check in `../logs/first-hand-checks.log`).
- Citation carry-over: all cite targets of the v103 bundle byte-identical in
  4cff0f02..2b571a55 except `engines/dojoToday/src/main.ts` (re-verified
  first-hand at :65/:79/:277) — `../logs/citation-carryover.log`. The two
  root `index.html` files changed by the v103 update-branch (bfce3945, JSON-LD
  #547) are outside every covered sourcePath (no fingerprint impact — see drift
  log).
- CI receipts: artifact download of run 36649267067 (7 readiness artifacts),
  scenario receipts archived in `../logs/ci-run-36649267067/`; identity vs
  factory snapshot = 24/24 key-equal (`../logs/ci-receipts-identity.log`).
- Digest identity: `cli.py producer-report --engine <dir> --output regen/<dir>` at HEAD
  2b571a55 for the 6 engine dirs (pixelDojo at engines/pixelDojo), then per-report
  comparison (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact
  sha256 sets) — `../logs/regen-identity.log` (24/24 identical).
- Fingerprint drift v103→v105: exactly 3 scenarios (the dojotoday-daily-guidance
  use case) — `../logs/fingerprint-drift-v103-v105.txt`.
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q` (221p/1s)
  and `python3 engines/dojoToday/tools/selfcheck.py` (OK) — `../logs/substrate-selfcheck.log`;
  docs tests 58p (`../logs/docs-tests.log`); factory tests 166p
  (`../logs/factory-tests.log`).
