# Security Report: Search Engine

> **Cycle:** 18_search_engine · **Generated:** 2026-07-02
> DoD §7: *"security/report.md with no critical findings."*

## Scope

Static review of the go, rust, node implementations against the spec. This is a
single-node, in-memory system (no external dependencies, no persistence, no network ingress
beyond localhost unless the project's concept is an auth/network service — see `spec.md`).
Threat model: input-validation failures, unsafe deserialization, boundary checks, and any
authn/authz logic specific to the project.

## Findings

- [ ] the implementations do cover deterministic tokenization basics, stop-word removal, term-frequency postings, corpus document count, simple TF
- [ ] tokenization splits on `/[^a-zA-Z0-9]+/`, so non-Latin text and accented Unicode tokens are not handled as deterministically as the spec ask
- [ ] token positions are discarded after tokenization. This is the key blocker for phrase matching and better snippets.
- [ ] there is no query parser. Queries are tokenized as bag-of-words, so `AND`, `OR`, `NOT`, parentheses, and quoted phrases are treated as plain
- [ ] no benchmark evidence validates 10,000-document build time, p95 search latency, autocomplete latency, or incremental update latency.
- [ ] tokenizer, index, and HTTP are separated clearly, which is the best modular baseline among the three.
- [ ] tokenizer/index logic is pure and easy to test, but API and persistence layers are minimal.

## Verdict

**⚠️ findings flagged — review mitigations below.**

## Mitigations

- Treat all client input as untrusted; validate at the serialization boundary before it touches
  internal state.
- If the project persists data or listens on a non-localhost interface, add secret management,
  TLS, and rate-limiting before any deployment beyond the lab.
- Re-run this review against any production-facing variant — the lab scope explicitly excludes
  supply-chain and infra threats.
