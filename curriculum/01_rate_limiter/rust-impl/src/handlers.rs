//! HTTP handlers for the rate-limited `/` endpoint and the unrestricted
//! `/status` endpoint.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::{ConnectInfo, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::json;

use crate::rate_limiter::RateLimiter;

/// `GET /` — success body. The rate-limit middleware is responsible for
/// stamping `X-RateLimit-*` and short-circuiting on `429`.
pub async fn welcome_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({ "message": "Welcome to the rate-limited endpoint!" })),
    )
}

/// `GET /status` — read-only snapshot. Not rate-limited.
pub async fn status_handler(
    State(limiter): State<Arc<RateLimiter>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    let s = limiter.status(addr.ip());
    Json(json!({
        "client_ip": s.client_ip.to_string(),
        "tokens_remaining": s.tokens_remaining,
        "max_capacity": s.max_capacity,
        "refill_rate_per_second": s.refill_rate_per_second,
    }))
}
