# Analytics emitter consolidation — one funnel core, single-sourced vocabularies

> Build this with **tlc-implement** (`.claude/skills/tlc-implement`).
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

Shipping one funnel event today is a five-site edit: engine vocabulary + validator, hand-copied validator in `learner/gate/netlify-functions/dojo-analytics-collector.mjs`, vocabulary copy in `learner/gate/analytics/schema_drift_monitor.mjs` (lines 58–75), parity tests, and per-engine emitter plumbing. Whoever ships an analytics wave pays it — 50 commits across the four mirror sites between 2026-06-15 and 2026-09-13 (16 literacy, 9 OS, 14 shared, 11 collector/tooling), 5+ author identities, and the F2 wave of 2026-09-10 (`dojo_analytics_collector_v4.test.mjs` header) paid the full tax three days ago. Three envelope versions (OS v1, literacy v2, surfaces v3) and three separately hardened batcher/transport stacks (667 + 712 + 425 production LOC) coexist, held together by parity tests rather than shared code.

The change: one configurable funnel core (`createFunnelClient`) in `@aidevschool/evidence`, vocabularies single-sourced as JSON in `engines/shared/teaching-evidence/vocabularies/`, all three emitters migrated with wire envelopes frozen at v1/v2/v3. Nothing changes for a user of any deployed surface; what changes is that the next analytics wave touches ~2 sites per event instead of 5. Binding design: `.design/analytics-emitter-consolidation.md`.

13 criteria in 5 slices · 4 one-way doors · 2 open, 0 block

## Criteria

### Vocabularies single-sourced

1. When an event entry is added to `engines/shared/teaching-evidence/vocabularies/surfaces.json` and a probe event built from that entry is validated, then `validateSurfaceEvent` accepts it with zero edits to `dojo-analytics-collector.mjs` — and a probe carrying a prop absent from the JSON is rejected. The same probe test runs for `literacy.json` → `validateLiteracyEvent` and `os.json` → `validateAnalyticsEvent`.
2. Always, exactly one hand-written definition of each producer vocabulary exists — the JSON file. A repo-wide search for vocabulary object literals (`LITERACY_EVENT_PROPS`, `LITERACY_OPTIONAL_PROPS`, `SURFACE_EVENT_PROPS`, `FUNNEL_EVENT_PROPS`, `EVENT_VOCABULARIES`) returns 0 matches outside the JSON-derived loader modules, once slices 2–4 have landed.
3. `learner/gate/analytics/schema_drift_monitor.mjs` carries no inline `LITERACY_EVENT_PROPS`/`LITERACY_OPTIONAL_PROPS` literals, and its monitor self-check (report v4 suite) still passes driven by the JSON-derived tables.

### Funnel core and the surfaces producer

4. `engines/shared/teaching-evidence/funnelTelemetry.ts` keeps its public API (`emitFunnelEvent`, `FunnelEvent`/`FunnelBatch` types, absolute-path-only activation via `VITE_ANALYTICS_ENDPOINT`, silent no-op without the env) over the new `funnelCore.ts` — `engines/shared/teaching-evidence/tests/funnelTelemetry.test.ts` and `engines/voxelDojo/shared/funnelTelemetry.test.ts` pass unmodified.
5. A surfaces batch serialized through the core has exactly the envelope `{schemaVersion:3, source, events:[{schemaVersion:3, source, event, eventId, sessionId, occurredAt, props}]}`, with batch flush still at `FUNNEL_BATCH_MAX_EVENTS = 100` — asserted by a core envelope-shape test.
6. `engines/dojoToday` build and test suites pass with the unchanged `file:../shared/teaching-evidence` dependency and unchanged `emitFunnelEvent` import in `src/main.ts`.

### literacyDojo producer

7. literacyDojo's analytics suites pass unmodified — `tests/domain/analytics.test.ts`, `tests/domain/analyticsV2.test.ts`, `tests/domain/analyticsExposure.test.ts`, `tests/adapters/analyticsBatchSink.test.ts`, `tests/app/services.analytics.test.ts` (including the `/__dojo/bridge/v1/analytics` endpoint invariant) — with the vocabulary loaded from `vocabularies/literacy.json`.
8. The literacy wire envelope stays v2: builder output still carries `schemaVersion: 2` and `contentVersion`, and the literacy rows of `learner/gate/tests/dojo_analytics_collector_v2.test.mjs` and `..._v4.test.mjs` pass with collector acceptance unchanged.

### OS producer

9. The OS analytics suites pass unmodified — `src/analytics/events.test.ts`, `collector.test.ts`, `batcher.test.ts`, `transports.test.ts` — with the vocabulary loaded from `vocabularies/os.json`; persisted `installationId`, `sequence` ≥ 1 strictly increasing, retry ×2 @ 1 s, ack reconciliation, and the 500-event localStorage queue cap are all preserved by those suites.
10. `engines/codexdojo-os-prototype/src/analytics/collectorParity.test.ts` and `eventsExposure.test.ts` pass, with collector vocabulary equivalence now observed through the JSON on both sides.
11. `bridge/analytics.ts` `decodeAnalyticsBatch` keeps its contract — ≤ 50 events, unique `eventId`s, strictly increasing `sequence` — and the OS wire envelope stays v1; its tests pass unmodified.

### Guard retirement and contracts

12. Parity tests retire per producer as its migration ships; after all migrations, exactly one smoke test per producer remains under `engines/shared/teaching-evidence/tests/`, `node --test learner/gate/tests/` is green, and no retired test file remains in the repo.
13. `engines/codexDojo/ecosystem/MANIFEST.md` rows 147–149 map the new seam — `funnelCore.ts`, `vocabularies/`, and the smoke-test home — so a search for `funnelCore` in MANIFEST.md returns the updated rows.

## Out of scope

- Collector storage, retention, and export API — deployed function internals beyond validator derivation (design Boundary).
- Drift-tooling redesign beyond the vocabulary binding.
- Envelope v4 unification — deferred by design Decision 1 until a fourth producer or a canonical OS loop.
- `engines/zai-duolingo-like` — quarantined prototype.
- The four declined ride-alongs (shared utils export, PALETTE fix, type pinning, hygiene swaps) — declined 2026-09-13.
- Netlify deploy configs (`netlify.toml` files stay byte-identical).

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| library `@aidevschool/evidence/funnel-core` | response shape (config contract) | 4 |
| library `@aidevschool/evidence/funnel-core` | error shape (invalid-event handling per strategy) | existing - literacy builders throw, funnel emits are silent no-ops; per-stack semantics pinned by the suites in 4/7/9 |
| library `@aidevschool/evidence/funnel-core` | who may call | existing - private package; workspace/`file:` consumers only |
| library `@aidevschool/evidence/funnel-core` | versioning | n/a - private package 0.1.0, never published |
| library `@aidevschool/evidence/funnel-core` | rate limit | n/a - client-side batching only; no throttling exists or is decided |
| API `POST /__dojo/bridge/v1/analytics` | response and error shape, codes | existing - unchanged `202 {acceptedEventIds}`, caps 64 KiB / 100 events; 8 and 10 prove unchanged behavior |
| API `POST /__dojo/bridge/v1/analytics` | versioning | existing - envelopes frozen v1/v2/v3 (design Decision 1) |
| API `POST /__dojo/bridge/v1/analytics` | who may call | existing - `sec-fetch-site: same-origin` gate, Bearer export untouched |
| API `POST /__dojo/bridge/v1/analytics` | rate limit | n/a - collector internals are Boundary-out |
| collection `vocabularies/*.json` | grouping criterion | 2 - one file per producer |
| collection `vocabularies/*.json` | naming and ordering | Unresolved 2 |
| collection `vocabularies/*.json` | duplicates | 2 - duplicate event key within one producer file fails the loader |
| collection `vocabularies/*.json` | exception that does not fit | Unresolved 2 - OS context vocabularies and per-key enums ride the same JSON, shape default pending |
| command or scheduled task | none added | n/a - no new CLI; substrate untouched |
| document `MANIFEST.md` rows 147–149 | structure and reader's next action | 13 |

## Swept

- validation: 1, 7, 9 — closed-vocabulary rejection preserved per stack, driven by the single JSON source
- failure modes: 4, 9 — per-strategy transport-failure semantics (literacy swallow-all, OS retry, surfaces drop) pinned by the existing suites that pass unmodified
- idempotency and retry: existing - collector `<day>/<source>/<eventId>` idempotency and OS ack reconciliation untouched; proven by 10 and the v3/v4 parity rows until retirement, then by the smoke tests in 12
- authorization: existing - same-origin gate and Bearer export unchanged, Boundary-out
- concurrency and ordering: existing - OS strictly-increasing `sequence` (11) and single-flight collector handling unchanged
- data lifecycle: n/a - 90-day retention and queue caps unchanged; collector storage is Boundary-out
- external-dependency failure: existing - endpoint-unavailable behavior per strategy preserved (4, 9)
- state transitions: existing - batcher buffer→flush→ack lifecycle (9) and no-op→active activation states (4) unchanged
- observability: 12 - one smoke test per producer in CI is the drift tripwire; the worked-if itself (2 sites per event at the next wave) is a human review, not a merge test

## Impact

| Front | What changes |
|---|---|
| domain | new term: `FunnelClientConfig` - {vocabulary, envelope extras, identity strategy, batch policy, durability strategy} passed to `createFunnelClient`; lives in `engines/shared/teaching-evidence/funnelCore.ts` |
| domain | new term: `vocabularies/<producer>.json` - the single cross-runtime vocabulary authority for one producer (TS package and `.mjs` tooling) |
| domain | existing term: `EVENT_PROPS`/`OPTIONAL_PROPS` (`engines/literacyDojo/src/domain/analytics.ts`) meant a hand-maintained closed vocabulary, now derived from `vocabularies/literacy.json` - branchers: literacy builders, five literacy test files, the collector mirror, the monitor mirror |
| domain | existing term: `FUNNEL_EVENT_PROPS`/`SURFACE_EVENT_PROPS` meant a hand-maintained surfaces vocabulary, now derived - branchers: `funnelTelemetry.ts` consumers (dojoToday `src/main.ts`, voxelDojo `shared/evidence.ts` re-export chain, pixelDojo emitter), the collector v3 validator, the v3/v4 parity tests |
| domain | existing term: `EVENT_VOCABULARIES` (OS `events.ts`, collector, `dojo-analytics-collector.d.mts`) meant a hand-maintained OS vocabulary, now derived from `vocabularies/os.json` - branchers: `collectorParity.test.ts`, `eventsExposure.test.ts`, `schema_drift_monitor.mjs`, the `.d.mts` declaration |
| stored data | nothing to migrate - wire envelopes and collector storage are unchanged |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Wire contracts frozen | Envelopes stay v1 (OS), v2 (literacy), v3 (surfaces); no v4 minted | Unify on v4 - requires a back-compat window on live pilots; wins only when a fourth producer or canonical OS loop exists |
| Vocabulary authority | `engines/shared/teaching-evidence/vocabularies/{literacy,surfaces,os}.json`, consumed by TS and plain-`.mjs` alike | TS source + codegen - not consumable by the collector/monitor `.mjs` without a build step |
| Core seam | `funnelCore.ts` exported as `./funnel-core` in `@aidevschool/evidence`; `emitFunnelEvent` API preserved | New `engines/shared/analytics` package - a second seam beside an existing one, removed by precedence |
| Collector export surface | Exported validator names (`validateAnalyticsEvent`, `validateLiteracyEvent`, `validateSurfaceEvent`, `EVENT_VOCABULARIES`, …) stay stable | Renaming during the table-driven refactor - forced: `aggregate_funnel.mjs`, `schema_drift_monitor.mjs`, `probe_collector_export.mjs`, and the OS parity tests import them today |

## Sources

- `.design/analytics-emitter-consolidation.md` - **binding**: Decisions (7 rows), Shape Adds/Changes/Leaves, Roadmap sequencing (start after the in-flight AID-987/T1b wave lands), Needs-a-spike constraints
- `learner/gate/tests/dojo_analytics_collector_v4.test.mjs:15-19` - the F2 wave header; the five-site tax paid 2026-09-10
- `learner/gate/analytics/dojo-analytics-collector.d.mts:2-7` - deploy CLI 422s on non-function files in the functions dir (AID-961)
- `engines/codexdojo-os-prototype/scripts/deploy-pilot-bundle.mjs:10-14` and `scripts/pilot-bundle-lib.test.mjs:48-51` - OS deploys a staged, drift-checked copy of the collector
- `engines/shared/teaching-evidence/funnelTelemetry.ts:1-62` - current public API and the `FUNNEL_BATCH_MAX_EVENTS` mirror to preserve
- `engines/codexDojo/ecosystem/MANIFEST.md:147-149` - the three seam rows to update
- AnalyticsTrio scout report (`agent://AnalyticsTrio`) - stack LOC, overlap matrix, parity-test inventory

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | Does the Netlify functions bundler resolve a JSON import from outside the functions dir in both deploy paths (direct `functions=` and the OS staged copy)? | Default written: test-refreshed binding - collector vocabulary tables derived from the JSON and locked by test, no deploy change. Criteria 1–3 hold under either answer. |
| 2 | open | Exact JSON schema: optional-prop tables, per-key enums (OS `recommendationChanged: [true,false]`), OS context vocabularies | Default written: mirrors the current `EVENT_PROPS`/`OPTIONAL_PROPS`/`EVENT_VOCABULARIES`/`CONTEXT_*` tables verbatim, one file per producer. |
