# Code Review — Project 14 Log Aggregator

> Review cycle: cycle-complete  
> Scope: `docs/spec.md`, Node/TypeScript implementation, Go implementation  
> Review focus: ingestion pressure, query correctness, indexing, retention, and observability pipeline behavior

## Severity Key

- **Critical:** prevents the required language-neutral observability comparison.
- **High:** a required ingestion/query/retention/alert behavior is missing or incorrect.
- **Medium:** useful baseline behavior exists but does not meet scalability or correctness intent.
- **Low:** documentation, polish, or test-depth gap.

## 1. Spec Coverage and Language Parity

- **Critical — Rust implementation is absent.** The spec explicitly requires Go, Rust, and Node/TypeScript implementations. Only Node and Go exist, blocking the JSON-vs-protobuf throughput comparison across runtimes.
- **High — both implementations are in-memory baselines, not aggregation pipelines.** They accept and query logs, but neither has bounded ingest queues, asynchronous indexing workers, persisted segment storage, compression, alerting rules, or cold retention segments.
- **High — batch ingestion is missing.** `POST /logs` accepts only a single log entry in both languages; the required `{ items: [...] }` batch form is not implemented.

## 2. Ingestion Validation and Idempotency

- **High — duplicate `log_id` handling is missing.** Re-ingesting the same `log_id` creates duplicate query results in both languages, violating idempotent ingestion and conflict detection.
- **High — log-level validation is incomplete.** Both implementations require `level` but accept any string, so unknown levels are silently indexed instead of rejected.
- **Medium — generated IDs are time-based and collision-prone under concurrency.** Node uses `Date.now()` and Go uses `UnixNano()`; neither combines source identity with a robust unique generator.
- **Medium — payload and attribute bounds are absent.** There are no body-size, message-size, attribute-size, or batch-size limits beyond Express/default decoder behavior and process memory.

## 3. Query Semantics and Index Correctness

- **High — structured field search is absent.** Neither implementation supports filters such as `attributes.error_code`, `attributes.user_id`, or nested field matching.
- **High — Go builds an index but does not use it for queries.** `LogStore.Query` linearly scans `logs`, so the index map does not improve latency and can become stale after ring-buffer eviction because `removeFromIndex` is a no-op.
- **Medium — level query shapes diverge.** Go supports repeated `level` parameters via `r.URL.Query()["level"]`; Node supports only one string and not comma-separated levels.
- **Medium — timestamp ordering lacks stable tie-breaking by `log_id`.** Both sort by timestamp only, so equal timestamps can return nondeterministic ordering.

## 4. Retention, Compression, and Durability

- **High — retention is manual store method only.** The stores expose `applyRetention`/`ApplyRetention`, but no HTTP/API worker invokes policy-based retention by level, source, environment, or global default.
- **High — compression is absent.** No cold segment model, raw/compressed byte accounting, or compression ratio metric exists.
- **Medium — durability mode is reported as volatile and no restart recovery exists.** Health says `volatile_until_flush`, but there is no flush path, persistence mode, or index rebuild story.

## 5. Trace and Alerting Correctness

- **High — alert rules/events are not implemented.** Required `POST /alerts/rules`, `GET /alerts/rules`, and `GET /alerts/events` are absent in both languages.
- **Medium — trace lookup returns logs, not a trace model.** `GET /traces/:id` returns associated logs but not reconstructed spans, parent-child relationships, service counts, error counts, root span, or incomplete/partial state.
- **Medium — missing span filtering.** Query APIs support trace id and correlation id, but not `span_id` filtering despite RF-007.

## 6. Backpressure, Isolation, and Operational Metrics

- **High — backpressure is silent eviction, not explicit rejection.** The in-memory ring buffer drops oldest logs once `maxSize` is reached; the spec requires explicit `429 ingest_backpressure` or bounded queue behavior instead of hidden data loss.
- **High — multi-source isolation is not modeled.** One high-volume source can fill the shared ring buffer and evict lower-volume source logs.
- **Medium — health and metrics are too shallow.** Health exposes status, durability mode, and buffer depth only; metrics expose just total ingested count. Required fields such as indexing lag, rejected logs, query latency, retention deletes, compression ratio, and alert evaluations are missing.

## 7. Test Quality and Benchmark Readiness

- **Medium — tests cover the minimal happy path.** Both languages test single ingestion, basic filters, full-text substring search, manual retention, ring-buffer behavior, health, metrics, and trace lookup.
- **High — tests do not cover required failure semantics.** Missing coverage includes duplicate IDs, batch ingestion, invalid levels, structured fields, pagination/cursors, time-range parse errors, oversized payloads, backpressure, and alerting.
- **Medium — no throughput/query benchmarks exist.** The central JSON-vs-protobuf throughput question cannot be answered from the current artifacts.

## Cross-Language Summary

Node and Go are intentionally simple and largely equivalent: both provide a small volatile log store with HTTP endpoints around single-entry ingest and linear-scan query. Go is marginally stronger because it is synchronized and has a placeholder index, but the index is not query-driving. Neither implementation yet matches the observability-pipeline architecture described by the spec.
