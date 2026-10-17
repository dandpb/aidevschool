# Status: 15_metrics_collector

## Phase

phase: cycle-complete

# Status — Project 15 Metrics Collector

> Cycle status: **cycle-complete**  
> Review date: 2026-06-18  
> Artifacts reviewed: `docs/spec.md`, `node-impl/`, `go-impl/`, `rust-impl/`

> **Supersede note (2026-09-13, AID-1756):** the stub narratives in this file
> ("dashboard stub", "health stub", and the hardcoded-`gauge` query gap) are
> historical records of the 2026-06-18 review, kept verbatim for audit; they do
> not describe the current tree. They were superseded by the hardening R8
> de-stub: for this project via PR #380 (merge `ed9241b4`) and PR #389 (merge
> `4bb76005`), registered in the Addendum below; the residual curriculum-wide
> R8-iii items closed via PR #393 (merge `3d12a8ff`); and the catalog-wide docs
> reconciled to the real catalog via PR #390 (merge `5bae4372`). This note adds
> no new completion claim; current behavior is evidenced by the `node-impl/`
> tests.

## Completion Snapshot

The documentation review cycle is complete. Project 15 has implementations in all three requested languages, but the current code is still a simple in-memory metrics baseline rather than the complete metrics collector/dashboard system described by the spec.

## Implementation Inventory

| Language | Status | Notes |
| --- | --- | --- |
| Node/TypeScript | Partial implementation | Express service with metric writes, basic store aggregations, fixed histogram buckets, Prometheus export, alert-rule creation, dashboard stub, and health stub. *(historical — the dashboard/health stubs are superseded by R8; see Supersede note and Addendum)* |
| Go | Partial implementation | Thread-safe in-memory store and `net/http` service mirroring the Node feature set, with benchmark functions but no recorded benchmark results. |
| Rust | Partial implementation with route mismatch | Axum service and synchronized store exist, but HTTP routes diverge from the required `/metrics` dual-mode contract. |

## Evidence Reviewed

- Project specification: metric type semantics, time-series storage, aggregation, histogram percentiles, dashboard API, downsampling, retention, Prometheus export, alerts, cardinality/backpressure, health, and NFRs.
- Node source and tests: `store.ts`, `server.ts`, `main.ts`, store tests, and server tests.
- Go source and tests: `metrics/store.go`, `main.go`, and `store_test.go`.
- Rust source and tests: `src/lib.rs`, `src/main.rs`, and `tests/integration.rs`.

## Current Capability

- Counter, gauge, histogram, and timer samples can be recorded.
- Labels are normalized in series keys.
- Store-level sum, average, min, max, count, and percentile-style aggregations exist for raw counter/gauge points.
- Histogram/timer bucket counts, sum, count, and percentile lookup exist at store level.
- Prometheus text export exists in all languages.
- Alert rules can be stored, and store-level manual evaluation can append events.
- Dashboard and health endpoints exist as stubs. *(historical — superseded by R8; see Supersede note and Addendum)*

## Key Gaps Before Implementation Completion

> Supersede (2026-09-13, R8): of the gaps below, the hardcoded-`gauge` query
> (metric-type resolution in `GET /metrics?query=`) and the dashboard panel
> queries, alert events endpoint, and list-alerts listing items were closed by
> the hardening R8 de-stub (see Addendum). The remaining items are outside that
> change's scope. Historical text kept verbatim below.

- Align Rust HTTP routes with the spec and add `/metrics/export` everywhere.
- Parse query metric type/labels/grouping instead of hard-coding gauge queries.
- Implement `rate`, dashboard panel queries, alert state transitions, alert events endpoint, and list-alert persistence.
- Add runtime validation for metric type conflicts, negative counters, invalid histogram/timer observations, NaN/Infinity, invalid labels, and cardinality limits.
- Add configurable histogram buckets and documented percentile approximation behavior.
- Implement bounded ingest queues, backpressure, idempotent batches, downsampling, retention, rollups, and health lag fields.
- Record benchmark evidence for record latency, query p99, ingestion throughput, and p99 histogram accuracy.

## Cycle Result

Review artifacts are complete for this cycle:

- `docs/code_review.md` — completed.
- `docs/status.md` — completed.
- `docs/evolution_report.md` — completed in this cycle.

Project readiness remains **partial** because the implementations establish a common baseline but not the full observability-system contract.

## Addendum — node-first recalibration (AID-1671, 2026-09-13)

- The `go-impl/` and `rust-impl/` directories listed in the inventory above were removed by the curriculum-wide node-first policy (commit `1b0a3090`; Project 01 kept as the only polyglot pilot), so the Go/Rust inventory rows describe the tree as it was at review time, not the current tree. `docs/spec.md` was recalibrated in the same direction: Node/TypeScript is the maintained implementation track and Go/Rust guidance became optional porting notes.
- In the same change, the hardcoded stubs flagged by hardening R8 were replaced with store-backed behavior in `node-impl/`: `GET /alerts/rules` lists created rules, `GET /alerts/events` lists recorded evaluation events, `GET /dashboard` builds panels from recorded series and returns alert states, `GET /metrics?query=` resolves the metric type instead of assuming `gauge` (counter and histogram/timer percentiles are queryable), `GET /health` reports the real active-series count, and `POST /metrics/:type` rejects unknown types with `invalid_metric_type`.
