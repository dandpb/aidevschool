# Reproduction scripts — observation bundle v111 (AID-5197, re-anchor W7 @ e22a2daf)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper commands used
(producer-report regen, identity join, drift map, carry-over grep) are
reproducible from this README against the branch
`regrant/auto-20261020-6a1ac151` @ `e22a2daffbc371023e2e6b82a07bdd4d05555836`
(base main `6a1ac151449699670d72ec62f8f8238461a5a2d0` = W7 merge #728).

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check
  --require-current` at the branch tree e22a2daf (rc=1, exactly 6 STALE-WINDOW
  groups / 20 scenarios — `../logs/red-gate-e22a2daf.txt`); the same signal
  drives the required CI check `regrant observation completeness` (fail-closed
  until this re-grant lands).
- Branch delta since the v110 pin-fix commit 4367c54d: `git log --oneline
  4367c54d..e22a2daf` = W7 #728 (1da89996b2 HUD component contract 3 engines +
  cfe9b7e8 spec authorization + e857eef8 update-branch docs-only) + factory
  snapshot — `../logs/branch-delta-4367c54d-e22a2daf.txt`, W7 file list in
  `../logs/branch-delta-files-w7.txt`.
- Drift cause per use case (fingerprint basis = inventory useCase sourcePaths +
  scenario sourcePaths, mirroring tools/fingerprint.py): W7 files under
  sourcePaths of exactly the 6 drifted groups; 3 groups clean —
  `../logs/drift-cause-by-usecase.txt`.
- Citation carry-over: none of the 69 cited strings from the v110 observation
  notes changed in 4367c54d..e22a2daf; every string re-located first-hand
  (grep -F; display-elided strings verified fragment-wise) —
  `../logs/citation-carryover-w7.txt`.
- Producer evidence: CI push run 39368179329 @6a1ac151 (the run that fired the
  factory); 7 readiness artifacts downloaded; per-report identity
  (sourceFingerprint, manualFingerprint, assertion ids/outcomes, artifact
  sha256 sets) vs `cli.py producer-report` regen at HEAD and vs the factory
  snapshot = 24/24 identical both ways — `../logs/regen-identity-ci-6a1ac151.log`
  (`literacydojo-progress-drill.json` is a CI-only receipt, same as
  v107/v108/v109/v110).
- Substrate/read-only boundary: `python3 -m pytest learner/substrate/tests -q`
  (268p/1s) and `python3 engines/dojoToday/tools/selfcheck.py` (OK) —
  `../logs/substrate-pytest.txt`, `../logs/substrate-selfcheck.log`; docs
  tests 59p — `../logs/docs-tests.txt`; factory tests 183p —
  `../logs/factory-tests.log` (`../logs/factory-tests.txt`).
- W7 content verification 1st hand by the same verifier at head e857eef8
  (= content merged into 6a1ac151): receipt AID-5195 (mutation-guard 8/8;
  screenshots 375/768/1280; CI 43 pass / 2 skip / countersign-gate-only red).
- Completion: `cli.py aggregate --reports producers/2026-10-20-e22a2daf-w7-reanchor-v111
  --observations <this bundle> --output candidates/2026-10-20-e22a2daf-w7-reanchor-v111.json
  --assessment-id 2026-10-20-e22a2daf-w7-reanchor-v111 --verified-at <ISO>
  --revalidate-by 2026-11-19` → `cli.py regrant --propose --input
  candidates/2026-10-20-e22a2daf-w7-reanchor-v111.json --proposal-state
  producers/2026-10-20-e22a2daf-w7-reanchor-v111/regrant-proposal.json`
  → exit 0 expected (assessment v111 written, views rendered).
