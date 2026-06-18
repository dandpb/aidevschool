# Evolution Report — Project 07 · REST API with Auth

> Phase: **cycle-complete**
> Focus: one bottleneck and one optimization suggestion per implementation language.

## Go

- **Bottleneck:** Refresh-token rotation uses separate lookup, status check, mutation, and save operations over cloned session records. This is easy to test but not safe under concurrent refresh attempts.
- **Optimization suggestion:** Add an atomic repository method for refresh rotation. Under a single lock or database transaction, find the token hash, verify active/expiry state, mark the old session rotated/replayed, and create the child session. Then add a race-style test with two simultaneous refresh calls.

## Node/TypeScript

- **Bottleneck:** Password hashing and verification use `pbkdf2Sync`, which blocks the Node event loop during registration and login.
- **Optimization suggestion:** Replace synchronous hashing with async `crypto.pbkdf2`, an async Argon2 binding, or a worker-thread-backed hasher. Keep the `PasswordHasher` interface so tests can inject low-cost settings while production uses safer cost parameters.

## Rust

- **Bottleneck:** No Rust implementation is present under `07_rest_api_auth/` in this repo snapshot, so the architecture comparison cannot yet include Rust's trait/extractor model.
- **Optimization suggestion:** If Rust is added, start with an Axum router, typed extractors for authenticated principals, enum-backed roles/status/audit actions, and trait-based repositories/token/password/audit services. Make refresh rotation a repository transaction from the first version.

## Cross-Language Evolution Theme

The next evolution is about turning **feature-complete auth flows** into **security-robust auth flows**. The highest-value work is not more endpoints; it is atomic refresh rotation, vetted password hashing, complete JWT negative tests, and benchmark evidence for middleware latency.
