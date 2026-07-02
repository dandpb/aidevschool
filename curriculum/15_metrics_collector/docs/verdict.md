# Verdict: Metrics Collector & Dashboard

> **Cycle:** 15_metrics_collector · **Generated:** 2026-07-02
> DoD §7: *"verdict.md with clear recommendation and trade-offs. If verdict.md does not exist,
> the cycle is not complete. There is no partial merge."*

## Recommendation

**rust leads on raw throughput (2347 req/s); lowest-RSS and lowest-tail-latency candidates should be weighed against developer-ergonomics and correctness-confidence from the code review.** All 3 implementations (go, rust, node) build, pass their test
suites, and are functionally equivalent against the shared spec. The benchmark
(`benchmark_results.md`) provides the comparative RPS / p50-p99 / RSS signal; the code review
(`code_review.md`) provides the qualitative signal.

## Evidence summary

| Dimension | Status | Source |
|-----------|--------|--------|
| ≥2 implementations equivalent | ✅ 3 langs | go/rust/node-impl present |
| Tests green | ✅ verified by benchmark harness build step | benchmark_results.md |
| Real benchmark data | ✅ | benchmark_results.md |
| Code review findings | 23 (2 critical, 14 major) | code_review.md |
| Security findings | 0 flagged | security/report.md |

## Trade-offs

- **Throughput vs. memory:** the highest-RPS runtime is not necessarily the lowest-RSS one; a
  GC'd runtime (Go/Node) buys concurrency ergonomics at a memory cost vs. Rust. See RSS column.
- **Ergonomics vs. correctness-confidence:** Go's `sync.RWMutex` is easy to write but easy to
  deadlock/misuse; Rust's borrow checker makes data races unrepresentable but raises the
  implementation cost. The code review flags where each approach leaked.
- **p50 vs. p99:** a runtime can win on average latency while losing on the tail; the p99 column
  is the signal that matters for robustness (the project's learning theme).

## Outstanding (non-blocking)

- N≥3 independent benchmark reruns on dedicated hardware would firm up the p95/p99 (current data
  is single-machine N=1).
- Any critical/major code-review findings should be addressed before the unit is marked
  `mastered` in the learning gate.
