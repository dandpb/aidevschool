//! axum middleware that enforces the token bucket on the rate-limited route.
//!
//! The middleware:
//!  1. Extracts the client IP from the [`ConnectInfo`] (provided by
//!     `into_make_service_with_connect_info` at serve time).
//!  2. Asks the [`RateLimiter`] for a [`Decision`].
//!  3. On allow: calls the inner handler, then stamps the three
//!     `X-RateLimit-*` headers on the response.
//!  4. On deny: short-circuits with `429`, a JSON body, and
//!     `X-RateLimit-*` + `Retry-After` headers.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderName, HeaderValue, Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

use crate::rate_limiter::{Decision, RateLimiter};

const HDR_LIMIT: HeaderName = HeaderName::from_static("x-ratelimit-limit");
const HDR_REMAINING: HeaderName = HeaderName::from_static("x-ratelimit-remaining");
const HDR_RESET: HeaderName = HeaderName::from_static("x-ratelimit-reset");
const HDR_RETRY_AFTER: HeaderName = HeaderName::from_static("retry-after");

/// axum middleware fn. Use with [`axum::middleware::from_fn_with_state`].
pub async fn rate_limit_middleware(
    State(limiter): State<Arc<RateLimiter>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let ip = addr.ip();
    match limiter.check(ip) {
        Decision::Allowed {
            remaining,
            limit,
            reset_epoch,
        } => {
            let mut response = next.run(req).await;
            stamp_headers(response.headers_mut(), limit, remaining, reset_epoch, None);
            response
        }
        Decision::Denied {
            remaining,
            limit,
            reset_epoch,
            retry_after,
        } => {
            let body = Json(json!({
                "error": "Too Many Requests",
                "retry_after_seconds": retry_after,
            }));
            let mut response = (StatusCode::TOO_MANY_REQUESTS, body).into_response();
            stamp_headers(
                response.headers_mut(),
                limit,
                remaining,
                reset_epoch,
                Some(retry_after),
            );
            response
        }
    }
}

fn stamp_headers(
    headers: &mut axum::http::HeaderMap,
    limit: u64,
    remaining: u64,
    reset_epoch: u64,
    retry_after: Option<u64>,
) {
    headers.insert(HDR_LIMIT, HeaderValue::from(limit));
    headers.insert(HDR_REMAINING, HeaderValue::from(remaining));
    headers.insert(HDR_RESET, HeaderValue::from(reset_epoch));
    if let Some(ra) = retry_after {
        headers.insert(HDR_RETRY_AFTER, HeaderValue::from(ra));
    }
}
