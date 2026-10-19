# Reproduction scripts — observation bundle v108 (AID-5165, re-anchor W4 @ 92aaa1b6)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper scripts used
(`fpdrift_5165.py`, `driftmap_5165.py`, `build_obs_5165.py`,
`regen-5165/identity_check.py`) live in untracked `.scratch/` and are
reproducible from this README.

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check
  --require-current` at the branch tree 92aaa1b6 (rc=1, exactly 4 STALE-WINDOW
  groups — `../logs/red-gate-92aaa1b6.txt`); the same signal drives the required
  CI check `regrant observation completeness` red (PR-lane run 39312567515).
- Branch delta since the v107 QA-phase commit: `git diff --name-only
  d939e98e..92aaa1b6` = 8 files from main merges #706 (countersign CI) + #720
  (W4 a11y) — `../logs/branch-delta-d939e98e-92aaa1b6.txt`.
- Drift cause per use case: W4 files under sourcePaths of exactly the 4 drifted
  use cases; #706 files fingerprint-neutral — `../logs/drift-cause-by-usecase.txt`.
  Fingerprint drift v107→current = 12/27 scenarios, all inside the 4 groups —
  `../logs/fingerprint-drift-v107-atual.txt`.
- Citation carry-over: none of the files cited by the v107 observation notes
  changed in d939e98e..92aaa1b6; W4 CSS deltas are additive AA contrast rules
  with no claim strings; every cited string re-located first-hand (grep -n) —
  `../logs/citation-carryover-w4.txt`.
- Producer evidence: CI PR-lane run 39312567302 @92aaa1b6 (merge-ref 439a3e0e),
  6 readiness artifacts downloaded; per-report identity (sourceFingerprint,
  manualFingerprint, assertion ids/outcomes, artifact sha256 sets) vs
  `cli.py producer-report` regen at HEAD = 24/24 identical —
  `../logs/regen-identity-ci-92aaa1b6.log` (`literacydojo-progress-drill.json`
  is a CI-only receipt, same as the v107 cycle).
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q`
  (268p/1s) and `python3 engines/dojoToday/tools/selfcheck.py` (OK) —
  `../logs/substrate-tests.log`, `../logs/substrate-selfcheck.log`; factory
  tests 183p — `../logs/factory-tests.log`; docs tests 57p/2s after the
  LATEST_ASSESSMENT_ID pin bump v107→v108 — `../logs/docs-tests.log`.
- Completion: `cli.py aggregate --reports regen/<6 engine dirs> --observations
  <this bundle> --output candidates/2026-10-19-92aaa1b6-w4-reanchor-v108.json
  --assessment-id 2026-10-19-92aaa1b6-w4-reanchor-v108 --verified-at
  2026-10-19T20:10:00Z --revalidate-by 2026-11-18` (27 results) →
  `cli.py regrant --propose --input candidates/…-v108.json --proposal-state
  producers/…-v108/regrant-proposal.json` → **exit 0** (assessment v108 written,
  views rendered); `cli.py check` and `cli.py check --require-current` rc=0 —
  `../logs/first-hand-checks-v108.log`.
