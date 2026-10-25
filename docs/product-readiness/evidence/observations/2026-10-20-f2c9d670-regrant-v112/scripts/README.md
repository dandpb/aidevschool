# Reproduction scripts — observation bundle v112 (AID-5223, re-grant @ f2c9d670)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper steps are
reproducible from this README against the branch
`regrant/auto-20261020-bf9c2bfa` @ `f2c9d67009558faef95e799529c7c8c848680f66`
(factory snapshot `15cba88f` @ base `bf9c2bfa` + update-branch merge of main
`41f4419c` = PRs #716/#723/#722, run 2026-10-20T10:59Z).

- Red gate first-hand: `python3 docs/product-readiness/tools/cli.py check
  --require-current` at the branch tree f2c9d670 (rc=1, exactly 2 STALE-WINDOW
  groups / 6 scenarios — `../logs/red-gate-f2c9d670.txt`; same enumeration at
  main d4cffeaf — `../logs/red-gate-main-d4cffeaf.txt`; the factory snapshot
  tree carried only the dojotoday group — `../logs/red-gate-snapshot-15cba88f.txt`).
- Branch delta since the v111 anchor e22a2daf: `git log --oneline
  e22a2daf..f2c9d670` and `git diff --name-status e22a2daf f2c9d670 --
  engines/ learner/` = 7 files (4 generated/fingerprint-neutral) —
  `../logs/branch-delta-e22a2daf-f2c9d670.txt`.
- Drift cause per use case (fingerprint basis = inventory useCase sourcePaths +
  scenario sourcePaths, mirroring tools/fingerprint.py; generated-marker files
  excluded per tools/paths.py): dojotoday-daily-guidance ← PR #716
  (`learner/substrate/tests/test_substrate.py`) + PR #722
  (`engines/dojoToday/src/main.ts`, 3 label `for=` attributes);
  os-voxel-guided-missions ← PR #723
  (`engines/voxelDojo/game-06-pipeline-plant/src/scene/hud.ts`); 7 groups clean
  — `../logs/drift-cause-by-usecase.txt`.
- Citation carry-over: 18/18 cited strings/fragments from the v111 observation
  notes of the 6 re-anchored scenarios re-located first-hand (grep -F exact for
  byte-stable citations; fragment-wise for display-elided citations whose
  `<strong>`/`<em>` markup predates v111) — `../logs/citation-carryover-v112.txt`.
- Producer evidence: CI push runs 39409136179 @d4cffeaf and 39407454547
  @bf9c2bfa (readiness artifacts downloaded via the Actions API);
  `cli.py producer-report` regen at f2c9d670: os-* scenarios (3/3) identical to
  CI @d4cffeaf in every core field (sourceFingerprint, manualFingerprint,
  assertion ids/outcomes, artifact sha256 set); dojotoday (2/2) differs only in
  sourceFingerprint/artifacts because PR #722 merged after d4cffeaf —
  assertions/manualFingerprint identical; factory snapshot @bf9c2bfa confirms
  the window causes (os-voxel srcFP `9fb7f838…` = v111 anchor; dojotoday
  already drifted) — `../logs/regen-identity-ci-d4cffeaf.log`.
  `dojotoday-read-only-boundary` is an observed-execution scenario
  (automation `npm run selfcheck`): executable evidence via
  `../logs/substrate-selfcheck.log` (OK).
- Support suites: `python3 -m pytest learner/substrate/tests -q` (268p/1s),
  `python3 engines/dojoToday/tools/selfcheck.py` (OK), docs tests 59p pre-pin /
  57p+2s post-pin, factory 183p — `../logs/`.
- Content of the #723 fix (Sentinel HIGH XSS hud.ts) verified first-hand by the
  same verifier at heads db533caa→5cc34d49 (AID-5211: escapeHtml 6/6
  interpolations; voxelDojo typecheck 19/19 rc=0; game-06 21/21; shared 24/24;
  patch byte-identical across 3 update-branches).
- Completion: `cli.py aggregate --reports
  producers/2026-10-20-f2c9d670-regrant-v112 --observations <this bundle>
  --output candidates/2026-10-20-f2c9d670-regrant-v112.json --assessment-id
  2026-10-20-f2c9d670-regrant-v112 --verified-at 2026-10-20T11:05:49Z
  --revalidate-by 2026-11-19` → `cli.py regrant --propose --input
  candidates/2026-10-20-f2c9d670-regrant-v112.json --proposal-state
  producers/2026-10-20-f2c9d670-regrant-v112/regrant-proposal.json` → exit 0
  (assessment v112 written with decisions pass/customer-ready for
  dojotoday-daily-guidance and os-voxel-guided-missions; views rendered;
  proposal-state status=written). Post-write `cli.py check --require-current`
  → rc=0. Pin `LATEST_ASSESSMENT_ID` v111→v112 in
  `tests/test_elevation_supersession.py` (same mechanism as v109/v110/v111).
