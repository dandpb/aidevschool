use api_gateway_rust::*;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tower::ServiceExt;

#[tokio::test]
async fn test_circuit_breaker_transitions() {
    let policy = CircuitBreakerPolicy {
        window_ms: 10000,
        minimum_requests: 5,
        failure_rate_threshold: 0.5,
        open_cooldown_ms: 100,
        half_open_max_probes: 2,
        half_open_successes_to_close: 2,
    };
    let cb = CircuitBreaker::new(policy);

    assert!(cb.allow().await);

    for _ in 0..5 {
        cb.record_failure().await;
    }

    assert!(!cb.allow().await);

    sleep(Duration::from_millis(150)).await;

    assert!(cb.allow().await);
    cb.record_success().await;

    assert!(cb.allow().await);
    cb.record_success().await;

    assert!(cb.allow().await);
    let snap = cb.snapshot().await;
    assert_eq!(snap.state, "closed");
}

#[tokio::test]
async fn test_circuit_breaker_half_open_failure_reopens() {
    let policy = CircuitBreakerPolicy {
        window_ms: 10000,
        minimum_requests: 1,
        failure_rate_threshold: 0.5,
        open_cooldown_ms: 50,
        half_open_max_probes: 1,
        half_open_successes_to_close: 1,
    };
    let cb = CircuitBreaker::new(policy);
    cb.record_failure().await;

    sleep(Duration::from_millis(60)).await;
    assert!(cb.allow().await);
    cb.record_failure().await;

    assert!(!cb.allow().await);
}

#[tokio::test]
async fn test_bulkhead_acquire_release() {
    let bh = Bulkhead::new(2);
    assert!(bh.acquire().await);
    assert!(bh.acquire().await);
    assert!(!bh.acquire().await);
    bh.release().await;
    assert!(bh.acquire().await);
}

#[tokio::test]
async fn test_tenant_limiter() {
    let tl = TenantLimiter::new(2, 1.0);
    assert!(tl.allow("t1").await);
    assert!(tl.allow("t1").await);
    assert!(!tl.allow("t1").await);
    assert!(tl.allow("t2").await);
}

#[tokio::test]
async fn test_gateway_match_route() {
    let config = Config {
        routes: vec![
            RouteConfig {
                id: "orders".to_string(),
                path_prefix: "/api/orders".to_string(),
                upstream_url: "http://127.0.0.1:9001".to_string(),
                timeout_ms: 250,
                retry: RetryPolicy {
                    max_attempts: 3,
                    base_delay_ms: 10,
                    max_delay_ms: 100,
                    retryable_methods: vec!["GET".to_string()],
                    retryable_statuses: vec![502, 503, 504],
                },
                circuit_breaker: CircuitBreakerPolicy {
                    window_ms: 10000,
                    minimum_requests: 20,
                    failure_rate_threshold: 0.5,
                    open_cooldown_ms: 5000,
                    half_open_max_probes: 3,
                    half_open_successes_to_close: 3,
                },
                fallback: None,
                bulkhead: BulkheadPolicy { max_concurrency: 64 },
                tenant_limit: TenantLimitPolicy { capacity: 120, refill_per_second: 20.0 },
            },
            RouteConfig {
                id: "users".to_string(),
                path_prefix: "/api/users".to_string(),
                upstream_url: "http://127.0.0.1:9002".to_string(),
                timeout_ms: 250,
                retry: RetryPolicy {
                    max_attempts: 3,
                    base_delay_ms: 10,
                    max_delay_ms: 100,
                    retryable_methods: vec!["GET".to_string()],
                    retryable_statuses: vec![502, 503, 504],
                },
                circuit_breaker: CircuitBreakerPolicy {
                    window_ms: 10000,
                    minimum_requests: 20,
                    failure_rate_threshold: 0.5,
                    open_cooldown_ms: 5000,
                    half_open_max_probes: 3,
                    half_open_successes_to_close: 3,
                },
                fallback: None,
                bulkhead: BulkheadPolicy { max_concurrency: 64 },
                tenant_limit: TenantLimitPolicy { capacity: 120, refill_per_second: 20.0 },
            },
        ],
        port: 8080,
    };
    let gw = Gateway::new(config);
    assert!(gw.match_route("/api/orders/123").is_some());
    assert!(gw.match_route("/api/users").is_some());
    assert!(gw.match_route("/unknown").is_none());
}

#[tokio::test]
async fn test_gateway_unknown_route() {
    let config = Config::default();
    let gw = Arc::new(Gateway::new(config));
    let app = router(gw);

    let req = Request::builder().uri("/unknown").body(Body::empty()).unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_gateway_status_endpoint() {
    let config = Config::default();
    let gw = Arc::new(Gateway::new(config));
    let app = router(gw);

    let req = Request::builder().uri("/_gateway/status").body(Body::empty()).unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_gateway_metrics_endpoint() {
    let config = Config::default();
    let gw = Arc::new(Gateway::new(config));
    let app = router(gw);

    let req = Request::builder().uri("/_gateway/metrics").body(Body::empty()).unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_gateway_tenant_rate_limit() {
    let config = Config {
        routes: vec![RouteConfig {
            id: "test".to_string(),
            path_prefix: "/api/test".to_string(),
            upstream_url: "http://127.0.0.1:9999".to_string(),
            timeout_ms: 1000,
            retry: RetryPolicy {
                max_attempts: 3,
                base_delay_ms: 10,
                max_delay_ms: 100,
                retryable_methods: vec!["GET".to_string()],
                retryable_statuses: vec![502, 503, 504],
            },
            circuit_breaker: CircuitBreakerPolicy {
                window_ms: 10000,
                minimum_requests: 10,
                failure_rate_threshold: 0.5,
                open_cooldown_ms: 100,
                half_open_max_probes: 1,
                half_open_successes_to_close: 1,
            },
            fallback: None,
            bulkhead: BulkheadPolicy { max_concurrency: 10 },
            tenant_limit: TenantLimitPolicy { capacity: 1, refill_per_second: 1.0 },
        }],
        port: 8080,
    };
    let gw = Arc::new(Gateway::new(config));
    let app = router(gw);

    let req1 = Request::builder()
        .uri("/api/test")
        .header("X-Tenant-ID", "tenant1")
        .body(Body::empty())
        .unwrap();
    let _resp1 = app.clone().oneshot(req1).await.unwrap();

    let req2 = Request::builder()
        .uri("/api/test")
        .header("X-Tenant-ID", "tenant1")
        .body(Body::empty())
        .unwrap();
    let resp2 = app.oneshot(req2).await.unwrap();

    assert_eq!(resp2.status(), StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
async fn test_gateway_circuit_open_fallback() {
    let config = Config {
        routes: vec![RouteConfig {
            id: "test".to_string(),
            path_prefix: "/api/test".to_string(),
            upstream_url: "http://127.0.0.1:9999".to_string(),
            timeout_ms: 1000,
            retry: RetryPolicy {
                max_attempts: 3,
                base_delay_ms: 10,
                max_delay_ms: 100,
                retryable_methods: vec!["GET".to_string()],
                retryable_statuses: vec![502, 503, 504],
            },
            circuit_breaker: CircuitBreakerPolicy {
                window_ms: 10000,
                minimum_requests: 1,
                failure_rate_threshold: 0.1,
                open_cooldown_ms: 5000,
                half_open_max_probes: 1,
                half_open_successes_to_close: 1,
            },
            fallback: Some(FallbackPolicy {
                status: 503,
                body: serde_json::json!({"error": "fallback"}),
                headers: std::collections::HashMap::new(),
            }),
            bulkhead: BulkheadPolicy { max_concurrency: 10 },
            tenant_limit: TenantLimitPolicy { capacity: 100, refill_per_second: 100.0 },
        }],
        port: 8080,
    };
    let gw = Arc::new(Gateway::new(config));
    let cb = gw.circuits.get("test").unwrap().clone();
    cb.record_failure().await;

    let app = router(gw);
    let req = Request::builder().uri("/api/test").body(Body::empty()).unwrap();
    let resp = app.oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn test_gateway_bulkhead_full() {
    let config = Config {
        routes: vec![RouteConfig {
            id: "test".to_string(),
            path_prefix: "/api/test".to_string(),
            upstream_url: "http://127.0.0.1:9999".to_string(),
            timeout_ms: 1000,
            retry: RetryPolicy {
                max_attempts: 3,
                base_delay_ms: 10,
                max_delay_ms: 100,
                retryable_methods: vec!["GET".to_string()],
                retryable_statuses: vec![502, 503, 504],
            },
            circuit_breaker: CircuitBreakerPolicy {
                window_ms: 10000,
                minimum_requests: 10,
                failure_rate_threshold: 0.5,
                open_cooldown_ms: 100,
                half_open_max_probes: 1,
                half_open_successes_to_close: 1,
            },
            fallback: None,
            bulkhead: BulkheadPolicy { max_concurrency: 0 },
            tenant_limit: TenantLimitPolicy { capacity: 100, refill_per_second: 100.0 },
        }],
        port: 8080,
    };
    let gw = Arc::new(Gateway::new(config));
    let app = router(gw);

    let req = Request::builder().uri("/api/test").body(Body::empty()).unwrap();
    let resp = app.oneshot(req).await.unwrap();

    assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn test_default_config() {
    let config = Config::default();
    assert_eq!(config.port, 8080);
    assert_eq!(config.routes.len(), 1);
    assert_eq!(config.routes[0].id, "orders");
}
