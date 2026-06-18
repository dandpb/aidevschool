# Code Review: Project 02 Key-Value Store

## Scope

Reviewed the Project 02 specification and the Go, Rust, and Node implementations. This is a learning review: findings emphasize why implementation choices matter, not just whether code works.

## Severity Legend

- **Critical**: breaks a core contract or creates unacceptable risk.
- **Major**: likely to cause incorrect behavior, poor scalability, or drift from the spec.
- **Minor**: improves clarity, ergonomics, or robustness without changing the core design.
- **Educational**: useful teaching point rather than a required fix.

## 7-Category Review

### Security

- **Major**: The lab service is network-reachable by default in the implementations rather than strictly loopback-bound. That is acceptable for local experiments, but it matters pedagogically because even “toy” HTTP services teach deployment habits. If a learner exposes the process on a shared network, the unauthenticated key-value API becomes writable by anyone who can reach it.
- **Educational**: Authentication and TLS are intentionally out of scope. The important lesson is to document the trust boundary clearly: this is an in-memory teaching service, not a production data store.

### Performance

- **Major**: All three implementations rely on one central mutable store path. Go uses a global lock even for read-like commands, Rust uses a single `Mutex` around the whole state, and Node performs synchronous validation/cloning on the event loop. These choices keep the code teachable, but they serialize work that a real read-heavy key-value store would parallelize.
- **Educational**: The shared bottleneck is useful: learners can compare how each runtime expresses the same tradeoff between simple correctness and concurrent throughput.

### Readability

- **Minor**: The implementations are understandable and map well to the spec, but the density differs. Node has the cleanest split between store, server, and types. Go is clear but branch-heavy in the HTTP layer. Rust is explicit but dense because store, router, handlers, and tests live close together.

### Maintainability

- **Major**: Validation exists at both HTTP and store boundaries. That is defensible, but duplicated rules can drift. Key validation and TTL validation are especially sensitive because one route accepting a value another route rejects creates a confusing contract for learners.
- **Minor**: The project would benefit from a small contract table or shared test checklist that each language must satisfy.

### Idiomaticity

- **Minor**: Rust is the strongest on time semantics because it uses monotonic expiry concepts. Node is idiomatic Express/Zod TypeScript. Go uses straightforward `net/http` and fake-clock-friendly tests, but read paths could better use `RWMutex` read locks.
- **Educational**: Each solution shows an idiomatic “first pass” in its ecosystem rather than a highly tuned data-store architecture.

### Error Handling

- **Major**: Contract validation is not perfectly consistent. Some invalid-key paths are not rejected uniformly across GET/PERSIST/TTL-style routes, and the Go implementation treats explicit `ttlSeconds: 0` like no TTL instead of an invalid TTL. These are important because API clients learn the contract from behavior, not just from the spec.

### Testing

- **Minor**: Behavior coverage is strong: TTL, persistence, atomic batch behavior, capacity limits, HTTP envelopes, and invalid inputs are represented. The main missing evidence is benchmark/load validation for the non-functional latency and concurrency goals.
- **Educational**: The tests are good examples of executable specification, especially because atomic MSET and expiry are easy to get subtly wrong.

## Cross-Language Comparison

- **Go** emphasizes operational clarity: explicit store methods, HTTP handlers, fake clocks, and race-test-friendly concurrency. Its weakness is contract drift risk in manual validation and route handling.
- **Rust** emphasizes correctness shape: explicit errors, monotonic expiry, and type-guided state. Its weakness is that the single locked state keeps the implementation simple at the cost of parallelism.
- **Node** emphasizes fast iteration and readable validation: Express plus Zod gives compact HTTP code. Its weakness is that CPU-heavy cloning and validation run on the event loop, so hot-path work directly affects responsiveness.

## Issue Summary by Severity

### Critical

- None identified during this review.

### Major

- Public/default bind behavior widens the attack surface for an unauthenticated teaching API.
- Single global store paths limit concurrent read/write scalability.
- Validation drift across routes can make the API contract inconsistent.
- Go TTL handling accepts explicit zero TTL where the spec expects rejection.

### Minor

- Go and Rust files are denser than the Node split and would be harder to extend.
- Tests cover behavior well but do not yet prove load/benchmark targets.

### Educational

- The three implementations are useful contrasts in lock-based concurrency, type-driven correctness, and event-loop ergonomics.
