# Reproduction scripts — observation bundle v115 (AID-6004, re-grant @ a489fca5)

No bespoke runtime scripts were needed for this re-anchor: every check is a
mechanical git/python/API step recorded in `../logs/`. Helper steps are
reproducible from this README against the branch
`regrant/auto-20261026-12dd8bdf` @ `a489fca5d8b4414a2b1afe2cd5aa175d5e6e222b`
(factory snapshot `12dd8bdf` @ base main parada `12dd8bdf`; QA-phase v115
executor Storage Engineer 92d055bc — PATH A, AID-5732 ratification 01/nov
09:51Z; run 2026-11-01T10:1x–10:3xZ).

- Context: PR #744 (bot, head a489fca5, aberto 26/out) propõe o snapshot da
  fábrica AID-1357 @12dd8bdf; `regrant --propose` do bot sai 3
  (pending-observation) — observação independente emparceirada é o passo 2 da
  cadeia PATH A (AID-6004). Red gate first-hand @a489fca5: rc=1, exatamente 3
  STALE-WINDOW / 11 cenários (literacy-standalone-first-lesson,
  literacy-standalone-corridor-mod01-03, os-literacy-guided-mission) —
  `../logs/red-gate-a489fca5.txt`.
- Drift cause: ondas de conteúdo PR #743 (l27 contentBump v3→v4) +
  retrofitNotice.ts (O3-C1) + missions.ts regenerado — sem lógica de gate —
  `../logs/branch-delta-v115.txt`.
- Citation carry-over: 11/11 strings citadas da v114 re-localizadas
  byte-idênticas (engine UI em engines/*/src; guia por grep direto de linha) —
  `../logs/citation-carryover-v115.txt`.
- Producer evidence: CI re-open run 41295103515 @a489fca5 (2026-11-01T09:54Z,
  pull_request, 42✓/1s/1✗ by-design claims) — artifacts
  literacydojo-readiness + codexdojo-os-readiness via Actions API; identidade
  tripla 11/11 (regen HEAD = CI = snapshot) — `../logs/regen-identity.log`,
  `../logs/ci-receipts-identity.log`.
- Support suites: substrate 1016p/2s + dojoToday selfcheck OK; docs 59p
  pre-pin; factory 183p — `../logs/`.
- Completion: reports filtrados ao conjunto do re-anchor (11) em
  `evidence/producers/2026-11-01-a489fca5-regrant-v115/` → `cli.py aggregate
  --reports <dir> --observations <this bundle> --output
  candidates/2026-11-01-a489fca5-regrant-v115.json --assessment-id
  2026-11-01-a489fca5-regrant-v115 --verified-at 2026-11-01T10:28:00Z
  --revalidate-by 2026-12-01` → `cli.py regrant --propose --input
  candidates/2026-11-01-a489fca5-regrant-v115.json --proposal-state
  producers/2026-11-01-a489fca5-regrant-v115/regrant-proposal.json` → exit 0.
  Post-write `cli.py check --require-current` → rc=0.
- Pin note (desvio consciente da receita v114): LATEST_ASSESSMENT_ID em
  tests/test_elevation_supersession.py permanece v113 — o pin rastreia
  APENAS o use case elevado dojotoday-daily-guidance, intocado por v114/v115
  (first-hand: pin=v113 tanto na main quanto na branch v114 mergeada).
