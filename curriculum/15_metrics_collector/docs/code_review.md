# Code Review — Project 15 Metrics Collector

> Review cycle: cycle-complete  
> Scope: `docs/spec.md`, Node/TypeScript, Go, and Rust implementations  
> Review focus: metric semantics, histogram correctness, query behavior, Prometheus compatibility, and operational safety

## Severity Key

- **Critical:** breaks a core cross-language contract or makes a runtime incomparable.
- **High:** required metric behavior is missing or materially incorrect.
- **Medium:** useful baseline exists but is incomplete, weakly validated, or benchmark-hostile.
- **Low:** documentation, polish, or test-depth gap.

## 1. Spec Coverage and Language Parity

- **Critical — Rust HTTP routes do not match the public contract.** Rust exposes `GET /metrics/query` and `GET /metrics/prometheus`, while the spec requires `GET /metrics?query=...`, `GET /metrics` for Prometheus text, and `GET /metrics/export`.
- **High — all three implementations omit major pipeline components.** There is no bounded ingest buffer, downsampler, rollup store, retention worker, cardinality registry, idempotency cache, alert state machine, or dashboard panel query execution.
- **Medium — language coverage is present.** Unlike Projects 13 and 14, Project 15 has Node, Go, and Rust implementations, enabling future cross-runtime comparison once contract gaps are closed.

## 2. Metric Type Semantics and Validation

- **High — invalid metric types and values are under-validated in Node and Go.** Node casts `req.params.type` to a metric type and records unknown types as a no-op path through `switch`; Go routes only known paths but does not reject negative counters, negative histograms/timers, NaN/Infinity, invalid names, or type conflicts.
- **High — Rust validates unknown path types but not negative counter/histogram semantics.** It rejects unknown metric type path values, but accepts invalid metric values unless JSON parsing rejects them.
- **High — same metric name with conflicting types is allowed.** All implementations include type in the series key, so `cpu` can be both a gauge and histogram without error, violating the edge case that type conflicts must be rejected.

## 3. Query and Aggregation Correctness

- **Critical — HTTP query mode hard-codes gauge lookup in all languages.** Node, Go, and Rust parse `avg(cpu)` then query `gauge` with empty labels, so `sum(counter)` and histogram/timer percentile queries through the HTTP API return wrong or empty data.
- **High — `rate` is not implemented.** The spec requires `rate`; aggregate functions include sum/avg/min/max/count/p50/p95/p99 only.
- **High — label filtering and grouping are absent in the HTTP API.** The store can key by labels, but query endpoints ignore `labels` and `group_by`, preventing dashboard-style grouped series.
- **Medium — percentile semantics are split and confusing.** Store-level p50/p95/p99 over counter/gauge raw samples are exact order statistics, while histogram percentiles use bucket upper bounds through a separate method not wired into the HTTP query path.

## 4. Histogram, Timer, and Prometheus Accuracy

- **High — histogram bucket configuration is fixed and not configurable.** The spec requires explicit bucket configuration and reporting for p99-accuracy comparisons. All implementations hard-code a Prometheus-like bucket list.
- **Medium — percentile target calculation can undercount edge percentiles.** `floor(count * percentile)` can produce target `0` for tiny counts and does not use Prometheus-style interpolation or documented approximation rules.
- **High — Prometheus export labels are not valid text exposition.** Labels are emitted as `host=a` instead of `host="a"`, and histogram bucket lines omit original metric labels in all languages.
- **Medium — `+Inf` is represented as `Number.MAX_VALUE`, max int float, or `f64::MAX`.** This is not Prometheus `+Inf` output and weakens compatibility.

## 5. Durability, Retention, Downsampling, and Backpressure

- **High — no retention/downsampling exists.** Ring-buffer eviction limits per-series samples, but there are no raw vs rollup retention policies, downsampling intervals, or retention lag metrics.
- **High — no explicit backpressure or cardinality enforcement exists.** Active series can grow unbounded by label cardinality, and max size applies only to samples per series.
- **Medium — health reports static placeholders.** Health always reports OK and `active_series: 0`, regardless of actual store contents, ingestion pressure, downsampling, retention, or alerting state.

## 6. Alerting and Dashboard Behavior

- **High — alert rules are stored but not served or evaluated by the HTTP service.** Node/Go/Rust can create rules, but list endpoints return empty arrays; there is no alert events endpoint and no background evaluation interval.
- **High — alert state transitions are missing.** The spec requires `pending`, `firing`, and `resolved`; current code appends stateless events whenever `evaluateAlerts` is manually called and the condition is true.
- **Medium — dashboard endpoint is a stub.** It returns an empty dashboard rather than panel series, summaries, and alert state for a requested range.

## 7. Test Quality and Benchmark Readiness

- **Medium — tests verify store happy paths and shallow server endpoints.** All languages test recording counters/gauges/histograms/timers, basic aggregation, Prometheus output existence, alert creation, and health.
- **High — tests encode spec gaps as expected behavior.** Tests assert exact percentiles over gauges and accept the simplified dashboard/list-alert stubs, so they do not protect the required contract.
- **High — no benchmark evidence exists for record latency, query p99, ingestion throughput, or histogram p99 accuracy.** The Go tests include benchmark functions, but there are no recorded benchmark outputs or cross-language comparison artifacts.

## Cross-Language Summary

The three implementations share a common simple architecture: in-memory map keyed by normalized labels, fixed buckets for histograms/timers, simple aggregate functions, and shallow HTTP wrappers. Go and Rust add synchronization; Node has the least type/runtime validation. Rust is currently the least contract-compatible at the HTTP layer because its metrics routes diverge from the spec.
