# Code Review — Project 09 Plugin System

## Review scope

Reviewed `docs/spec.md` plus the Go, Rust, and Node/TypeScript source, tests, README files, and Node dynamic plugin fixture. This review focuses on extension-boundary architecture, lifecycle correctness, and isolation trade-offs.

## 1. Specification and contract coverage

| Severity | Finding |
| --- | --- |
| Low | All three implementations cover manifest registration, API version negotiation, lifecycle transitions, hook registration/dispatch, enable-disable behavior, capability grants/denials, plugin-scoped errors, metrics, and health. |
| Medium | The spec includes unregister/delete, persistent registry restart behavior, hook modes beyond sequential, timeout enforcement, memory budgets, and resource cleanup. The implementations model these concepts partially but do not fully execute them. |
| Medium | Rust currently exposes a library/CLI health surface rather than the HTTP management API implemented by Node and Go. It is still implementation-complete for the core host model, but not API-complete against RF-004. |

## 2. Manifest-first registry and compatibility design

| Severity | Finding |
| --- | --- |
| Low | Manifest validation happens before runtime execution in all languages, which matches the spec’s safest design decision. |
| Medium | API version negotiation is a simple string-contains check for `>=1.0.0 <2.0.0`. This is enough for a learning contract but not a real SemVer range evaluator. |
| Low | Registry records include lifecycle state, enabled flag, hooks, capability grants, sandbox descriptor, last error, and metrics, making the extension boundary inspectable. |

## 3. Lifecycle state machine

| Severity | Finding |
| --- | --- |
| Low | `load -> init -> start -> stop -> unload` is enforced consistently; invalid transitions such as `start` before `init` fail without state advancement. |
| Low | Repeated `stop` is idempotent for stopped plugins in Go/Rust and allowed by the Node transition table. |
| Medium | Failed plugins remain failed without quarantine, retry, or forced cleanup states. The spec’s richer `stopping`, `unloading`, `quarantined`, and timeout outcomes are not represented. |

## 4. Capability and sandbox boundaries

| Severity | Finding |
| --- | --- |
| Low | Capabilities are declared up front, converted into grants, and denied with audit events when undeclared. |
| High | Isolation is deliberately lightweight: Node uses dynamic import plus try/catch, Go uses in-process interfaces plus `recover`, and Rust uses trait objects plus `catch_unwind`. These protect against normal errors/panics but not malicious filesystem/process/memory access. |
| Medium | Sandbox descriptors document memory/network/filesystem policies, but those policies are descriptive rather than enforced. |

## 5. Hook dispatch and extension semantics

| Severity | Finding |
| --- | --- |
| Low | Hook subscribers are filtered to running/enabled plugins and sorted by priority then plugin ID, satisfying deterministic ordering. |
| Medium | Dispatch is sequential only. The spec also models parallel, first-success, and veto/decision hooks; tests focus on event/transform-style hooks. |
| Medium | Hook payload/result schemas are not validated at runtime, so malformed plugin output becomes accepted final payload rather than `hook_failed`. |

## 6. Failure isolation, timeouts, and observability

| Severity | Finding |
| --- | --- |
| Low | Plugin crashes/panics/exceptions during lifecycle or hooks become plugin-scoped errors, increment metrics, and leave the host healthy. |
| High | Per-plugin lifecycle and hook timeouts are not enforced despite being central to RF-011/RNF-006. Contexts are passed in Go, but no deadline wrapper is applied; Node and Rust also call directly. |
| Medium | Metrics cover lifecycle calls, hook calls, hook failures, crash counts, and duration. Timeout/resource metrics exist but are not driven by real enforcement. |

## 7. Maintainability, tests, and language fit

| Severity | Finding |
| --- | --- |
| Low | Tests exercise invalid manifests, compatibility rejection, transition ordering, hook ordering, crash isolation, disabled plugins, HTTP paths where present, and dynamic import in Node. |
| Medium | Node and Go expose HTTP APIs; Rust has strong domain modeling but no HTTP management layer, which weakens cross-language API parity. |
| Low | The code is intentionally compact and readable. It is well suited for teaching plugin architecture before introducing WASM/subprocess complexity. |

## Cross-language comparison

| Axis | Node/TypeScript | Go | Rust |
| --- | --- | --- | --- |
| Host contract | TypeScript interfaces and dynamic runtime validation. | `PluginRuntime` interface with context-aware methods. | `PluginRuntime` trait object with enum-heavy domain types. |
| Isolation strategy | Dynamic `import()` plus try/catch; Worker availability recorded. | In-process interface plus `recover()` around plugin calls. | Trait object plus `catch_unwind`. |
| API surface | Express management and hook API. | `net/http` management and hook API. | Library/CLI health only; no HTTP parity. |
| Failure handling | Exceptions become plugin `failed`/hook failed results. | Panics become plugin errors through `safeCall`. | Panics become `PluginErrorCode::Crash`. |
| Best fit | Fastest demonstration of dynamic plugins. | Clearest path to subprocess/RPC plugin isolation. | Strongest type model for lifecycle/errors, best WASM evolution target. |

## Overall assessment

Project 09 is cycle-complete as a compact plugin-system architecture exercise. The strongest teaching value is that all languages make the extension boundary explicit; the main limitation is that the current sandbox descriptors are promises, not enforcement. The next evolution should implement real timeout and process/WASM/worker isolation rather than adding more registry features first.
