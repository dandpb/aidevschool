# Reproduction scripts — observation bundle v101 (AID-3245)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`.

- Citation check: `python3 /tmp/opencode/v101/check_citations.py <bundle>/observations.json <repo>`
  (extractor+checker kept in the QA session workspace; each `PASS` line in
  `../logs/first-hand-checks.log` is the assertion — file:line window contains the quoted
  fragment; paraphrase/§-section citations verified directly and logged as MANUAL-VERIFIED).
- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check --require-current`
  at the branch tree (rc=1, 1 STALE-WINDOW group — `../logs/claims-job-36415576879-red-gate.txt`).
- CI receipts: artifact download of run 36415576879 (7 artifacts), scenario receipts archived in
  `../logs/ci-run-36415576879/`; identity vs factory snapshot = 24/24 key-equal.
- Digest identity: `cli.py producer-report --engine <dir> --output regen/<dir>` at HEAD
  01696f77 for the 6 engine dirs (pixelDojo at engines/pixelDojo), then per-receipt comparison
  (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact sha256 sets) —
  `../logs/regen-identity.log` (24/24 identical).
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q` (221p/1s) and
  `python3 engines/dojoToday/tools/selfcheck.py` (OK) — `../logs/substrate-selfcheck.log`.
- Main-tip checks: `GET /repos/dandpb/aidevschool/commits/eacd3e14.../check-runs` —
  `../logs/main-tip-eacd3e14-check-runs.json` (44 green / 1 skipped / claims red).
