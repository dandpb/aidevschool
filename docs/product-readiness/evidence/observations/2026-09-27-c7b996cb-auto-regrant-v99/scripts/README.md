# Reproduction scripts — observation bundle v99 (AID-3121)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`.

- Citation check: `python3 /tmp/opencode/regrant597/check_citations.py <worktree>`
  (extractor+checker kept in the QA session workspace; each `PASS` line in
  `../logs/first-hand-checks.log` is the assertion — file:line contains fragment).
- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check --require-current`
  at the branch tree (rc=1, 9 STALE-WINDOW — `../logs/claims-job-36325382572-red-gate.txt`).
- CI receipts: artifact download of run 36325382572 (6 engine artifacts), archived in
  `../logs/ci-run-36325382572/`; identity vs factory snapshot = 24/24 key-equal.
- Digest identity: `cli.py producer-report --engine <dir> --output regen/<dir>` at HEAD
  c7b996cb for the 6 engine dirs, then per-receipt comparison (sourceFingerprint,
  manualFingerprint, assertion ids/outcomes, artifact sha256 sets) — `../logs/regen-identity.log`.
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q` (221p/1s) and
  `python3 engines/dojoToday/tools/selfcheck.py` (OK) — `../logs/substrate-selfcheck.log`.
- Main-tip checks: `GET /repos/dandpb/AiDevSchool/commits/f9686b0b.../check-runs` —
  `../logs/main-tip-f9686b0b-check-runs.json` (27 green / claims red).
