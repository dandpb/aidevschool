//! End-to-end tests that drive the full axum router through
//! `tower::ServiceExt::oneshot`. These exercise the middleware/handler
//! plumbing in addition to the rate-limiter core.

use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::body::{to_bytes, Body};
use axum::extract::ConnectInfo;
use axum::http::{Request, StatusCode};
use tower::ServiceExt;

use rate_limiter_rust::clock::MockClock;
use rate_limiter_rust::rate_limiter::{RateLimiter, RateLimiterConfig};
use rate_limiter_rust::router;

const MAX_BODY: usize = 4096;

/// Build a router whose `RateLimiter` is driven by a `MockClock` so the
/// tests don't have to sleep.
fn app_with_clock(clock: Arc<MockClock>) -> axum::Router {
    let limiter = Arc::new(RateLimiter::new(RateLimiterConfig::default(), clock));
    router(limiter)
}

fn ip(s: &str) -> IpAddr {
    s.parse().unwrap()
}

fn req_with_ip(uri: &str, addr: SocketAddr) -> Request<Body> {
    Request::builder()
        .uri(uri)
        .extension(ConnectInfo(addr))
        .body(Body::empty())
        .unwrap()
}

async fn body_json(resp: axum::response::Response) -> serde_json::Value {
    let bytes = to_bytes(resp.into_body(), MAX_BODY).await.unwrap();
    serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null)
}

#[tokio::test]
async fn welcome_returns_200_and_headers() {
    let app = app_with_clock(Arc::new(MockClock::new(Instant::now())));
    let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 8080);

    let resp = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(
        resp.headers().get("x-ratelimit-limit").unwrap(),
        "10",
        "X-RateLimit-Limit should be 10"
    );
    assert_eq!(resp.headers().get("x-ratelimit-remaining").unwrap(), "9");
    let reset: u64 = resp
        .headers()
        .get("x-ratelimit-reset")
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    assert!(
        reset >= now,
        "X-RateLimit-Reset should be at or after the current epoch second, got {reset} vs now {now}"
    );

    let json = body_json(resp).await;
    assert_eq!(
        json.get("message").and_then(|v| v.as_str()),
        Some("Welcome to the rate-limited endpoint!")
    );
}

#[tokio::test]
async fn eleventh_request_returns_429_with_retry_after() {
    let clock = Arc::new(MockClock::new(Instant::now()));
    let app = app_with_clock(clock.clone());
    let addr = SocketAddr::new(ip("203.0.113.7"), 9000);

    // 10 allowed
    for i in 0..10 {
        let resp = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
        assert_eq!(
            resp.status(),
            StatusCode::OK,
            "request {i} should have been allowed"
        );
    }

    // 11th must be 429
    let resp = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
    assert_eq!(resp.status(), StatusCode::TOO_MANY_REQUESTS);
    let retry_after = resp
        .headers()
        .get("retry-after")
        .expect("Retry-After must be set on 429")
        .to_str()
        .unwrap()
        .parse::<u64>()
        .unwrap();
    // capacity 10, refill 2/s, deficit = 1.0 → 0.5s, ceil → 1
    assert_eq!(retry_after, 1);
    let json = body_json(resp).await;
    assert_eq!(
        json.get("error").and_then(|v| v.as_str()),
        Some("Too Many Requests")
    );
    assert_eq!(
        json.get("retry_after_seconds").and_then(|v| v.as_u64()),
        Some(1)
    );
}

#[tokio::test]
async fn status_endpoint_is_not_rate_limited() {
    let app = app_with_clock(Arc::new(MockClock::new(Instant::now())));
    let addr = SocketAddr::new(ip("10.0.0.1"), 1234);

    // Hit / 10 times to drain the bucket
    for _ in 0..10 {
        let r = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
    }
    // 11th hits 429
    let r = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
    assert_eq!(r.status(), StatusCode::TOO_MANY_REQUESTS);

    // /status is never rate-limited and must not include rate-limit headers
    let r = app
        .clone()
        .oneshot(req_with_ip("/status", addr))
        .await
        .unwrap();
    assert_eq!(r.status(), StatusCode::OK);
    assert!(
        r.headers().get("x-ratelimit-remaining").is_none(),
        "/status must not include rate-limit headers"
    );
    let json = body_json(r).await;
    assert_eq!(
        json.get("client_ip").and_then(|v| v.as_str()),
        Some("10.0.0.1")
    );
    assert_eq!(json.get("max_capacity").and_then(|v| v.as_u64()), Some(10));
    assert_eq!(
        json.get("refill_rate_per_second").and_then(|v| v.as_f64()),
        Some(2.0)
    );
}

#[tokio::test]
async fn refill_under_mock_clock_lets_request_through() {
    let clock = Arc::new(MockClock::new(Instant::now()));
    let app = app_with_clock(clock.clone());
    let addr = SocketAddr::new(ip("10.0.0.2"), 1234);

    // Drain
    for _ in 0..10 {
        let r = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
    }
    // 11th denied
    let r = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
    assert_eq!(r.status(), StatusCode::TOO_MANY_REQUESTS);

    // Advance 1 s → 2 tokens refilled
    clock.advance(Duration::from_secs(1));
    let r1 = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
    assert_eq!(
        r1.status(),
        StatusCode::OK,
        "after 1s the bucket should refill"
    );
    let r2 = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
    assert_eq!(r2.status(), StatusCode::OK);
    let r3 = app.clone().oneshot(req_with_ip("/", addr)).await.unwrap();
    assert_eq!(
        r3.status(),
        StatusCode::TOO_MANY_REQUESTS,
        "third post-refill request should be denied again"
    );
}

#[tokio::test]
async fn different_ips_have_independent_buckets() {
    let app = app_with_clock(Arc::new(MockClock::new(Instant::now())));
    let a = SocketAddr::new(ip("10.0.0.1"), 1234);
    let b = SocketAddr::new(ip("10.0.0.2"), 1234);

    // Drain A
    for _ in 0..10 {
        let r = app.clone().oneshot(req_with_ip("/", a)).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
    }
    let r = app.clone().oneshot(req_with_ip("/", a)).await.unwrap();
    assert_eq!(r.status(), StatusCode::TOO_MANY_REQUESTS);

    // B unaffected
    let r = app.clone().oneshot(req_with_ip("/", b)).await.unwrap();
    assert_eq!(r.status(), StatusCode::OK);
}

#[tokio::test]
async fn idle_bucket_cleanup_via_router() {
    let start = Instant::now();
    let clock = Arc::new(MockClock::new(start));
    let cfg = RateLimiterConfig {
        idle_timeout: Duration::from_secs(60),
        ..RateLimiterConfig::default()
    };
    let limiter = Arc::new(RateLimiter::new(cfg, clock.clone()));
    let app = router(limiter.clone());

    let idle = SocketAddr::new(ip("10.0.0.1"), 1234);
    let active = SocketAddr::new(ip("10.0.0.2"), 1234);

    // First hit for both at T0
    let r = app.clone().oneshot(req_with_ip("/", idle)).await.unwrap();
    assert_eq!(r.status(), StatusCode::OK);
    let r = app.clone().oneshot(req_with_ip("/", active)).await.unwrap();
    assert_eq!(r.status(), StatusCode::OK);

    // Advance well past idle_timeout, then re-hit only the active IP
    clock.advance(Duration::from_secs(120));
    let r = app.clone().oneshot(req_with_ip("/", active)).await.unwrap();
    assert_eq!(r.status(), StatusCode::OK);

    let pruned = limiter.prune_idle();
    assert_eq!(pruned, 1);
    assert_eq!(limiter.bucket_count(), 1);
}
