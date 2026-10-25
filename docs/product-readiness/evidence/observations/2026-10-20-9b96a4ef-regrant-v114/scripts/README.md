# Reproduction scripts — observation bundle v114 (AID-5256, re-grant @ 9b96a4ef)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper steps are
reproducible from this README against the branch
`regrant/auto-20261020-a56dd4a9` @ `9b96a4efaf084a6bad607538171af0cbfa6dbafe`
(factory snapshot `eb79b737` @ base `a56dd4a9` + update-branch merges of main
`32a20e2f` [9 merges: #703/#714/#695/#698/#702/#733/#734/#701/#717] and main
`855dd9fb` [#708 AID-3705 literacyDojo, merged 16:18Z via the single merge
door]; QA-phase v113 `8bf33928`; run 2026-10-20T16:2xZ).

- Context: PR #708 landed while the v113 countersign was pending (cited run
  cc1cc557 closed 15:55:45Z) — strict branch protection turned PR #732
  `behind`; update-branch invalidated the pin by design (§3), new head needs a
  fresh countersign (loop precedent AID-5195/#718 in AID-5181).
- Red gate first-hand at 9b96a4ef: rc=1, exactly 3 STALE-WINDOW groups /
  11 scenarios (literacy-standalone-first-lesson,
  literacy-standalone-corridor-mod01-03, os-literacy-guided-mission) — the 4
  v113 groups stay current via the v113 assessment already on the branch —
  `../logs/red-gate-9b96a4ef.txt`.
- Drift cause: PR #708 (ceac6741, AID-3705) — 4 files under
  engines/literacyDojo/ (boot ?journey=dev|ia + Home link to /escola/);
  os-literacy-guided-mission includes engines/literacyDojo/src/ in its
  sourcePaths — `../logs/branch-delta-v114.txt`.
- Citation carry-over: 38/38 cited strings from the base notes (v113/v111/v46)
  re-located byte-identically or fragment-wise —
  `../logs/citation-carryover-v114.txt`.
- Producer evidence: CI push run 39456154216 @855dd9fb (red claims run of the
  #708 push; engine jobs green; artifacts via the Actions API); regen at
  9b96a4ef: 11/11 scenarios identical in ALL core fields —
  `../logs/regen-identity-ci-855dd9fb.log`.
- Support suites: substrate 268p/1s, dojoToday selfcheck OK, docs 59p pre-pin
  (57p/2s post-pin), factory 183p — `../logs/`.
- Completion: `cli.py aggregate --reports
  producers/2026-10-20-9b96a4ef-regrant-v114 --observations <this bundle>
  --output candidates/2026-10-20-9b96a4ef-regrant-v114.json --assessment-id
  2026-10-20-9b96a4ef-regrant-v114 --verified-at 2026-10-20T16:26:36Z
  --revalidate-by 2026-11-19` → `cli.py regrant --propose --input
  candidates/2026-10-20-9b96a4ef-regrant-v114.json --proposal-state
  producers/2026-10-20-9b96a4ef-regrant-v114/regrant-proposal.json` → exit 0
  (assessment v114 written with decisions pass/customer-ready for the 3
  re-anchored use cases; views rendered; proposal-state status=written).
  Post-write `cli.py check --require-current` → rc=0. Pin `LATEST_ASSESSMENT_ID`
  v113→v114 in `tests/test_elevation_supersession.py`.
