use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
    response::IntoResponse,
    routing::any,
    Router,
};
use load_balancer::{
    body_bytes, default_config, BackendConfig, CircuitState, HealthState, LoadBalancer,
    RoutingAlgorithm,
};
use std::net::SocketAddr;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
};
use tower::ServiceExt;

async fn test_backend(name: &'static str, health_status: StatusCode) -> String {
    let app = Router::new()
        .route("/health", any(move || async move { health_status }))
        .fallback(any(move |req: Request<Body>| async move {
            let marker = format!("{} {} {}", name, req.method(), req.uri());
            marker.into_response()
        }));
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind backend");
    let addr = listener.local_addr().expect("backend addr");
    tokio::spawn(async move {
        axum::serve(listener, app).await.expect("serve backend");
    });
    format!("http://{}", addr)
}

async fn http_request(
    addr: SocketAddr,
    method: &str,
    path: &str,
    extra_headers: &str,
    body: &str,
) -> String {
    let mut stream = TcpStream::connect(addr).await.expect("connect");
    let request = format!(
        "{method} {path} HTTP/1.1\r\nHost: {addr}\r\nConnection: close\r\nContent-Length: {}\r\n{extra_headers}\r\n{body}",
        body.len()
    );
    stream.write_all(request.as_bytes()).await.expect("write");
    let mut raw = Vec::new();
    stream.read_to_end(&mut raw).await.expect("read");
    let text = String::from_utf8(raw).expect("utf8");
    text.split("\r\n\r\n")
        .nth(1)
        .unwrap_or_default()
        .to_string()
}

#[tokio::test]
async fn round_robin_respects_weights() {
    let lb = LoadBalancer::new(default_config(vec![
        BackendConfig::new("a", "http://a", 2),
        BackendConfig::new("b", "http://b", 1),
    ]))
    .expect("lb");
    lb.mark_healthy("a").await;
    lb.mark_healthy("b").await;
    let ids = vec![
        lb.select_backend().await.unwrap().id,
        lb.select_backend().await.unwrap().id,
        lb.select_backend().await.unwrap().id,
    ];
    assert_eq!(ids, vec!["a", "a", "b"]);
}

#[tokio::test]
async fn least_connections_tie_breaks_by_backend_id_and_pool_changes_work() {
    let mut cfg = default_config(vec![
        BackendConfig::new("b", "http://b", 1),
        BackendConfig::new("a", "http://a", 1),
    ]);
    cfg.routing_algorithm = RoutingAlgorithm::LeastConnections;
    let lb = LoadBalancer::new(cfg).expect("lb");
    lb.mark_healthy("a").await;
    lb.mark_healthy("b").await;
    assert_eq!(lb.select_backend().await.unwrap().id, "a");
    lb.add_backend(BackendConfig::new("c", "http://c", 3))
        .await
        .expect("add");
    assert!(lb.remove_backend("b").await);
    assert_eq!(lb.snapshots().await.len(), 2);
    assert!(LoadBalancer::new(default_config(vec![])).is_err());
}

#[tokio::test]
async fn health_checks_open_backend_circuit() {
    let bad = test_backend("bad", StatusCode::INTERNAL_SERVER_ERROR).await;
    let mut cfg = default_config(vec![BackendConfig::new("bad", &bad, 1)]);
    cfg.failure_threshold = 1;
    cfg.unhealthy_threshold = 1;
    let lb = LoadBalancer::new(cfg).expect("lb");
    lb.check_backend("bad").await;
    let snapshot = lb.snapshots().await.remove(0);
    assert_eq!(snapshot.health, HealthState::Unhealthy);
    assert_eq!(snapshot.circuit_state, CircuitState::Open);
}

#[tokio::test]
async fn successful_health_check_marks_backend_healthy() {
    let ok = test_backend("ok", StatusCode::OK).await;
    let lb = LoadBalancer::new(default_config(vec![BackendConfig::new("ok", &ok, 1)])).expect("lb");
    lb.check_backend("ok").await;
    let snapshot = lb.snapshots().await.remove(0);
    assert_eq!(snapshot.health, HealthState::Healthy);
    assert_eq!(snapshot.circuit_state, CircuitState::Closed);
}

#[tokio::test]
async fn reverse_proxy_forwards_requests_and_reports_metrics() {
    let a = test_backend("a", StatusCode::OK).await;
    let b = test_backend("b", StatusCode::OK).await;
    let lb = LoadBalancer::new(default_config(vec![
        BackendConfig::new("a", &a, 1),
        BackendConfig::new("b", &b, 1),
    ]))
    .expect("lb");
    lb.mark_healthy("a").await;
    lb.mark_healthy("b").await;
    let app = lb.clone().router();
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind lb");
    let addr: SocketAddr = listener.local_addr().expect("lb addr");
    tokio::spawn(async move {
        axum::serve(listener, app).await.expect("serve lb");
    });
    let first = http_request(
        addr,
        "POST",
        "/demo?x=1",
        "x-request-id: req-rust\r\n",
        "body",
    )
    .await;
    let second = http_request(addr, "GET", "/demo?x=2", "", "").await;
    assert!(first.contains("a POST /demo?x=1"), "first body: {first}");
    assert!(second.contains("b GET /demo?x=2"), "second body: {second}");
    let health = http_request(addr, "GET", "/__lb/health", "", "").await;
    assert!(health.contains("ok"));
    let metrics = lb.metrics().await;
    assert_eq!(metrics.requests_total, 2);
    assert_eq!(metrics.backend_requests.get("a"), Some(&1));
    assert_eq!(metrics.backend_requests.get("b"), Some(&1));
}

#[tokio::test]
async fn json_error_when_no_backend_is_eligible() {
    let bad = test_backend("bad", StatusCode::INTERNAL_SERVER_ERROR).await;
    let mut cfg = default_config(vec![BackendConfig::new("bad", &bad, 1)]);
    cfg.failure_threshold = 1;
    cfg.unhealthy_threshold = 1;
    let lb = LoadBalancer::new(cfg).expect("lb");
    lb.check_backend("bad").await;
    let response = lb
        .router()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/demo")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body = String::from_utf8(body_bytes(response).await.to_vec()).expect("utf8");
    assert!(body.contains("no_eligible_backend"));
}

#[tokio::test]
async fn rejects_invalid_duplicate_and_missing_pool_changes() {
    assert!(LoadBalancer::new(default_config(vec![BackendConfig::new(
        "bad",
        "ftp://bad",
        1
    )]))
    .is_err());
    assert!(LoadBalancer::new(default_config(vec![BackendConfig::new(
        "zero",
        "http://zero",
        0
    )]))
    .is_err());
    let lb = LoadBalancer::new(default_config(vec![BackendConfig::new("a", "http://a", 1)]))
        .expect("lb");
    assert!(lb
        .add_backend(BackendConfig::new("a", "http://a2", 1))
        .await
        .is_err());
    assert!(!lb.remove_backend("missing").await);
}

#[tokio::test]
async fn admin_backends_and_metrics_routes_are_json() {
    let lb = LoadBalancer::new(default_config(vec![BackendConfig::new("a", "http://a", 1)]))
        .expect("lb");
    lb.mark_healthy("a").await;
    let app = lb.router();
    let backends = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/__lb/backends")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(backends.status(), StatusCode::OK);
    let backends_body = String::from_utf8(body_bytes(backends).await.to_vec()).expect("utf8");
    assert!(backends_body.contains("items"));
    let metrics = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/__lb/metrics")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(metrics.status(), StatusCode::OK);
    let metrics_body = String::from_utf8(body_bytes(metrics).await.to_vec()).expect("utf8");
    assert!(metrics_body.contains("requests_total"));
}
