# Reproduction scripts — observation bundle v110 (AID-5187, re-anchor W6 @ 591dfa4c)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper commands used
(producer-report regen, identity join, drift map, carry-over grep) are
reproducible from this README against the branch
`regrant/auto-20261020-cc76ee11` @ `591dfa4c99f9878e155fd69e62e41ba40a6cc500`
(base main `cc76ee1178d7fab6604d041b3eccf0320606959b` = W6 merge).

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check
  --require-current` at the branch tree 591dfa4c (rc=1, exactly 6 STALE-WINDOW
  groups / 20 scenarios — `../logs/red-gate-591dfa4c.txt`); the same signal
  drives the required CI check `regrant observation completeness` (fail-closed
  until this re-grant lands).
- Branch delta since the v109 QA-phase commit 7f3e4520: `git log --oneline
  7f3e4520..591dfa4c` = #718 (docs/design only, fingerprint-neutral for engine
  sourcePaths) + W6 #726 (16 files, 3 engines) + factory snapshot —
  `../logs/branch-delta-7f3e4520-591dfa4c.txt`, W6 file list in
  `../logs/branch-delta-files-w6.txt`.
- Drift cause per use case: W6 files under sourcePaths (use case + scenario
  paths, directory-prefix aware) of exactly the 6 drifted groups; 3 groups
  clean — `../logs/drift-cause-by-usecase.txt`.
- Citation carry-over: none of the 54 cited strings from the v109 observation
  notes changed in 7f3e4520..591dfa4c; every string re-located first-hand
  (grep -F; display-elided strings verified fragment-wise) —
  `../logs/citation-carryover-w6.txt`.
- Producer evidence: CI push run 39353964089 @cc76ee11 (the run that fired the
  factory); 7 readiness artifacts downloaded; per-report identity
  (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact
  sha256 sets) vs `cli.py producer-report` regen at HEAD and vs the factory
  snapshot = 24/24 identical both ways — `../logs/regen-identity-ci-cc76ee11.log`
  (`literacydojo-progress-drill.json` is a CI-only receipt, same as
  v107/v108/v109).
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q`
  (268p/1s) and `python3 engines/dojoToday/tools/selfcheck.py` (OK) —
  `../logs/substrate-pytest.txt`, `../logs/substrate-selfcheck.log`; docs
  tests 59p — `../logs/docs-tests.log`; factory tests 183p —
  `../logs/factory-tests.log`.
- W6 content verification 1st hand by the same verifier at head 01da8288
  (= content merged into cc76ee11): receipt AID-5187 comment `82891b7e`
  (specs W6 3/3+3/3+6/6; regression 13/13+12/12+4/4; lint/test/build ✓×3;
  mutation-guard fails on the pre-W6 base).
- Completion: `cli.py aggregate --reports <6 regen engine dirs> --observations
  <this bundle> --output candidates/2026-10-20-591dfa4c-w6-reanchor-v110.json
  --assessment-id 2026-10-20-591dfa4c-w6-reanchor-v110 --verified-at
  2026-10-20T01:47:20Z --revalidate-by 2026-11-19` → `cli.py regrant --propose
  --input candidates/2026-10-20-591dfa4c-w6-reanchor-v110.json --proposal-state
  producers/2026-10-20-591dfa4c-w6-reanchor-v110/regrant-proposal.json`
  → exit 0 expected (assessment v110 written, views rendered).
