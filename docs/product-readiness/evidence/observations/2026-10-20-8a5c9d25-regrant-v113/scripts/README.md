# Reproduction scripts — observation bundle v113 (AID-5256, re-grant @ 8a5c9d25)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper steps are
reproducible from this README against the branch
`regrant/auto-20261020-a56dd4a9` @ `8a5c9d25462b41e76d6088f624923dbe76cef09d`
(factory snapshot `eb79b737` @ base `a56dd4a9` + update-branch merge of main
`32a20e2f` = #703/#714/#695/#698/#702/#733/#734/#701/#717, run 2026-10-20T15:4xZ).

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check
  --require-current` at the branch tree 8a5c9d25 (rc=1, exactly 4 STALE-WINDOW
  groups / 12 scenarios — `../logs/red-gate-8a5c9d25.txt`; identical
  enumeration at main 32a20e2f — `../logs/red-gate-main-32a20e2f.txt`).
- Branch delta since the v112 anchor f2c9d670: `git diff --name-status
  f2c9d670 32a20e2f -- engines/ learner/` = 21 files —
  `../logs/branch-delta-f2c9d670-32a20e2f.txt`.
- Drift cause per use case (fingerprint basis = inventory useCase sourcePaths ×
  delta, generated-marker files excluded per tools/paths.py):
  dojotoday-daily-guidance ← PR #717 (`engines/dojoToday/src/main.ts` ask()
  empty-question feedback +5/−1); os-literacy-guided-mission +
  os-returning-learner ← PR #695 (AID-3772 practice takeaway→feedback return);
  os-voxel-guided-missions ← PR #695 + PR #714 (game-03-wormhole tests);
  learner/analytics_bridge (#703) is outside learner/substrate → neutral;
  5 recorded groups clean — `../logs/drift-cause-by-usecase.txt`.
- Citation carry-over: 93/93 cited strings/fragments from the v112/v111
  observation notes of the 12 re-anchored scenarios re-located first-hand
  (grep -F exact for byte-stable citations; fragment-wise for markup-elided
  citations) — `../logs/citation-carryover-v113.txt`.
- Producer evidence: CI push run 39447990377 @32a20e2f (the red claims run; all
  6 engine jobs green — artifacts downloaded via the Actions API);
  `cli.py producer-report` regen at 8a5c9d25: 11/11 automated re-anchored
  scenarios identical to CI in every core field (sourceFingerprint,
  manualFingerprint, assertion ids/outcomes, artifact sha256 set) —
  `../logs/regen-identity-ci-32a20e2f.log`. The factory snapshot adds only
  docs/ files → fingerprint-neutral for engines/.
- `dojotoday-read-only-boundary` is an observed-execution scenario
  (automation `selfcheck`): executable evidence via
  `../logs/substrate-selfcheck.txt` (OK).
- Support suites: `python3 -m pytest learner/substrate/tests -q` (268p/1s),
  `python3 engines/dojoToday/tools/selfcheck.py` (OK), docs tests 59p pre-pin /
  57p+2s post-pin, factory 183p — `../logs/`.
- Completion: `cli.py aggregate --reports
  producers/2026-10-20-8a5c9d25-regrant-v113 --observations <this bundle>
  --output candidates/2026-10-20-8a5c9d25-regrant-v113.json --assessment-id
  2026-10-20-8a5c9d25-regrant-v113 --verified-at 2026-10-20T15:45:31Z
  --revalidate-by 2026-11-19` → `cli.py regrant --propose --input
  candidates/2026-10-20-8a5c9d25-regrant-v113.json --proposal-state
  producers/2026-10-20-8a5c9d25-regrant-v113/regrant-proposal.json` → exit 0
  (assessment v113 written with decisions pass/customer-ready for the 4
  re-anchored use cases; views rendered; proposal-state status=written).
  Post-write `cli.py check --require-current` → rc=0. Pin `LATEST_ASSESSMENT_ID`
  v112→v113 in `tests/test_elevation_supersession.py` (same mechanism as
  v109/v110/v111/v112).
