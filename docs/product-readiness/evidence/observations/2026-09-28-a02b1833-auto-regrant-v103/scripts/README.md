# Reproduction scripts — observation bundle v103 (AID-3281)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`.

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check --require-current`
  at the branch tree 4cff0f02 (rc=1, 1 STALE-WINDOW group — `../logs/red-gate-branch.txt`);
  same output from the CI job `product readiness (claims)` of main push run 36491949848
  @a02b1833 — `../logs/claims-job-36491949848-red-gate.txt`.
- Drift cause: `git diff --name-only 8390e913..a02b1833` (only
  `engines/voxelDojo/game-03-wormhole/src/scene/hud.ts` + `src/sim/levels.ts` outside
  docs/product-readiness; mechanical `.filter(...).length` → loop counters, semantics
  preserved — window check in `../logs/first-hand-checks.log`).
- Citation carry-over: all 15 distinct cite targets of the v101 bundle byte-identical in
  01696f77..4cff0f02 (`../logs/citation-carryover.log`); load-bearing boundary strings
  spot-checked first-hand at file:line (`../logs/first-hand-checks.log`).
- CI receipts: artifact download of run 36491949848 (7 readiness artifacts), scenario
  receipts archived in `../logs/ci-run-36491949848/`; identity vs factory snapshot = 24/24
  key-equal (`../logs/ci-receipts-identity.log`).
- Digest identity: `cli.py producer-report --engine <dir> --output regen/<dir>` at HEAD
  4cff0f02 for the 6 engine dirs (pixelDojo at engines/pixelDojo), then per-report
  comparison (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact
  sha256 sets) — `../logs/regen-identity.log` (24/24 identical).
- Fingerprint drift v101→v103: exactly 3 scenarios (the os-voxel-guided-missions use
  case) — `../logs/fingerprint-drift-v101-v103.txt`.
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q` (221p/1s)
  and `python3 engines/dojoToday/tools/selfcheck.py` (OK) — `../logs/substrate-selfcheck.log`.
