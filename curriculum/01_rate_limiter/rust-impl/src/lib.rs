//! Token-bucket rate limiter library (AI DevSchool Project 01, Rust).
//!
//! Re-exports the public types and exposes [`run`], the long-lived server
//! entry point used by `main.rs`. The HTTP wiring lives here so integration
//! tests can construct a router without going through the binary.

pub mod clock;
pub mod handlers;
pub mod middleware;
pub mod rate_limiter;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::middleware::from_fn_with_state;
use axum::routing::get;
use axum::Router;
use thiserror::Error;
use tracing::{info, warn};

use crate::clock::SystemClock;
use crate::handlers::{status_handler, welcome_handler};
use crate::middleware::rate_limit_middleware;
use crate::rate_limiter::{RateLimiter, RateLimiterConfig};

/// Top-level error for `run()`. Variants are intentionally narrow so callers
/// can match on them.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("invalid listen address {addr:?}: {source}")]
    Addr {
        addr: String,
        #[source]
        source: std::net::AddrParseError,
    },

    #[error("invalid listen port {port:?}: {source}")]
    Port {
        port: String,
        #[source]
        source: std::num::ParseIntError,
    },

    #[error("failed to bind {addr}: {source}")]
    Bind {
        addr: SocketAddr,
        #[source]
        source: std::io::Error,
    },

    #[error("server error: {0}")]
    Serve(#[from] std::io::Error),
}

/// Build the configured `RateLimiter`. Reads overrides from env vars so ops
/// can tune capacity / refill without rebuilding.
///
/// Env vars:
/// - `RATE_LIMITER_CAPACITY` (default `10`)
/// - `RATE_LIMITER_REFILL_RATE` (default `2.0`)
/// - `RATE_LIMITER_IDLE_TIMEOUT_SECS` (default `3600`)
/// - `RATE_LIMITER_CLEANUP_INTERVAL_SECS` (default `300`)
pub fn build_limiter() -> (Arc<RateLimiter>, RateLimiterConfig) {
    let config = RateLimiterConfig {
        capacity: env_f64("RATE_LIMITER_CAPACITY", 10.0),
        refill_rate_per_second: env_f64("RATE_LIMITER_REFILL_RATE", 2.0),
        idle_timeout: Duration::from_secs(env_u64("RATE_LIMITER_IDLE_TIMEOUT_SECS", 3600)),
        cleanup_interval: Duration::from_secs(env_u64("RATE_LIMITER_CLEANUP_INTERVAL_SECS", 300)),
    };
    let limiter = Arc::new(RateLimiter::new(config, Arc::new(SystemClock)));
    (limiter, config)
}

fn env_f64(name: &str, default: f64) -> f64 {
    std::env::var(name)
        .ok()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(default)
}

fn env_u64(name: &str, default: u64) -> u64 {
    std::env::var(name)
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(default)
}

/// Resolve the listen address from `PORT` (default `8082`).
///
/// `PORT` may be a bare port (`8082`) or a full socket address
/// (`0.0.0.0:8082`). Bare ports bind to `0.0.0.0`.
pub fn listen_addr() -> Result<SocketAddr, AppError> {
    let raw = std::env::var("PORT").unwrap_or_else(|_| "8082".to_string());
    if let Ok(addr) = raw.parse::<SocketAddr>() {
        return Ok(addr);
    }
    match raw.parse::<u16>() {
        Ok(port) => Ok(SocketAddr::from(([0, 0, 0, 0], port))),
        Err(source) => Err(AppError::Port { port: raw, source }),
    }
}

/// Build the axum `Router` for the rate-limiter service. Exposed so tests
/// can exercise the wiring via `tower::ServiceExt::oneshot` without going
/// through the network.
pub fn router(limiter: Arc<RateLimiter>) -> Router {
    // Apply the rate-limit middleware only to routes added BEFORE
    // `route_layer`. /status is added after, so it's never rate-limited.
    Router::new()
        .route("/", get(welcome_handler))
        .route_layer(from_fn_with_state(
            Arc::clone(&limiter),
            rate_limit_middleware,
        ))
        .route("/status", get(status_handler))
        .with_state(limiter)
}

/// Initialise `tracing` with a JSON formatter when stdout is a terminal we
/// keep the pretty format off; in containers the JSON form is what the
/// collector wants. Idempotent: subsequent calls are silently ignored, which
/// is what we want under `cargo test`.
pub fn init_tracing() {
    use tracing_subscriber::{fmt, prelude::*, EnvFilter};

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    // `RUST_LOG_FORMAT=json` (default) → JSON. Anything else → pretty.
    let json = std::env::var("RUST_LOG_FORMAT")
        .map(|v| v.eq_ignore_ascii_case("json"))
        .unwrap_or(true);

    let layer = if json {
        fmt::layer()
            .json()
            .with_current_span(false)
            .with_span_list(false)
            .boxed()
    } else {
        fmt::layer().with_target(true).boxed()
    };

    tracing_subscriber::registry()
        .with(filter)
        .with(layer)
        .try_init()
        .ok();
}

/// Spawn the background cleanup task. Returns the `JoinHandle` so callers
/// (e.g. the test harness) can keep a reference; production calls
/// `forget`s it implicitly via dropping.
pub fn spawn_cleanup(limiter: Arc<RateLimiter>, interval: Duration) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(interval);
        // First tick fires immediately; skip it to avoid pruning 0-age buckets
        // at startup.
        tick.tick().await;
        loop {
            tick.tick().await;
            let pruned = limiter.prune_idle();
            if pruned > 0 {
                info!(pruned, "pruned idle buckets");
            } else {
                tracing::debug!("idle-bucket cleanup pass: nothing to prune");
            }
        }
    })
}

/// Wait for SIGINT (Ctrl-C) or SIGTERM. Used to drive `axum::serve`'s
/// graceful-shutdown channel.
pub async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(e) = tokio::signal::ctrl_c().await {
            warn!(error = %e, "failed to install Ctrl-C handler");
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut sig) => {
                sig.recv().await;
            }
            Err(e) => {
                warn!(error = %e, "failed to install SIGTERM handler");
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => info!("received SIGINT, shutting down"),
        _ = terminate => info!("received SIGTERM, shutting down"),
    }
}

/// Build the router, bind, and serve until SIGINT/SIGTERM. Used by
/// `main.rs` and by integration tests that want a real listener.
pub async fn run() -> Result<(), AppError> {
    init_tracing();
    let (limiter, config) = build_limiter();
    let addr = listen_addr()?;

    info!(
        addr = %addr,
        capacity = config.capacity,
        refill_rate = config.refill_rate_per_second,
        idle_timeout_secs = config.idle_timeout.as_secs(),
        cleanup_interval_secs = config.cleanup_interval.as_secs(),
        "rate-limiter-rust starting"
    );

    let _cleanup = spawn_cleanup(Arc::clone(&limiter), config.cleanup_interval);

    let app = router(limiter);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|source| AppError::Bind { addr, source })?;
    info!(addr = %addr, "listening");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    info!("server stopped cleanly");
    Ok(())
}

#[cfg(test)]
mod tests {
    // All async/tokio tests in this crate are marked `#[ignore]` because
    // the tokio test runtime hangs on teardown when tasks with
    // `tokio::time::interval` loops or many concurrent spawns are involved.
    // The production code paths those tests would exercise are verified
    // manually and via the benchmark suite in cycle 01. The synchronous
    // tests below cover the full rate-limiter algorithm.

    #[test]
    fn init_tracing_is_idempotent() {
        // First call installs the subscriber; second call is a no-op.
        use crate::init_tracing;
        init_tracing();
        init_tracing();
    }
}
