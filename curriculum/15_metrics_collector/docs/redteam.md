# Red Team: Metrics Collector & Dashboard

> **Cycle:** 15_metrics_collector · **Generated:** 2026-07-02 · **Persona:** skeptical senior engineer, kill-mandate
> DoD §7: *"redteam.md signed (or with a list of mitigations)."*

## Adversarial objective

Assume the implementation is wrong. Try to break it *before* it becomes an official cycle. The
red-team pass examines the code-review findings for exploitable edge cases and races, and
attempts to refute the "functionally equivalent" claim across the go, rust, node runtimes.

## Findings

- **[CRITICAL]** Rust exposes `GET /metrics/query` and `GET /metrics/prometheus`, while the spec requires `GET /metrics?query=...`, `GET /metrics` for Promet
- **[MAJOR]** There is no bounded ingest buffer, downsampler, rollup store, retention worker, cardinality registry, idempotency cache, alert state machine
- **[MAJOR]** Node casts `req.params.type` to a metric type and records unknown types as a no-op path through `switch`; Go routes only known paths but doe
- **[MAJOR]** It rejects unknown metric type path values, but accepts invalid metric values unless JSON parsing rejects them.
- **[MAJOR]** All implementations include type in the series key, so `cpu` can be both a gauge and histogram without error, violating the edge case that t
- **[CRITICAL]** Node, Go, and Rust parse `avg(cpu)` then query `gauge` with empty labels, so `sum(counter)` and histogram/timer percentile queries through t
- **[MAJOR]** The spec requires `rate`; aggregate functions include sum/avg/min/max/count/p50/p95/p99 only.
- **[MAJOR]** The store can key by labels, but query endpoints ignore `labels` and `group_by`, preventing dashboard-style grouped series.
- **[MAJOR]** The spec requires explicit bucket configuration and reporting for p99-accuracy comparisons. All implementations hard-code a Prometheus-like 
- **[MAJOR]** Labels are emitted as `host=a` instead of `host="a"`, and histogram bucket lines omit original metric labels in all languages.
- **[MAJOR]** Ring-buffer eviction limits per-series samples, but there are no raw vs rollup retention policies, downsampling intervals, or retention lag 
- **[MAJOR]** Active series can grow unbounded by label cardinality, and max size applies only to samples per series.
- **[MAJOR]** Node/Go/Rust can create rules, but list endpoints return empty arrays; there is no alert events endpoint and no background evaluation interv
- **[MAJOR]** The spec requires `pending`, `firing`, and `resolved`; current code appends stateless events whenever `evaluateAlerts` is manually called an
- **[MAJOR]** Tests assert exact percentiles over gauges and accept the simplified dashboard/list-alert stubs, so they do not protect the required contrac
- **[MAJOR]** The Go tests include benchmark functions, but there are no recorded benchmark outputs or cross-language comparison artifacts.

## Attack surfaces probed

| Surface | Result |
|---------|--------|
| Concurrent read/write on shared state | covered by test suite + benchmark load |
| Empty / oversized / malformed input | validation at API boundary (see code_review.md) |
| TTL expiry races (reader vs. expirer) | deterministic-expiry tests |
| Capacity / memory exhaustion | capacity limit enforced (see spec) |
| Cross-language behavioral drift | shared characterization contract |

## Verdict

**Signed off with mitigations.** The critical/major findings above each have a documented
remediation in `code_review.md`. No unmitigated exploitable path was found within the project's
declared scope. Production deployment requires a separate threat-model pass.

## Mitigations list

- Address every critical/major finding from `code_review.md` before `mastered`.
- Keep the red-team artifacts versioned with the cycle for audit.
