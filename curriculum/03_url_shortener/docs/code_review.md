# Code Review: Project 03 URL Shortener

## Scope

Reviewed the Project 03 specification and the Go, Rust, and Node implementations. This review is pedagogical: it explains how each language teaches a different implementation style and where the code still diverges from production-grade behavior.

## Severity Legend

- **Critical**: breaks a core contract or creates unacceptable risk.
- **Major**: likely to cause incorrect behavior, poor scalability, or drift from the spec.
- **Minor**: improves clarity, ergonomics, or robustness without changing the core design.
- **Educational**: useful teaching point rather than a required fix.

## 7-Category Review

### Security

- **Major**: Client identity and analytics rely on request-derived network information such as forwarded IP headers. That is useful for a teaching rate limiter, but unsafe as a real trust boundary unless a trusted proxy sanitizes those headers.
- **Educational**: The project intentionally avoids auth and account ownership. The lesson should be explicit: rate limiting by client key is not access control.

### Performance

- **Major**: Redirect lookup is efficient, but listing/statistics paths copy and sort in-memory collections. Node also uses an unbounded analytics queue. These are acceptable at lab scale, but they show why “fast O(1) redirect” is only one part of a URL shortener’s performance profile.

### Readability

- **Minor**: Node is easiest to scan because core logic, server wiring, and startup are separated. Go and Rust are direct but concentrate more concerns into large files, which makes it harder for learners to isolate routing, storage, analytics, and rate limiting.

### Maintainability

- **Critical**: The spec expects persistence across restarts, but all three implementations are in-memory. That is the largest contract gap. It is not a small refactor: adding durability changes code generation, alias uniqueness, stats, deletion, expiry, and tests.
- **Major**: The same behavior is duplicated in three languages, so spec updates can drift unless parity tests or a shared checklist are maintained.

### Idiomaticity

- **Educational**: Go demonstrates standard-library HTTP control and simple synchronization. Rust demonstrates typed extractors and explicit error responses. Node demonstrates a clean pure-core plus Express adapter split.
- **Minor**: Node uses TypeScript assertions at request boundaries in places where runtime validation would be safer.

### Error Handling

- **Major**: Rust has the clearest error-to-response model. Go handles many cases well but can blur malformed JSON and invalid domain input. Node may map parser/runtime errors to generic storage errors, which weakens client feedback.

### Testing

- **Major**: Contract coverage is broad, but the hardest guarantees are not fully proven: restart durability, queue overflow behavior, and forced collision retry behavior. Without those tests, learners could mistake in-process success for full spec compliance.

## Cross-Language Comparison

- **Go** is the most operationally direct: one can trace handlers, storage, analytics, and shutdown with little framework knowledge. Its cost is manual route parsing and large-file coupling.
- **Rust** is the strongest on safety and explicit contracts: typed routes, explicit state, and structured errors make invariants visible. Its cost is a dense single-file implementation.
- **Node** is the most approachable: pure helpers plus Express make the domain easy to read. Its cost is weaker boundary safety and event-loop sensitivity.
- **All three** teach the same API from different runtime angles, but none is complete against the durability requirement.

## Issue Summary by Severity

### Critical

- Persistence across restarts is not implemented in any language, despite being a core URL-shortener requirement.

### Major

- Forwarded-header-based client identity is spoofable without a trusted proxy boundary.
- Listing/statistics paths scale poorly because they sort/copy full in-memory collections.
- Node analytics queue is unbounded.
- Error mapping is not equally precise across languages.
- Restart durability, queue overflow, and forced collision paths need stronger tests.

### Minor

- Go and Rust concentrate many responsibilities in one file.
- Node request typing should rely more on runtime validation than type assertions.

### Educational

- The three implementations form a useful comparison between explicit stdlib control, type-driven API design, and fast TypeScript iteration.
