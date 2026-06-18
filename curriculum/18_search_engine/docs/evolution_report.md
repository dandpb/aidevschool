# Evolution Report — Search Engine

## Summary

The three implementations currently share the same core: tokenize text, build term-frequency postings, and score candidate documents with a TF-IDF-like formula. The next evolution is to preserve positions, accept stable document IDs, support incremental replacement/deletion, and introduce BM25 plus a parser-backed query planner.

## Go bottleneck and optimization

- **Identified bottleneck:** broad queries build a score map for every matching document and then sort the full result set, even when the client only asks for top-k results.
- **Suggested optimization:** maintain postings sorted by stable document ID and use a bounded min-heap for top-k ranking. Add deterministic tie-breaking by document ID after score comparison.
- **Before benchmark placeholder:** top-10 latency for a common-term query over 10,000 documents — pending benchmark.
- **After benchmark placeholder:** top-10 latency after bounded heap retrieval — pending benchmark.

## Rust bottleneck and optimization

- **Identified bottleneck:** index mutations and query evaluation are simple and ownership-friendly, but postings lack positions and stable external document IDs, so phrase/replace/delete support would require rebuilding large structures.
- **Suggested optimization:** change postings to include `{document_id: String, term_frequency, positions, document_version}` and store a reverse term map per document. This enables atomic replace/delete without full index rebuilds.
- **Before benchmark placeholder:** single-document replace latency and phrase-query feasibility — pending benchmark.
- **After benchmark placeholder:** single-document replace latency and phrase-query latency after positional postings — pending benchmark.

## Node/TypeScript bottleneck and optimization

- **Identified bottleneck:** tokenization is ASCII-only and the event-loop search path scores/sorts all candidates synchronously, so large indexes or common-term queries can block API responsiveness.
- **Suggested optimization:** switch to Unicode-aware token iteration, keep postings with positions, and use a bounded top-k heap. For large corpora, move expensive index builds or broad queries to worker threads while keeping the pure index API testable.
- **Before benchmark placeholder:** event-loop delay and top-10 query latency on broad queries — pending benchmark.
- **After benchmark placeholder:** event-loop delay and top-10 query latency after Unicode tokenizer + heap/worker strategy — pending benchmark.

## Next evolution target

Implement a positional inverted-index contract in all three languages: stable client document ID, document version, token positions, reverse index for deletion, term statistics, and a BM25 scorer. That unlocks phrase search, atomic replacement, deletion cleanup, snippets, and fair ranking benchmarks.
