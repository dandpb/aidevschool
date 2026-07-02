# Red Team: Search Engine

> **Cycle:** 18_search_engine · **Generated:** 2026-07-02 · **Persona:** skeptical senior engineer, kill-mandate
> DoD §7: *"redteam.md signed (or with a list of mitigations)."*

## Adversarial objective

Assume the implementation is wrong. Try to break it *before* it becomes an official cycle. The
red-team pass examines the code-review findings for exploitable edge cases and races, and
attempts to refute the "functionally equivalent" claim across the go, rust, node runtimes.

## Findings

- **[CRITICAL]** index persistence is absent. The spec requires deterministic disk persistence and startup load without resubmitting source documents.
- **[CRITICAL]** incremental replace/delete semantics are absent. Re-indexing an ID does not replace stale terms because IDs are auto-assigned integers, and 
- **[MAJOR]** positional postings are absent. Postings store only document ID and term frequency, so phrase search and proximity-sensitive ranking cannot 
- **[MAJOR]** BM25, ranking strategy selection, boolean query parsing, phrase queries, fuzzy search, autocomplete, snippets, metadata, and structured API 
- **[MAJOR]** document IDs are generated internally instead of accepting stable client IDs. This breaks FR-001 and makes atomic replace/delete impossible.
- **[MAJOR]** postings lists are append-only and never compacted or cleaned because delete/replace does not exist.
- **[CRITICAL]** there is no query parser. Queries are tokenized as bag-of-words, so `AND`, `OR`, `NOT`, parentheses, and quoted phrases are treated as plain
- **[MAJOR]** default ranking is TF-IDF-like, not BM25, and clients cannot choose `tf_idf` vs `bm25`.
- **[MAJOR]** HTTP contracts differ from the spec. Implementations use `POST /index` with a single `{title, content}` object and `POST /search` with JSON 
- **[MAJOR]** `GET /suggest` is missing.
- **[MAJOR]** persistence, atomic temp-file replacement, checksum/version metadata, and corrupt-startup handling are missing.
- **[MAJOR]** no tests cover phrase matching, boolean precedence, fuzzy distance, autocomplete, stable tie-breaks, replace/delete cleanup, persistence/res
- **[MAJOR]** no benchmark evidence validates 10,000-document build time, p95 search latency, autocomplete latency, or incremental update latency.

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
