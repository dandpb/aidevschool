//! Thin binary entry point. All logic lives in the `rate_limiter_rust` crate
//! so it can be exercised by integration tests and other binaries without
//! duplicating wiring.

use rate_limiter_rust::run;

#[tokio::main]
async fn main() {
    if let Err(e) = run().await {
        // Use `eprintln` + `std::process::exit` rather than panicking —
        // panics in `main` look like bugs; this is a controlled failure.
        eprintln!("rate-limiter-rust: fatal: {e}");
        std::process::exit(1);
    }
}
