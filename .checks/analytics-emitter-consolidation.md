# Analytics emitter consolidation — one funnel core, single-sourced vocabularies

Sources:

- `.tasks/analytics-emitter-consolidation.md` - the 13 criteria, Decided doors, Out of scope, Unresolved defaults
- `.design/analytics-emitter-consolidation.md` - **binding for the interface**: Shape Adds/Changes/Leaves, Decisions 1–7, spike constraints (deploy CLI 422 on non-function files; OS staged copy)
- `engines/codexDojo/ecosystem/MANIFEST.md:147-149` - the seam rows to update
- `learner/gate/tests/dojo_analytics_collector_v4.test.mjs:15-19` - the F2 wave; freshest instance of the five-site tax

Profile: `light` (no `## tlc-implement` declaration in AGENTS.md). Coverage join and Test policy rows are standard-profile steps - "no set rows beyond the per-check sampling notes" and moving on.

## Out of scope

- Collector storage, retention, export API; drift-tooling beyond the vocabulary binding - design Boundary
- Envelope v4 unification - design Decision 1 (deferred until a fourth producer or canonical OS loop)
- `engines/zai-duolingo-like` - quarantined prototype
- The four declined ride-alongs (utils export, PALETTE, type pinning, hygiene) - declined 2026-09-13
- Netlify deploy configs - `netlify.toml` files stay byte-identical
- The three dirty files in `learner/gate` (`__main__.py`, `literacy_verifier.py`, `no_code_checklist.py`) - someone else's in-flight work; do not touch

## Landing

Three producers' funnel plumbing converges on the existing `@aidevschool/evidence` seam; vocabularies become one cross-runtime JSON authority consumed by TS and `.mjs` alike; the collector keeps its export surface and route while its three hand-copied validator tables become derived.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Wire contracts frozen | Envelopes stay v1 (OS), v2 (literacy), v3 (surfaces); no v4 minted | unify on v4 - needs a back-compat window on live pilots |
| Vocabulary authority | `engines/shared/teaching-evidence/vocabularies/{literacy,surfaces,os}.json`; loader modules re-export derived tables; `.mjs` tooling reads the same files | TS source + codegen - not consumable by plain-`.mjs` collector/monitor without a build step |
| Core seam | `funnelCore.ts` exported as `./funnel-core` in `@aidevschool/evidence`; `emitFunnelEvent` API preserved | new `engines/shared/analytics` package - second seam beside an existing one |
| Collector export surface | `validateAnalyticsEvent`, `validateLiteracyEvent`, `validateSurfaceEvent`, `EVENT_VOCABULARIES`, `SURFACE_EVENT_PROPS`, `ANALYTICS_EVENT_NAMES`, `LITERACY_EVENT_NAMES`, … keep their names | renaming during the table-driven refactor - forced: `aggregate_funnel.mjs`, `schema_drift_monitor.mjs`, `probe_collector_export.mjs`, OS parity tests import them |

- Nothing else in this change is hard to reverse

## Checks

### S1 - Vocabularies single-sourced · collector + monitor + 3 collector tests + 3 monitor tests · ~95 KB · ~24k

**C1** - Each producer's JSON drives the collector validator: a probe event built from a JSON entry is accepted, a probe with a prop absent from the JSON is rejected, and the collector's derived tables deep-equal the JSON for every event (total, not sampled), for `surfaces.json` → `validateSurfaceEvent`, `literacy.json` → `validateLiteracyEvent`, `os.json` → `validateAnalyticsEvent`
Proof: `node --test learner/gate/tests/dojo_analytics_vocabularies.test.mjs` (new; named tests "surfaces vocabulary drives validator", "literacy vocabulary drives validator", "os vocabulary drives validator"; located assertion: unknown prop rejected)

**C2** - Exactly one hand-written vocabulary definition per producer exists - the JSON. Repo-wide scan for literal tables (`LITERACY_EVENT_PROPS`, `LITERACY_OPTIONAL_PROPS`, `SURFACE_EVENT_PROPS`, `FUNNEL_EVENT_PROPS`, `EVENT_VOCABULARIES`) returns 0 matches outside the JSON loader/derived modules (final state; proof runs after S3 and S4 land)
Proof: `python3 -m unittest engines.test_engine_contracts.TestAnalyticsVocabularyContracts.test_analytics_vocabularies_single_sourced` (new test class)

**C3** - `schema_drift_monitor.mjs` carries no inline `LITERACY_EVENT_PROPS`/`LITERACY_OPTIONAL_PROPS` literals and its v4 suite still passes driven by the JSON-derived tables
Proof: `node --test learner/gate/tests/dojo_analytics_schema_drift_monitor_v4.test.mjs` (existing, unmodified) — the inline-literal absence is covered by C2's scan

### S2 - Funnel core and the surfaces producer · shared package + voxel parity test + dojoToday · ~55 KB · ~14k

**C4** - `funnelTelemetry.ts` keeps its public API (`emitFunnelEvent`, types, absolute-path-only activation, silent no-op without env) over `funnelCore.ts`; both existing suites pass unmodified
Proof: `cd engines/voxelDojo && pnpm exec vitest run -c ../shared/teaching-evidence/vitest.config.ts tests/funnelTelemetry.test.ts` (located assertion: no env → no-op)
Proof: `cd engines/voxelDojo && pnpm exec vitest run shared/funnelTelemetry.test.ts` (located assertion: closed vocabularies)

**C5** - A surfaces batch through the core serializes exactly `{schemaVersion:3, source, events:[{schemaVersion:3, source, event, eventId, sessionId, occurredAt, props}]}` and flushes at `FUNNEL_BATCH_MAX_EVENTS = 100`
Proof: `cd engines/voxelDojo && pnpm exec vitest run -c ../shared/teaching-evidence/vitest.config.ts tests/funnelCore.test.ts` (new; named tests "serializes the surfaces v3 envelope", "flushes at 100")

**C6** - dojoToday typechecks, builds, and selfchecks with the unchanged `file:../shared/teaching-evidence` dependency and unchanged `emitFunnelEvent` import
Proof: `cd engines/dojoToday && npm run build && npm run selfcheck` (`tsc --noEmit` + `vite build` + substrate selfcheck)

### S3 - literacyDojo producer · domain + 3 adapters + 5 test files · ~52 KB · ~13k

**C7** - literacyDojo's analytics suites pass unmodified with the vocabulary loaded from `vocabularies/literacy.json`
Proof: `cd engines/literacyDojo && npm run test` (located assertions: `tests/domain/analyticsV2.test.ts` rejects a prop outside the closed vocabulary; `tests/app/services.analytics.test.ts` pins the `/__dojo/bridge/v1/analytics` endpoint invariant)

**C8** - The literacy wire envelope stays v2 (`schemaVersion: 2` + `contentVersion`) and collector acceptance is unchanged
Proof: `node --test learner/gate/tests/dojo_analytics_collector_v2.test.mjs learner/gate/tests/dojo_analytics_collector_v4.test.mjs` (existing, unmodified; located assertion: v2 envelope accepted)

### S4 - OS producer · analytics stack + bridge + 7 test files · ~54 KB · ~14k

**C9** - The OS analytics suites pass unmodified with vocabulary from `vocabularies/os.json`; persisted `installationId`, strict `sequence`, retry ×2 @ 1 s, ack reconciliation, 500-event cap preserved
Proof: `cd engines/codexdojo-os-prototype && npm run test` (located assertions: `batcher.test.ts` ack removal + retry; `collector.test.ts` installationId persistence)
Proof: `cd engines/codexdojo-os-prototype && npm run test:analytics:coverage` (repo-declared 100% level policy on `events.ts`)

**C10** - Collector vocabulary equivalence holds through the JSON on both sides
Proof: `cd engines/codexdojo-os-prototype && npx vitest run src/analytics/collectorParity.test.ts src/analytics/eventsExposure.test.ts` (located assertion: identical closed vocabulary vs collector)

**C11** - `bridge/analytics.ts` keeps its decode contract (≤ 50 events, unique `eventId`s, strictly increasing `sequence`); OS wire stays v1
Proof: `cd engines/codexdojo-os-prototype && npx vitest run bridge/analytics.test.ts` (located assertion: out-of-order sequence rejected)

### S5 - Guard retirement and contracts · 4 parity files + MANIFEST rows · ~20 KB · ~5k

**C12** - The four vocabulary-parity files retire (`dojo_analytics_collector_v2/v3/v4.test.mjs`, `dojo_analytics_funnel_surfaces_v3.test.mjs`); exactly one smoke test per producer remains under `engines/shared/teaching-evidence/tests/`; every remaining `learner/gate/tests/dojo_analytics_*.test.mjs` is green
Proof: `git ls-files learner/gate/tests | grep -cE "collector_v[234]|funnel_surfaces_v3"` returns `0`, `ls engines/shared/teaching-evidence/tests | grep -c smoke` returns `3`
Proof: `node --test learner/gate/tests/dojo_analytics_*.test.mjs` (remaining set: activation_surfaces, edge_semantics, packaging, netlify, monitor v2/v3/v4, aggregation v2/v4 — all unmodified)
Sampling note: retired collector-acceptance coverage is replaced by C1's total JSON↔validator binding; the OS engine→collector boundary is covered by C1's `os.json` probe.

**C13** - MANIFEST rows 147–149 map the new seam
Proof: `grep -n "funnelCore\|vocabularies" engines/codexDojo/ecosystem/MANIFEST.md` returns the updated rows

## Swept

- validation: C1, C7, C9
- failure modes: C4, C9 - per-strategy transport-failure semantics pinned by the unmodified suites
- idempotency and retry: existing - collector `<day>/<source>/<eventId>` idempotency + OS ack reconciliation; pinned by C10/C11 suites until retirement, then by C1's total binding + C12's per-producer smoke
- authorization: existing - same-origin gate and Bearer export untouched; pinned unmodified by `dojo_analytics_collector_netlify.test.mjs` (in C12's remaining set)
- concurrency and ordering: C11 - strictly increasing sequence pinned
- data lifecycle: not in scope - retention and caps unchanged; pinned unmodified by `dojo_analytics_collector_netlify.test.mjs` and `dojo_analytics_collector_edge_semantics.test.mjs`
- dependency failure: C4, C9
- state transitions: C4 - activation no-op→active; C9 - queue restore→flush→ack
- observability: C12 - one smoke test per producer is the drift tripwire

## Handoff

Single batch: S1–S5 floor totals ≈ 70k (`wc -c`/4 over the touched files), under the 150k budget - no handoff boundary. If a boundary is forced anyway, the surface change is after S2 (producer migrations read different engines); never split a slice.

Build boundaries for the agent: hooks block edits/deletions of existing test files - the S5 retirement commits carry `SDLC_ALLOW_TEST_EDIT=1`, owner approval recorded in the task (criterion 12) and this session (2026-09-13). Use it on nothing else. The three dirty `learner/gate` files listed in Out of scope are not yours.
