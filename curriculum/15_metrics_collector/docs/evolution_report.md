# Evolution Report — Project 15 Metrics Collector

> Cycle status: **cycle-complete**  
> Focus: metrics-correctness bottlenecks and next optimizations per language

## System-Level Evolution Theme

Project 15 has the broadest language coverage and a common in-memory baseline. The next evolution is to make metric semantics precise: counters must remain monotonic, histograms/timers must use configurable buckets and bucket-derived percentiles, queries must understand type/labels/grouping/rate, and the system must explicitly bound cardinality and ingestion pressure. The main bottleneck is semantic correctness, not storage performance yet.

## Node/TypeScript

### Current Bottleneck

Node's bottleneck is weak runtime validation and a query endpoint that hard-codes `gauge` with empty labels. This causes `sum(counter)` and histogram percentile queries to miss data through HTTP even though store-level methods exist. Prometheus export also emits invalid label syntax and incomplete histogram labels.

### Optimization Path

1. Add request schema validation for metric type, name, finite numeric value, labels, timestamps, and type-specific semantics.
2. Parse query expressions into aggregation, metric name, label filters, range, and grouping; choose counter/gauge/histogram/timer based on registry metadata.
3. Add a series registry that rejects type conflicts and enforces label/cardinality caps before allocation.
4. Wire histogram/timer p50/p95/p99 queries to bucket-derived percentile logic and document approximation.
5. Fix Prometheus text output with quoted labels, valid `+Inf`, original labels on bucket/sum/count lines, and optional HELP metadata.

### Expected Result

Node becomes a productive API-correctness baseline: dynamic validation is explicit, HTTP behavior matches the spec, and event-loop work remains bounded by rejecting unsafe cardinality early.

## Go

### Current Bottleneck

Go's bottleneck is lock granularity and the same gauge-hard-coded query path. A single `RWMutex` protects all samples, histograms, alerts, and events. This is acceptable for tests but will dominate the `<0.1 ms` hot-path target as series count and concurrent writes grow.

### Optimization Path

1. Introduce a series registry with per-series locks or sharded maps to reduce global lock contention.
2. Parse query type/labels/grouping and route histogram/timer percentiles through bucket data instead of gauge sample queries.
3. Add bounded ingestion channels and worker-owned stores so HTTP handlers can reject saturation explicitly.
4. Add configurable bucket layouts and benchmark bucket-update strategies independently from HTTP parsing.
5. Record and publish benchmark outputs for `BenchmarkStoreRecord` and query benchmarks under fixed cardinality profiles.

### Expected Result

Go should become the throughput and contention reference: explicit lock granularity, bounded queues, and benchmark evidence around hot-path recording cost.

## Rust

### Current Bottleneck

Rust's bottleneck is public-contract mismatch plus coarse `RwLock` storage. Store behavior mirrors Go/Node, but Axum routes expose `/metrics/query` and `/metrics/prometheus` instead of the spec's dual-mode `/metrics` and `/metrics/export`. This prevents interoperability tests from running unchanged across languages.

### Optimization Path

1. Align routes with the spec: `GET /metrics` dual-mode, `GET /metrics/export`, and JSON query responses at `GET /metrics?query=`.
2. Replace `format!("{:?}", metric_type)` keys with stable snake_case key components matching API labels.
3. Use typed validation errors for counter/gauge/histogram/timer semantics and map them to response codes.
4. Evaluate lower-contention data structures: sharded maps, per-series locks, or channel-owned writers for hot recording.
5. Use ownership-safe snapshots for query/export so retention/downsampling can evolve without readers observing partial state.

### Expected Result

Rust should become the strongest type-safety baseline once the HTTP contract is aligned: invalid metric semantics rejected at the boundary and storage/query ownership made explicit.

## Cross-Language Next Benchmark

After semantic and route parity are fixed, benchmark:

- single-sample record latency p95;
- sustained counter/gauge ingestion throughput;
- active-series cardinality limit behavior;
- 1-hour query p99 for sum/avg/rate/grouped queries;
- histogram p99 accuracy against known distributions and bucket layouts;
- Prometheus scrape correctness with labels and histograms;
- alert isolation when one rule is slow or invalid.

The key comparison should focus on percentile accuracy and hot-path overhead together: an implementation that records quickly but reports misleading p99 values has failed the project goal.
