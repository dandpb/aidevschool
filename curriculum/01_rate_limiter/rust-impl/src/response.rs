//! Centralizes the HTTP response contract for the rate-limited service.
//!
//! [`ResponseComposer`] owns the header names, the `429` body shape, and the
//! decoration of successful responses with `X-RateLimit-*` headers. Keeping
//! this in one place means the middleware and handlers never repeat header
//! names or JSON field names.

use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

use crate::rate_limiter::Decision;

const HDR_LIMIT: HeaderName = HeaderName::from_static("x-ratelimit-limit");
const HDR_REMAINING: HeaderName = HeaderName::from_static("x-ratelimit-remaining");
const HDR_RESET: HeaderName = HeaderName::from_static("x-ratelimit-reset");
const HDR_RETRY_AFTER: HeaderName = HeaderName::from_static("retry-after");

/// Stateless composer for all rate-limit HTTP responses.
///
/// The interface is intentionally tiny: given a [`Decision`], produce the
/// response that the spec requires. Callers do not need to know header names
/// or body field names.
#[derive(Debug, Clone, Copy, Default)]
pub struct ResponseComposer;

impl ResponseComposer {
    /// Create a new composer. The struct is stateless, so this is cheap.
    pub fn new() -> Self {
        Self
    }

    /// Decorate a successful inner response with the `X-RateLimit-*` headers.
    pub fn compose_allowed(&self, mut inner: Response, decision: Decision) -> Response {
        stamp_headers(inner.headers_mut(), &decision);
        inner
    }

    /// Build the `429 Too Many Requests` response, including the JSON body and
    /// `Retry-After` header.
    pub fn compose_denied(&self, decision: Decision) -> Response {
        let retry_after = decision.retry_after();
        let body = Json(json!({
            "error": "Too Many Requests",
            "retry_after_seconds": retry_after,
        }));

        let mut response = (StatusCode::TOO_MANY_REQUESTS, body).into_response();
        stamp_headers(response.headers_mut(), &decision);
        if let Some(ra) = retry_after {
            response
                .headers_mut()
                .insert(HDR_RETRY_AFTER, HeaderValue::from(ra));
        }
        response
    }
}

fn stamp_headers(headers: &mut HeaderMap, decision: &Decision) {
    headers.insert(HDR_LIMIT, HeaderValue::from(decision.limit()));
    headers.insert(HDR_REMAINING, HeaderValue::from(decision.remaining()));
    headers.insert(HDR_RESET, HeaderValue::from(decision.reset_epoch()));
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::response::Response;

    fn sample_allowed() -> Decision {
        Decision::Allowed {
            remaining: 7,
            limit: 10,
            reset_epoch: 1_234_567_890,
        }
    }

    fn sample_denied() -> Decision {
        Decision::Denied {
            remaining: 0,
            limit: 10,
            reset_epoch: 1_234_567_890,
            retry_after: 3,
        }
    }

    #[test]
    fn compose_allowed_adds_rate_limit_headers() {
        let composer = ResponseComposer::new();
        let inner = Response::new(Body::empty());
        let response = composer.compose_allowed(inner, sample_allowed());

        assert_eq!(response.headers().get("x-ratelimit-limit").unwrap(), "10");
        assert_eq!(
            response.headers().get("x-ratelimit-remaining").unwrap(),
            "7"
        );
        assert_eq!(
            response.headers().get("x-ratelimit-reset").unwrap(),
            "1234567890"
        );
        assert!(
            response.headers().get("retry-after").is_none(),
            "allowed responses must not include Retry-After"
        );
    }

    #[test]
    fn compose_denied_returns_429_with_body_and_headers() {
        let composer = ResponseComposer::new();
        let response = composer.compose_denied(sample_denied());

        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(response.headers().get("x-ratelimit-limit").unwrap(), "10");
        assert_eq!(
            response.headers().get("x-ratelimit-remaining").unwrap(),
            "0"
        );
        assert_eq!(
            response.headers().get("x-ratelimit-reset").unwrap(),
            "1234567890"
        );
        assert_eq!(response.headers().get("retry-after").unwrap(), "3");
    }
}
