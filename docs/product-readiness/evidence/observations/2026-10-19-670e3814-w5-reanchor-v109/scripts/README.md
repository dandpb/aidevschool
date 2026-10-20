# Reproduction scripts — observation bundle v109 (AID-5181, re-anchor W5 @ 670e3814)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper commands used
(producer-report regen, identity join, drift map, carry-over grep) are
reproducible from this README against the branch
`regrant/auto-20261019-a116c1ba` @ `670e38142301a18b46dc683f31c0bdd872b3421a`.

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check
  --require-current` at the branch tree 670e3814 (rc=1, exactly 6 STALE-WINDOW
  groups — `../logs/red-gate-670e3814.txt`); the same signal drives the required
  CI check `regrant observation completeness` (fail-closed until this re-grant
  lands).
- Branch delta since the v108 QA-phase commit: `git diff --name-only
  dccc81f6..a116c1ba` = W5 #724 files (fd82394d: DESIGN.md + CSS + hud-aliases
  specs + playwright.aid5141 configs + .gitignore + scripts/hud_alias_audit.py)
  plus the v108 merge — `../logs/branch-delta-dccc81f6-a116c1ba.txt`.
- Drift cause per use case: W5 files under sourcePaths of exactly the 6 drifted
  use cases — `../logs/drift-cause-by-usecase.txt`. Fingerprint drift
  v108→current = 19/24 automated scenarios + dojotoday-read-only-boundary, all
  inside the 6 groups — `../logs/fingerprint-drift-v108-atual.txt`.
- Citation carry-over: none of the files cited by the v108 observation notes
  changed in dccc81f6..a116c1ba except W5 CSS (journey.css, styles.css) whose
  deltas are additive --ads-* alias rules without claim strings; every cited
  string (55/55) re-located first-hand (grep -F) — `../logs/citation-carryover-w5.txt`.
- Producer evidence: CI push run 39333389365 @a116c1ba (the run that fired
  the factory); 7 readiness artifacts downloaded; per-report identity
  (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact sha256
  sets) vs `cli.py producer-report` regen at HEAD and vs the factory snapshot =
  24/24 identical both ways — `../logs/regen-identity-ci-a116c1ba.log`
  (`literacydojo-progress-drill.json` is a CI-only receipt, same as v107/v108).
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q`
  (268p/1s) and `python3 engines/dojoToday/tools/selfcheck.py` (OK) —
  `../logs/substrate-pytest.txt`, `../logs/substrate-selfcheck.log`; docs tests
  59p — `../logs/docs-tests.log`; factory tests 183p — `../logs/factory-tests.log`.
- Completion: `cli.py aggregate --reports regen/<6 engine dirs> --observations
  <this bundle> --output candidates/2026-10-19-670e3814-w5-reanchor-v109.json --assessment-id 2026-10-19-670e3814-w5-reanchor-v109
  --verified-at 2026-10-19T22:56:43Z --revalidate-by 2026-11-18` → `cli.py regrant --propose
  --input candidates/2026-10-19-670e3814-w5-reanchor-v109.json --proposal-state producers/2026-10-19-670e3814-w5-reanchor-v109/regrant-proposal.json`
  → exit 0 expected (assessment v109 written, views rendered).
