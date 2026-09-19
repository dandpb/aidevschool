# Reproduction scripts — observation bundle v98 (AID-2584)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python one-liner recorded in `../logs/first-hand-checks.log`.

- Citation check (file:line contains fragment, for every guide/source citation in
  `../observations.json`): read the cited line and compare content — the exact
  command sequence is linear in the log; each line of the log is the assertion.
- Artifact digest identity: `sha256(file) == receipt.artifacts[].sha256` for each
  receipt in `../logs/ci-run-35470259289/`.
- Guides-unchanged: `git log --oneline 3aca4d5d..HEAD -- <cited files>` (empty).
- Group drift: `git log/diff --stat 3aca4d5d..HEAD -- <group sourcePaths>`
  (single commit 114b9f09, engines/voxelDojo/game-14-river-delta/src/sim/levels.ts).
- Group fingerprint at HEAD: recomputed via
  `docs/product-readiness/tools/cli.py check --require-current` pre/post-promotion
  (rc 1 → 0) and by the `source_fingerprint` helper on the loaded domain
  (ecfc01ef…02988, identical to factory reports @13f22ef4).
