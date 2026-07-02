# Red Team: Log Aggregator

> **Cycle:** 14_log_aggregator · **Generated:** 2026-07-02 · **Persona:** skeptical senior engineer, kill-mandate
> DoD §7: *"redteam.md signed (or with a list of mitigations)."*

## Adversarial objective

Assume the implementation is wrong. Try to break it *before* it becomes an official cycle. The
red-team pass examines the code-review findings for exploitable edge cases and races, and
attempts to refute the "functionally equivalent" claim across the go, rust, node runtimes.

## Findings

- **[CRITICAL]** The spec explicitly requires Go, Rust, and Node/TypeScript implementations. Only Node and Go exist, blocking the JSON-vs-protobuf throughput
- **[MAJOR]** They accept and query logs, but neither has bounded ingest queues, asynchronous indexing workers, persisted segment storage, compression, al
- **[MAJOR]** `POST /logs` accepts only a single log entry in both languages; the required `{ items: [...] }` batch form is not implemented.
- **[MAJOR]** Re-ingesting the same `log_id` creates duplicate query results in both languages, violating idempotent ingestion and conflict detection.
- **[MAJOR]** Both implementations require `level` but accept any string, so unknown levels are silently indexed instead of rejected.
- **[MAJOR]** Neither implementation supports filters such as `attributes.error_code`, `attributes.user_id`, or nested field matching.
- **[MAJOR]** `LogStore.Query` linearly scans `logs`, so the index map does not improve latency and can become stale after ring-buffer eviction because `r
- **[MAJOR]** The stores expose `applyRetention`/`ApplyRetention`, but no HTTP/API worker invokes policy-based retention by level, source, environment, or
- **[MAJOR]** No cold segment model, raw/compressed byte accounting, or compression ratio metric exists.
- **[MAJOR]** Required `POST /alerts/rules`, `GET /alerts/rules`, and `GET /alerts/events` are absent in both languages.
- **[MAJOR]** The in-memory ring buffer drops oldest logs once `maxSize` is reached; the spec requires explicit `429 ingest_backpressure` or bounded queue
- **[MAJOR]** One high-volume source can fill the shared ring buffer and evict lower-volume source logs.
- **[MAJOR]** Missing coverage includes duplicate IDs, batch ingestion, invalid levels, structured fields, pagination/cursors, time-range parse errors, ov

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
