# PLAN slice — `14_log_aggregator` (River Delta)

> PLAN slice for `/threejs-dojo 14_log_aggregator`. Shape **B** (sibling 3D app). Per the routing
> manifest this lands as a fresh voxelDojo app at `engines/voxelDojo/game-14-river-delta/`
> (port 5214, unit_id `14_log_aggregator` per task directive — note the manifest's conventional
> `U14-log-aggregator` id is the same unit, verifier keys on the exact string emitted).
>
> The catalog concept row is "Structured logging (JSON), log levels, aggregation pipelines,
> compression, indexing, retention, distributed tracing (OpenTelemetry), correlation IDs". This
> slice narrows that row to its **primary** concept (per
> `curriculum/14_log_aggregator/docs/spec.md` "Learning Objectives"): **high-throughput structured
> log ingestion through a bounded pipeline with queryable indexes, retention, and cross-service
> trace reconstruction via correlation IDs**. The other facets (JSON-vs-protobuf serialization
> benchmarks, OpenTelemetry wire format, per-language async runtime comparisons) are out of scope —
> one game = one concept.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent *a
> multi-stage ingest pipeline with a bounded buffer, indexed channels, hot/warm/cold tiers, and a
> dye-trace that follows one request's logs across multiple service tributaries* — they are all
> variants of "incoming sprite → admit/reject". A river-delta with N converging tributaries, a
> weir with N slots, indexed sort channels, compressed ice-blocks in a cold zone, and a Trace
> Tower the player assembles from correlation-matched droplets needs 3D space (depth for upstream
> → downstream flow, volumetric tiering for hot/warm/cold, and a visible dye-trace path) so the
> concept gets its own world.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/14_log_aggregator/`
- **ONE concept this game teaches:** a structured-log aggregation pipeline — JSON log envelopes
  flow from N service tributaries through an ingest intake into a **bounded buffer** that applies
  explicit backpressure when saturated (RF-019, RNF-005), an **indexer** that builds level /
  source / correlation / time / full-text indexes so logs become queryable without a rebuild
  (RF-011), a **segment store** that ages hot segments into compressed cold segments and applies
  retention policies (RF-012, RF-013, RNF-008), and a **trace builder** that reconstructs a
  request-scoped trace from `correlation_id` / `trace_id` / `span_id` / `parent_span_id` across
  services (RF-007, RF-014, RF-015). Out of scope: protobuf vs JSON serialization benchmarks,
  OpenTelemetry collector wire format, Go/Rust/Node perf comparison, alert-rule authoring UI,
  per-language async-runtime internals — those are the curriculum project's job, not the game's.
- **Slug:** `14_log_aggregator`
- **Catalog key question (context only, not the win condition):** "How does ingestion throughput
  compare for JSON vs protobuf log formats?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective):** the player
  keeps the ingest pipeline healthy under a deterministic burst — zero logs lost to backpressure,
  every accepted log indexed and queryable inside the indexing-freshness budget, retention held
  long enough that the queried log is still hot, and at least one cross-service trace reconstructed
  in timestamp + span-parent order from its correlation dye — all on a deterministic seed.
- **Unit id (evidence target):** `14_log_aggregator` (per task directive; the substrate does not
  yet have this unit registered as `active_unit`, so the run emits `scheduled_review: false`,
  `review_reason: "deepening"` until the substrate is extended).
- **Project (evidence field):** `14_log_aggregator`
- **Region id / dir:** `engines/voxelDojo/game-14-river-delta/`
- **Scenario id pattern:** `river-delta-L<n>` (n = 1..4)
- **Game name (evidence field):** `"River Delta"`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic (River Delta) | What "playing it right" proves |
| --- | --- | --- |
| **Structured JSON log envelope** (level, source, correlation_id, trace_id, span_id, message, attributes) | Each log is a glowing **droplet** with visible tags: color = level (trace=white, debug=cyan, info=blue, warn=amber, error=red, fatal=magenta), tributary of origin = source/service, **dye streak** = correlation_id (one dye color per request, shared by every droplet in that trace), tiny span-parent filament linking to its parent droplet, message shown as a short text ribbon. | Player reads structured fields, not a raw text blob — level/source/correlation are first-class. |
| **Multi-source ingestion** (RF-001, RF-006) | N upstream **tributaries** (e.g. `payments`, `checkout`, `inventory`, `auth`) converge into a single delta reservoir. Each tributary emits droplets at its own rate; bursts are visibly source-tagged. | Player feels "many services → one pipeline" — the aggregator's actual job. |
| **Bounded buffer + explicit backpressure** (RF-019, RNF-005) | A **weir** at the reservoir mouth with N visible slots. When full, new droplets bounce back into the tributary as red "429 ingest_backpressure" sparks (counted). Player presses **B** to **batch** the next burst (one batch = one slot, amortizes pressure); unbatched droplets fill slots one-by-one. | Player links "saturated buffer → 429" and "batching → smoother ingest". |
| **Indexer pipeline** (RF-011, RNF-004) | Past the weir, droplets fall into **indexer channels** that pre-sort them into indexed bins by level, source, correlation_id, and time bucket. Channels light up as they index; lag = droplets still in flight. Without indexing (cold channel), the Query Probe must scan linearly (slow). | Player sees index = pre-sorted bins, and feels indexing-freshness lag. |
| **Hot → warm → cold segments + retention** (RF-012, RF-013) | Indexed droplets settle into a **hot zone** (bright, recent), then drift into a **warm zone**, then a **cold zone**. In the cold zone, droplets visibly squash into compact **ice blocks** (raw_bytes → compressed_bytes, ratio shown ≥ 3:1 per RNF-008). Past retention, droplets **evaporate** (retention delete). | Player links retention policy to query availability — expired logs cannot be queried. |
| **Compression ratio** (RF-013, RNF-008) | Each cold ice block displays `raw / compressed / ratio`. A meter at the delta edge aggregates the ratio. | Player observes compression wins on repetitive JSON. |
| **Query by structured field + full-text** (RF-005, RF-006, RF-007, RF-008, RF-009, RF-010) | Player aims the **Query Probe** (free-fly drone) and sets filters: **level set**, **source**, **correlation_id** (dye color), **time range** (slider on the delta's time axis), and **full-text keyword** (matches message ribbons). **Z** fires the probe; it returns matching droplets glued to a result magnet. | Player learns filter selectivity — narrow filters hit indexes (fast), broad filters scan too much (slow / `413 query_too_broad`). |
| **Correlation ID / trace reconstruction** (RF-007, RF-014, RF-015 — the done-rule) | Each wave issues a **trace prompt**: "Reconstruct trace `corr_42`". Player sets the correlation filter to that dye, fires the probe, then presses **T** to drop matched droplets into the **Trace Tower** — they must stack in timestamp order, with span-parent filaments forming a tree across services (e.g. checkout root → payments child → inventory child). Wrong order or missing span = misbuilt trace. | Player physically rebuilds a request's journey across services from correlation dye — the distributed-tracing "aha". |
| **Idempotent ingestion / dedup** (RF-020) | A re-emitted droplet with the same `log_id` from the same source arrives at the weir; the dedupe membrane flashes yellow and harmlessly absorbs it (`duplicates_detected`, not double-counted in queries). | Player sees "same log_id → idempotent, no duplicate query result". |
| **Multi-source fairness** (RNF-010) | If one tributary (e.g. `payments`) floods the weir, a fairness vane splits intake round-robin so other services' logs aren't starved. Player can disable fairness (F) to watch `auth` starve → evidence `starvation_events`. | Player sees why the spec mandates fairness. |

## 4. Main loop (the ~30–45 s cycle the player repeats)

1. **Wave spawn.** A wave card flashes the round's contract, e.g. `WAVE 2: 3 services, 60 droplets,
   1 trace to reconstruct (corr_42, 4 spans across checkout+payments+inventory), 5 duplicates,
   retention 45s, expected compression ≥ 3:1`. Tributaries hum up.
2. **Manage intake.** Droplets arrive in bursts from each tributary. Player presses **B** to batch
   the next burst from the focused tributary (one batch = one weir slot regardless of size, up to
   the batch limit), or lets single droplets fill slots one-by-one. If the weir overflows, red
   `429 ingest_backpressure` sparks count against `backpressure_rejects`.
3. **Indexing flows.** Past the weir, droplets fall into indexer channels. The player sees lag
   (droplets in flight); the channels light as they index. Duplicate log_ids are deduped at the
   membrane.
4. **Settling & aging.** Indexed droplets settle hot, drift warm, and eventually squash into cold
   ice blocks (compression ratio ticks up). The retention clock drains; expired droplets evaporate.
5. **Query prompt.** The HUD posts a query contract: "find the failing payment" or "reconstruct
   trace `corr_42`". Player cycles the filter dimension with **F** (level → source → correlation
   → time → keyword), adjusts the value with **Q/E**, and fires the probe with **Z**.
6. **Trace assembly (the done-rule).** When the contract is a trace, the player presses **T** to
   drop matched droplets into the Trace Tower; the tower checks timestamp order and span-parent
   integrity across services. Correct rebuild = green flash; wrong order / missing parent =
   red flash, `traces_out_of_order += 1`.
7. **Wave clear.** When the wave's contract is met (queries correct, trace rebuilt, retention held
   — required logs didn't evaporate before query — backpressure=0, compression ≥ target), the
   delta dims, the HUD posts the wave score, and one `EVIDENCE {...}` line is emitted to the
   in-page channel and `.logs/evidence.ndjson`.

Total cycle per wave ≈ 30–45s; a level is N=2 queries + 1 trace in L1, scaling to N=4 queries +
2 traces + tighter retention in L4.

## 5. Inputs & controls (≤ 3 primary actions, NES-pad feel)

- **WASD / ←↑↓→** — free-fly the Query Probe around the delta (XZ plane) and tilt up/down to
  inspect hot/warm/cold tiers. Navigation aid, not a primary action.
- **Tab** — cycle target lock to the next tributary mouth (used to aim **B** batch admissions).
  Navigation aid.
- **B** — **BATCH**: admit the focused tributary's pending burst as one batched write into the
  weir (primary intake action, absorbs bursts without overflow).
- **F** — **FILTER CYCLE**: cycle the active filter dimension on the probe (level → source →
  correlation_id → time range → full-text keyword). Primary query-setup action.
- **Q / E** — adjust the active filter's value (toggle level set, pick source, pick dye color,
  slide time window, type keyword). Primary query-setup action.
- **Z** — **FIRE** the query probe with the current filters; matching droplets get magnetized to
  the result rail and the query latency is posted. Primary positive action.
- **T** — **TRACE ASSEMBLE**: drop the current correlation-matched result set into the Trace
  Tower; the tower validates order + span parents. Primary trace action.
- **R** — trigger an early **retention sweep** (secondary; use when a required log is about to
  expire).
- **H** — HUD toggle: show live weir depth, indexer lag, compression ratio, retention clock.
  Allowed in L1, hidden in later waves to test mastery without the crutch.
- Three primary actions define the loop: **B** (intake), **F** (filter), **Z** (query); **T**
  extends **Z** for the trace-contract waves. Everything else is navigation / inspection.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `backpressure_rejects === 0` (the weir never overflowed — bursts were batched correctly),
  - `indexer_lag_peak_ms <= budget` (every accepted log became queryable within the indexing
    budget — RNF-004),
  - `duplicates_double_counted === 0` (every re-emitted `log_id` was deduped, not counted twice
    in queries — RF-020),
  - `queries_wrong_filter === 0` (every query contract returned exactly the correct log set —
    filters were selective and right),
  - `traces_reconstructed_correctly === traces_requested` (every issued trace contract was
    rebuilt in timestamp order with span-parent integrity across services — the done-rule),
  - `traces_out_of_order === 0`,
  - `required_logs_expired_before_query === 0` (retention held long enough — no required log
    evaporated before the player queried it — RF-012),
  - `compression_ratio >= 3.0` on cold segments (RNF-008),
  - `starvation_events === 0` on multi-source waves (fairness held — RNF-010).
- **Fail the wave (FAIL)** when **any** of:
  - The weir overflows → red sparks, evidence `pass: false` with `backpressure_rejects > 0`.
  - A query returns the wrong log set (filter too broad → `413 query_too_broad`, or too narrow
    → missed required logs) → `queries_wrong_filter > 0`, evidence `pass: false`.
  - A trace is misbuilt (dropped out of timestamp order, or span-parent filament missing) →
    `traces_out_of_order > 0`, evidence `pass: false`.
  - A required log evaporates past retention before the player queries it →
    `required_logs_expired_before_query > 0`, evidence `pass: false`.
  - A duplicate `log_id` is double-counted in a query result → `duplicates_double_counted > 0`,
    evidence `pass: false`.
- Both outcomes are **direct readouts of pipeline discipline**: bounded ingestion, indexed
  queryability, retention held, trace reconstructable from correlation dye. Neither win nor fail
  is gated on raw speed — correctness first.

## 11. Learning-gate hooks

- **Active unit:** `14_log_aggregator` (project `14_log_aggregator`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still
  emits evidence with `scheduled_review: false` and `review_reason: "deepening"`; the verifier
  will not promote until the substrate registers the unit. The game never writes learner state.
- **Region id / dir:** `engines/voxelDojo/game-14-river-delta/` (port 5214 per
  `ROUTING_MANIFEST.md`).
- **Scenario / encounter id:** `river-delta-L1` (smoke clears L1; L4 is the full done-rule).
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus
  `console.log("EVIDENCE " + JSON.stringify(record))` so the Playwright smoke can capture the
  line, mirroring the canonical voxelDojo producer pattern (game emits, verifier owns mastery).
  NDJSON written to `engines/voxelDojo/game-14-river-delta/.logs/evidence.ndjson`.
- **Evidence record fields** (this game's metrics variant — `kind: "voxeldojo-river-delta"`):
  ```json
  {
    "source": "voxeldojo",
    "unit_id": "14_log_aggregator",
    "project": "14_log_aggregator",
    "scenario_id": "river-delta-L1",
    "game": "River Delta",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "voxeldojo-river-delta",
      "level": 1,
      "ingest_rate_per_second": 52,
      "logs_accepted": 60,
      "backpressure_rejects": 0,
      "duplicates_detected": 5,
      "duplicates_double_counted": 0,
      "indexer_lag_peak_ms": 420,
      "hot_segments": 4,
      "cold_segments": 2,
      "cold_raw_bytes": 18432,
      "cold_compressed_bytes": 5880,
      "compression_ratio": 3.13,
      "retention_deletes": 0,
      "required_logs_expired_before_query": 0,
      "queries_run": 2,
      "queries_correct": 2,
      "queries_wrong_filter": 0,
      "queries_too_broad": 0,
      "traces_requested": 1,
      "traces_reconstructed_correctly": 1,
      "traces_out_of_order": 0,
      "trace_span_services_spanned": 3,
      "starvation_events": 0
    },
    "review_context": {
      "scheduled_review": false,
      "review_reason": "deepening",
      "verifier_required": true
    },
    "curriculum_context": {
      "concept": "high-throughput structured log ingestion with queryable indexes, retention, and cross-service trace reconstruction",
      "mechanic": "River Delta (converging log tributaries, weir buffer, indexer channels, hot/warm/cold tiers, dye-trace correlation)",
      "accepted_signal": "bursts batched past the weir with zero backpressure; queries hit selective indexes; trace rebuilt in timestamp+span order from correlation dye; retention held; compression >= 3:1",
      "rejected_trap": "weir overflow (backpressure); broad scan queries; trace stacked out of order or missing span parent; required log expired before query; duplicate log_id double-counted"
    }
  }
  ```
  The emitter pushes this object to **both** `window.__voxelDojoEvidence` (append-only array)
  **and** `console.log("EVIDENCE " + JSON.stringify(record))`. The Playwright smoke captures the
  `EVIDENCE` console line and writes `.logs/evidence.ndjson`. Validation rejects malformed
  records before emission.
- **Pass rule (gate, evaluated by the verifier — not the game):**
  `evidence.pass === true`
  AND `metrics.kind === "voxeldojo-river-delta"`
  AND `metrics.backpressure_rejects === 0`
  AND `metrics.duplicates_double_counted === 0`
  AND `metrics.queries_wrong_filter === 0`
  AND `metrics.queries_too_broad === 0`
  AND `metrics.traces_reconstructed_correctly === metrics.traces_requested`
  AND `metrics.traces_out_of_order === 0`
  AND `metrics.required_logs_expired_before_query === 0`
  AND `metrics.compression_ratio >= 3.0`
  AND `metrics.starvation_events === 0`.
  Anything else keeps the gate locked. The verifier maps the eligible record to
  `fail` / `pass_retried` / `pass_first_try` and appends the review to
  `learner/learning_state.yaml > units_log` via the substrate — never the game.
- **Done-rule (one sentence, hand to the fresh-context verifier):** *The River Delta app at
  `engines/voxelDojo/game-14-river-delta/` runs green on `pnpm run lint|test|typecheck|build|smoke`,
  the smoke captures ≥1 valid `EVIDENCE` line with `source: "voxeldojo"`,
  `unit_id: "14_log_aggregator"`, `project: "14_log_aggregator"`, `pass: true`, and the metrics
  prove the player drove a burst of structured logs through the weir with zero backpressure,
  deduped repeated log_ids, indexed every accepted log inside the freshness budget, kept
  retention long enough to query the required logs, compressed cold segments ≥ 3:1, and rebuilt
  at least one cross-service trace from its correlation dye in timestamp + span-parent order.*
- **Side-effect contract** (mirrors pixelDojo + voxelDojo invariants): the smoke must assert that
  the app never publishes `window.__pixelQuestLearningState`, never writes `localStorage` keys
  `learning_state` / `units_log` / `mastered`, and never invokes `learner/substrate/`. Mastery is
  owned by the verifier + substrate, never by the producer.

## Open questions / risks (for the implementer)

- **Weir slot budget.** Pick `weir_slots = 8` and `batch_limit = 8` for L1 so the batching win is
  obvious (a 16-droplet burst fits in 2 slots batched, 16 slots unbatched → overflow). HUD must
  telegraph slot fill so overflow is screenshot-evident.
- **Indexer channel visibility.** Render one channel per index (level, source, correlation, time).
  Linear-scan queries should be visibly slower (probe traverses the whole reservoir); indexed
  queries snap to the right bin. Make the latency number float over the probe.
- **Dye-trace legibility.** Limit the palette to ~8 distinct correlation dyes; the active trace
  contract should highlight its dye everywhere so the player can follow it from tributary to
  reservoir to Trace Tower without reading text.
- **Retention clock vs trace contract.** Schedule trace contracts early in the wave so the
  required logs are still hot; later waves should tighten retention so the player must query
  before the sweep fires (R+`retention_sweep`).
- **Cold-zone compression visual.** Show raw vs compressed bytes on each ice block; aggregate the
  ratio in a HUD meter so `compression_ratio >= 3.0` is verifiable in a screenshot.
- **"H" stats crutch.** Decide by playtest whether to keep it on for L1 only, or always; the
  verifier must know which wave the smoke run clears.
