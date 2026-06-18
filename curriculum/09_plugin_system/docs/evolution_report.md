# Evolution Report — Project 09 Plugin System

## Current architecture baseline

All three implementations model a manifest-first plugin host with a registry, lifecycle state machine, capability grants, ordered hook dispatch, plugin-scoped errors, and metrics. The cycle intentionally keeps plugin execution in-process so learners can study the extension boundary before adding WASM/subprocess/worker complexity.

## Node/TypeScript

**Bottleneck:** Dynamic `import()` plus try/catch makes plugin loading ergonomic, but it is not a sandbox. A plugin module can still access process-level APIs if it chooses. Hook dispatch is sequential and direct, so slow or malicious plugins can monopolize the host without true cancellation.

**Optimization path:** Move `PluginRuntime` execution behind Worker Threads or child processes with an RPC envelope matching the current interface. Wrap lifecycle and hook calls with `AbortSignal` deadlines, worker termination, and per-plugin queues. Add runtime validation for hook payloads/results so invalid plugin output becomes a controlled `hook_failed` result.

## Go

**Bottleneck:** The Go host has the clearest path to concurrency, but current plugin calls are in-process interface calls protected only by `recover()`. `context.Context` is passed through the interface, yet the host does not enforce deadlines around plugin execution.

**Optimization path:** Preserve the `PluginRuntime` interface as a local adapter, then add a subprocess or WASM runtime that speaks JSON-RPC/gRPC over stdio or sockets. Use `context.WithTimeout` for every lifecycle and hook invocation, kill/recycle the subprocess on timeout, and persist registry state through a repository abstraction. Keep the mutex only around registry mutation, not plugin execution.

## Rust

**Bottleneck:** Rust has the strongest state/error modeling, but trait objects plus `catch_unwind` are still library-only isolation. The implementation also lacks the HTTP management API present in Node and Go, so cross-language behavior cannot yet be exercised through the same interface.

**Optimization path:** Add an Axum HTTP API matching the spec and the other implementations. Then move untrusted plugin execution behind WASM, using capability-scoped host imports and fuel/epoch interruption for timeouts where supported. Keep the current trait as the in-process trusted-plugin adapter and make the WASM adapter implement the same host-facing operations.

## Cross-language optimization priorities

1. Enforce lifecycle and hook timeouts before expanding feature breadth.
2. Replace descriptive sandbox records with actual Worker/subprocess/WASM boundaries.
3. Persist plugin registry state and normalize `running` plugins to `loaded` or `stopped` after restart.
4. Add hook schema validation for event, transformation, and validation/decision hook flows.
5. Bring Rust to HTTP API parity with Node and Go.

## Expected outcome after evolution

The next cycle should make the central comparison question measurable: Node should compare Worker/child-process ergonomics, Go should compare subprocess/RPC or WASM isolation with context deadlines, and Rust should compare trait ergonomics against WASM safety and typed host imports. The result should shift Project 09 from pattern-complete to safety-complete.
