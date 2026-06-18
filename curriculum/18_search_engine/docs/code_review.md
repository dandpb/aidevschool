# Code Review — Search Engine

## Scope

Reviewed `docs/spec.md` and the authored source in `go-impl`, `rust-impl`, and `node-impl`. Generated dependency/build output was not reviewed as source. This is a documentation-only review.

## Severity legend

- **Critical**: violates a core search-engine capstone requirement.
- **High**: materially misses important functional behavior.
- **Medium**: baseline implementation is useful but incomplete or inefficient.
- **Low**: polish, documentation, or test-depth issue.

## 1. Specification coverage

- **Critical — all languages:** index persistence is absent. The spec requires deterministic disk persistence and startup load without resubmitting source documents.
- **Critical — all languages:** incremental replace/delete semantics are absent. Re-indexing an ID does not replace stale terms because IDs are auto-assigned integers, and deletion is not implemented.
- **High — all languages:** positional postings are absent. Postings store only document ID and term frequency, so phrase search and proximity-sensitive ranking cannot be implemented from the current index.
- **High — all languages:** BM25, ranking strategy selection, boolean query parsing, phrase queries, fuzzy search, autocomplete, snippets, metadata, and structured API errors are not implemented.
- **Medium — all languages:** the implementations do cover deterministic tokenization basics, stop-word removal, term-frequency postings, corpus document count, simple TF-IDF scoring, and top-k limiting.

## 2. Tokenization and normalization

- **Strong point — Go/Rust:** tokenization uses Unicode-aware character classes (`unicode.IsLetter`/`IsDigit`, `char::is_alphanumeric`) and lowercasing.
- **Medium — Node:** tokenization splits on `/[^a-zA-Z0-9]+/`, so non-Latin text and accented Unicode tokens are not handled as deterministically as the spec asks.
- **Medium — all languages:** token positions are discarded after tokenization. This is the key blocker for phrase matching and better snippets.
- **Low — all languages:** stop-word lists are hard-coded rather than configurable.

## 3. Index structure and update correctness

- **High — all languages:** document IDs are generated internally instead of accepting stable client IDs. This breaks FR-001 and makes atomic replace/delete impossible.
- **High — all languages:** postings lists are append-only and never compacted or cleaned because delete/replace does not exist.
- **Medium — all languages:** corpus statistics are minimal. Document count and document lengths exist, but total term frequency, average document length, max term frequency, and IDF caches are not maintained as first-class term stats.
- **Medium — all languages:** postings lists are not explicitly sorted by stable document ID with tie-breaking guarantees.

## 4. Query parsing and ranking

- **Critical — all languages:** there is no query parser. Queries are tokenized as bag-of-words, so `AND`, `OR`, `NOT`, parentheses, and quoted phrases are treated as plain terms or stop words.
- **High — all languages:** default ranking is TF-IDF-like, not BM25, and clients cannot choose `tf_idf` vs `bm25`.
- **Medium — all languages:** sorting only compares score descending. Equal scores can produce nondeterministic ordering because map iteration order is not stable; the spec requires stable tie-breaking by document ID.
- **Medium — all languages:** top-k retrieval sorts the entire candidate set instead of using a heap or partial selection, which will hurt the 10,000-document benchmark target on broad queries.

## 5. API and persistence behavior

- **High — all languages:** HTTP contracts differ from the spec. Implementations use `POST /index` with a single `{title, content}` object and `POST /search` with JSON body, not the spec's batch document shape and query-string search contract.
- **High — all languages:** `GET /suggest` is missing.
- **High — all languages:** persistence, atomic temp-file replacement, checksum/version metadata, and corrupt-startup handling are missing.
- **Medium — Rust:** the hand-written TCP HTTP server is compact but fragile; response reason phrases always say `OK` even for error statuses.
- **Medium — Node:** request body accumulation has no size limit, so malformed or large requests can grow memory unbounded.

## 6. Tests and benchmark evidence

- **Strong point — all languages:** tests cover tokenization, stop-word removal, numeric tokens, basic indexing/search, ranking by term frequency, empty query, no match, and limits.
- **Medium — Go:** HTTP tests cover health, indexing, search, malformed index JSON, and missing content.
- **High — all languages:** no tests cover phrase matching, boolean precedence, fuzzy distance, autocomplete, stable tie-breaks, replace/delete cleanup, persistence/restart, snippets, metadata, or structured errors.
- **High — all languages:** no benchmark evidence validates 10,000-document build time, p95 search latency, autocomplete latency, or incremental update latency.

## 7. Maintainability and observability

- **Medium — Go:** tokenizer, index, and HTTP are separated clearly, which is the best modular baseline among the three.
- **Medium — Rust:** core index logic is in `lib.rs`, but the HTTP server is low-level enough to distract from search-engine concerns.
- **Medium — Node:** tokenizer/index logic is pure and easy to test, but API and persistence layers are minimal.
- **Medium — all languages:** metrics required by the spec are absent beyond document count. Unique term count, index byte size, build duration, and query latency are not exposed.

## Cross-language comparison

| Area | Go | Rust | Node/TypeScript |
| --- | --- | --- | --- |
| Tokenizer | Unicode letter/digit scan with stop words. | Unicode alphanumeric split with stop words. | ASCII regex split with stop words. |
| Index | Mutex-protected `map[string][]Posting`. | Owned `HashMap<String, Vec<Posting>>`. | `Map<string, Posting[]>`. |
| Ranking | TF-IDF-like score. | TF-IDF-like score. | TF-IDF-like score. |
| API | stdlib HTTP with `/health`, `/index`, `/search`. | Manual TCP HTTP handling. | Node `http` server. |
| Tests | Broadest HTTP coverage. | Core library coverage. | Pure unit coverage. |
| Main advantage | Cleanest module separation and concurrency guard. | Simple ownership model for index mutation. | Smallest pure TypeScript search core. |
| Main gap | No positions/update/persistence/BM25. | No positions/update/persistence/BM25; fragile HTTP. | No Unicode positions/update/persistence/BM25. |

## Overall assessment

All three implementations are minimal inverted-index and TF-IDF baselines, useful for teaching the first step of information retrieval. They are not yet capstone-complete search engines because advanced retrieval semantics, stable external document IDs, index mutation correctness, persistence, autocomplete, metrics, and benchmark evidence are missing. Go is the most production-shaped skeleton, Rust is the leanest library model, and Node is the easiest implementation to extend with parser/ranking tests.
