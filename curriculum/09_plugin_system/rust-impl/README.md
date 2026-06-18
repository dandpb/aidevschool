# Plugin System — Rust

Rust implementation of Project 09. The host models plugin lifecycle and errors with enums, keeps plugin code behind a `PluginRuntime` trait object, and wraps lifecycle/hook calls in `std::panic::catch_unwind` so panics become plugin-scoped failures instead of host crashes.

Isolation tradeoff: trait objects plus `catch_unwind` protect the host from Rust panics but not arbitrary memory/process faults. A production untrusted-plugin boundary should move the same trait contract behind WASM or a subprocess.

## Run

```sh
cargo run
```

## Verify

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo llvm-cov --fail-under-lines 80
```

## Docker

```sh
docker build -t plugin-system-rust .
docker run --rm plugin-system-rust
```
