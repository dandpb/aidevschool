# Reproduction scripts — observation bundle v107 (AID-5158)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`.

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check
  --require-current` at the branch tree faa8bf53 (rc=1, 7 STALE-WINDOW groups —
  `../logs/red-gate-branch.txt`); same output from the CI job
  `product readiness (claims)` of main push run 39296669489 @4157850e —
  `../logs/claims-job-39296669489-red-gate.txt` (only failing job of the run;
  all engine jobs green).
- Drift cause: `git diff --name-only 2b571a55..4157850e` mapped per use case
  (`../logs/drift-cause-by-usecase.txt`; interval = ~50 merges: escola
  AID-3453, competências AID-3514, W2 dev landing AID-5046 (#715), Onda 2
  AID-5012 (#707), pg-d02/d03/d04 jogáveis AID-5006 (#713), FSRS real
  scheduling AID-5005 (#712), verdict fallback AID-5002 (#709), miniTown Bolt
  #676/#685, dojoToday a11y #679). Exactly 20/24 factory scenarios drifted
  (`../logs/fingerprint-drift-v105-v107.txt`); pixelquest-evidence-encounter
  and voxel-standalone-learning-loop unchanged (0 covered files changed).
- Citation carry-over: v105 cite targets re-verified in 2b571a55..faa8bf53 —
  guides byte-identical; boundary strings preserved with moved lines in
  literacyDojo screens (HomeScreen 77/90→81/94, 163→207; ResultScreen 77→79) —
  `../logs/citation-carryover.log` + `../logs/first-hand-checks.log`.
- CI receipts: artifact download of run 39296669489 (7 readiness artifacts),
  scenario receipts archived in `../logs/ci-run-39296669489/`; identity vs
  factory snapshot = 24/24 key-equal (`../logs/ci-receipts-identity.log`).
- Digest identity: `cli.py producer-report --engine <dir> --output regen/<dir>`
  at HEAD faa8bf53 for the 6 engine dirs (pixelDojo at engines/pixelDojo), then
  per-report comparison (sourceFingerprint, manualFingerprint, assertion
  ids/outcomes, artifact sha256 sets) — `../logs/regen-identity.log`
  (24/24 identical).
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q`
  (268p/1s) and `python3 engines/dojoToday/tools/selfcheck.py` (OK) —
  `../logs/substrate-selfcheck.log`; docs tests 57p/2s after the
  LATEST_ASSESSMENT_ID pin bump v105→v107 (`../logs/docs-tests.log`);
  factory tests 183p (`../logs/factory-tests.log`).
- Completion: `cli.py aggregate --reports regen/<6 engine dirs>
  --observations <this bundle> --output candidates/…-v107.json
  --assessment-id 2026-10-19-4157850e-auto-regrant-v107 --verified-at
  2026-10-19T19:35:00Z --revalidate-by 2026-11-18` (27 results) →
  `cli.py regrant --propose --input candidates/…-v107.json --proposal-state
  producers/…-v107/regrant-proposal.json` → **exit 0** (assessment written,
  views rendered); `cli.py check` and `cli.py check --require-current` rc=0.
