# OS analytics — offline aggregation & schema-drift monitor (AID-473 F2 · F2b AID-675)

Offline consumers of the same-origin collector's NDJSON (AID-470 F1:
`learner/gate/netlify-functions/dojo-analytics-collector.mjs` → day-rotated
`events-YYYY-MM-DD.ndjson`, 90-day retention per ADR-0010). Nothing here is
deployed, emits, or turns the transport on; production analytics stays OFF
until the board authorizes activation.

## Boundary

- **Analytics ≠ evidence.** These tools never touch learner state, gates, or
  mastery. The funnel measures return to the experience, not learning.
- **Aggregated and k-anonymized only.** Reports publish counts/rates over
  weekly cohorts; buckets with `n < k` (k=5 from day 1) are suppressed;
  `installationId`/`sessionId`/`eventId` never appear in output.
- **No pilot data in the repo.** The committed fixtures under
  `../tests/fixtures/analytics/` are fully synthetic.

## Tools

```bash
# Schema-drift monitor: fails high (exit 1) on any envelope that diverges from
# the closed vocabularies canonical in
# engines/codexdojo-os-prototype/src/analytics/events.ts (locked to this side by
# src/analytics/collectorParity.test.ts; fixtures are checked against events.ts
# directly by src/analytics/fixtureSchemaDrift.test.ts).
node learner/gate/analytics/schema_drift_monitor.mjs --input <collector-dir|file.ndjson>[,...] \
  [--output summary.json] [--max-samples 50]
# exit codes: 0 clean · 1 drift · 2 usage/IO error

# Funnel aggregation (AID-463 draft §2, rev 40b963bf; F2b spec AID-673 §2):
#   narrow cohort  = first mission.completed{result:"completed"} on UTC day D0
#   wide cohort    = first onboarding.completed (context denominator)
#   R+N accumulated = any event at day offset 1..N+grace (primary)
#   R+N strict      = event at offset N..N+grace (secondary)
#   review return   = returning session has mission.started{mode:review} or
#                     review.started{reason:due|overdue}
node learner/gate/analytics/aggregate_funnel.mjs --input <collector-dir|file.ndjson>[,...] \
  [--output report.json] [--markdown report.md] [--k 5] [--windows 1,7,21] \
  [--grace-days 2] [--now ISO8601]
```

## Report contract (reportVersion 2, F2b)

- **Dedup (ADR-0010 beacon+fetch race):** accepted events are deduplicated by
  `eventId` (first occurrence in the `occurredAt`,`sequence` sort) before any
  cut; `source.duplicateEvents` counts removed lines and `source.totalEvents`
  counts the events actually aggregated (post-dedup).
- **D1 sections** (all k≥5 per cell; identifiers never published):
  `trackEntrySplit` (weekly split of the first `mission.started{mode:"initial"}`
  by `trackId`; absent context ⇒ `unknown`), `missionCompletion` (per
  `missionId`, installations started vs completed; missing `missionId` ⇒
  `unattributed` bucket), `activityFriction` (`structured_attempt.passed`/
  `.submitted` per `activityType` × `missionId` + `hint.requested`/
  `retry.requested` per missionId — those carry no activityType),
  `verificationHealth` (`verification.state_changed` by `state`, no missionId
  in the cut), `rendererDegraded` (by `fallback`, with aggregated `reason`s and
  `engineId` context).
- **D2 section:** `moduleCompletionMedian` maps `missionId`→`moduleId` by
  reading `curriculum/ai-literacy/catalog.yaml` **at execution time** (no
  copied mapping); per-module completion (same definition as
  `missionCompletion`, unioned over the module's missions) and the median
  across published `ia_pratica` modules. Catalog absent/unreadable/empty ⇒ the
  section is `unavailable` with a reason — fail-closed, never fabricated.
  Missions without a catalog mapping (e.g. dev-track ids) are counted in
  `missionsWithoutModuleMapping`, never guessed into a module.
- Suppressed cells keep only `n` (the standing convention); zero-count cells
  are omitted.

## Tests (CI, OS job)

```bash
node --test learner/gate/tests/dojo_analytics_funnel_aggregation.test.mjs \
               learner/gate/tests/dojo_analytics_schema_drift_monitor.test.mjs
node learner/gate/analytics/schema_drift_monitor.mjs --input learner/gate/tests/fixtures/analytics/synthetic
cd engines/codexdojo-os-prototype && npm run test   # includes fixtureSchemaDrift.test.ts
```

The committed `example-funnel-report.json`/`.md` regenerate byte-identically
from the synthetic fixture (`--now 2026-09-18T00:00:00.000Z`), so a stale
committed artifact fails CI instead of misleading a reader. The example embeds
the current catalog mapping — a curriculum module restructure changes the D2
section and requires regenerating the examples. Real monthly reports are dated
work products (`_work-products/` pattern) and never commit raw NDJSON.
