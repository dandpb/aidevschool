use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::routing::{get, post};
use axum::Router;
use log_aggregator_rust::*;
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn test_ingest_and_query() {
    let store = std::sync::Arc::new(LogStore::new(100));
    let app = Router::new()
        .route("/logs", post(ingest_handler).get(query_handler))
        .with_state(store.clone());

    let entry = json!({
        "log_id": "log1",
        "level": "error",
        "message": "test error",
        "source": {"service": "test"},
    });

    let req = Request::builder()
        .uri("/logs")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(entry.to_string()))
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    if status != StatusCode::ACCEPTED {
        panic!("unexpected status: {}, body: {}", status, String::from_utf8_lossy(&body));
    }

    let req = Request::builder()
        .uri("/logs?level=error")
        .method("GET")
        .body(Body::empty())
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    let status = resp.status();
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    if status != StatusCode::OK {
        panic!("query unexpected status: {}, body: {}", status, String::from_utf8_lossy(&body));
    }
}

#[tokio::test]
async fn test_ingest_invalid() {
    let store = std::sync::Arc::new(LogStore::new(100));
    let app = Router::new()
        .route("/logs", post(ingest_handler))
        .with_state(store);

    let req = Request::builder()
        .uri("/logs")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from("{}"))
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_health() {
    let store = std::sync::Arc::new(LogStore::new(100));
    let app = Router::new()
        .route("/health", get(health_handler))
        .with_state(store);

    let req = Request::builder()
        .uri("/health")
        .method("GET")
        .body(Body::empty())
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_metrics() {
    let store = std::sync::Arc::new(LogStore::new(100));
    let app = Router::new()
        .route("/metrics", get(metrics_handler))
        .with_state(store);

    let req = Request::builder()
        .uri("/metrics")
        .method("GET")
        .body(Body::empty())
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_trace() {
    let store = std::sync::Arc::new(LogStore::new(100));
    let app = Router::new()
        .route("/logs", post(ingest_handler))
        .route("/traces/:trace_id", get(trace_handler))
        .with_state(store.clone());

    let entry = json!({
        "log_id": "log1",
        "level": "info",
        "message": "test",
        "source": {"service": "test"},
        "trace_id": "trace1",
    });

    let req = Request::builder()
        .uri("/logs")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(entry.to_string()))
        .unwrap();
    let _resp = app.clone().oneshot(req).await.unwrap();

    let req = Request::builder()
        .uri("/traces/trace1")
        .method("GET")
        .body(Body::empty())
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}
