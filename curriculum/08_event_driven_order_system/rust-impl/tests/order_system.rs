use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use event_driven_order_rust::{fold, router, AppState, EventType, OrderItem, OrderStatus};
use serde_json::json;
use tower::ServiceExt;

#[test]
fn create_order_appends_publishes_projects_and_is_idempotent() {
    let state = AppState::default();
    let result = state
        .create_order(
            "cust_1".into(),
            "create-key".into(),
            vec![OrderItem {
                sku: "SKU".into(),
                quantity: 2,
                unit_price_cents: 500,
            }],
        )
        .unwrap();
    assert_eq!(result.status, OrderStatus::Pending);
    assert_eq!(state.events_for(&result.order_id).len(), 1);
    assert_eq!(state.summary(&result.order_id).unwrap().total_cents, 1000);
    let repeated = state
        .create_order(
            "cust_1".into(),
            "create-key".into(),
            vec![OrderItem {
                sku: "SKU".into(),
                quantity: 2,
                unit_price_cents: 500,
            }],
        )
        .unwrap();
    assert_eq!(repeated.order_id, result.order_id);
    assert_eq!(state.events_for(&result.order_id).len(), 1);
}

#[test]
fn invalid_commands_conflicts_and_transitions_do_not_append() {
    let state = AppState::default();
    assert!(state
        .create_order("cust".into(), "bad".into(), vec![])
        .is_err());
    let result = state
        .create_order(
            "cust".into(),
            "create".into(),
            vec![OrderItem {
                sku: "S".into(),
                quantity: 1,
                unit_price_cents: 1,
            }],
        )
        .unwrap();
    assert_eq!(
        state
            .authorize_payment(
                result.order_id.clone(),
                "pay".into(),
                true,
                "".into(),
                "pay".into(),
                Some(0)
            )
            .unwrap_err()
            .code,
        "concurrency_conflict"
    );
    assert_eq!(
        state
            .ship(
                result.order_id.clone(),
                "ship".into(),
                "ups".into(),
                "ship".into(),
                None
            )
            .unwrap_err()
            .code,
        "invalid_transition"
    );
    assert_eq!(state.events_for(&result.order_id).len(), 1);
}

#[test]
fn saga_confirms_and_cancels_idempotently() {
    let state = AppState::default();
    let result = state
        .create_order(
            "cust".into(),
            "create".into(),
            vec![OrderItem {
                sku: "S".into(),
                quantity: 1,
                unit_price_cents: 1,
            }],
        )
        .unwrap();
    state
        .authorize_payment(
            result.order_id.clone(),
            "pay".into(),
            true,
            "".into(),
            "pay".into(),
            None,
        )
        .unwrap();
    state
        .reserve_inventory(
            result.order_id.clone(),
            "res".into(),
            true,
            "".into(),
            "res".into(),
            None,
        )
        .unwrap();
    let events = state.events_for(&result.order_id);
    assert_eq!(fold(&events).unwrap().status, Some(OrderStatus::Confirmed));
    state.publish_outbox();
    assert_eq!(state.events_for(&result.order_id).len(), 4);

    let failed = state
        .create_order(
            "cust".into(),
            "create2".into(),
            vec![OrderItem {
                sku: "S".into(),
                quantity: 1,
                unit_price_cents: 1,
            }],
        )
        .unwrap();
    state
        .authorize_payment(
            failed.order_id.clone(),
            "pay2".into(),
            false,
            "declined".into(),
            "pay-fail".into(),
            None,
        )
        .unwrap();
    assert_eq!(
        fold(&state.events_for(&failed.order_id)).unwrap().status,
        Some(OrderStatus::Cancelled)
    );
}

#[test]
fn replay_rebuilds_projections_and_health_is_visible() {
    let state = AppState::default();
    let result = state
        .create_order(
            "cust".into(),
            "create".into(),
            vec![OrderItem {
                sku: "S".into(),
                quantity: 3,
                unit_price_cents: 7,
            }],
        )
        .unwrap();
    let (events, _) = state.replay();
    assert_eq!(events, 1);
    assert_eq!(state.summary(&result.order_id).unwrap().total_cents, 21);
    assert_eq!(state.health()["event_store"], "ok");
}

#[tokio::test]
async fn http_contract_exposes_commands_events_and_health() {
    let state = AppState::default();
    let app = router(state);
    let body = json!({"customer_id":"cust_http","idempotency_key":"http-create","items":[{"sku":"SKU","quantity":1,"unit_price_cents":12}]}).to_string();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/orders")
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let health = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::OK);
}

#[test]
fn full_lifecycle_subscriber_and_error_branches() {
    let state = AppState::default();
    let mut subscriber = state.subscribe();
    let created = state
        .create_order(
            "cust_full".into(),
            "create-full".into(),
            vec![OrderItem {
                sku: "S".into(),
                quantity: 1,
                unit_price_cents: 10,
            }],
        )
        .unwrap();
    assert_eq!(
        subscriber.try_recv().unwrap().event_type,
        EventType::OrderCreated
    );
    state
        .authorize_payment(
            created.order_id.clone(),
            "pay".into(),
            true,
            "".into(),
            "pay-full".into(),
            None,
        )
        .unwrap();
    state
        .reserve_inventory(
            created.order_id.clone(),
            "res".into(),
            true,
            "".into(),
            "res-full".into(),
            None,
        )
        .unwrap();
    state
        .ship(
            created.order_id.clone(),
            "ship".into(),
            "ups".into(),
            "ship-full".into(),
            None,
        )
        .unwrap();
    state
        .deliver(
            created.order_id.clone(),
            "2026-06-17T12:00:00Z".into(),
            "deliver-full".into(),
            None,
        )
        .unwrap();
    assert_eq!(
        fold(&state.events_for(&created.order_id)).unwrap().status,
        Some(OrderStatus::Delivered)
    );
    assert_eq!(
        state
            .cancel(
                created.order_id.clone(),
                "too_late".into(),
                "cancel-delivered".into(),
                None,
            )
            .unwrap_err()
            .code,
        "invalid_transition"
    );
    assert_eq!(state.history("cust_full").len(), 1);
}

#[test]
fn idempotency_conflict_and_inventory_rejection_compensation() {
    let state = AppState::default();
    state
        .create_order(
            "cust".into(),
            "same-key".into(),
            vec![OrderItem {
                sku: "A".into(),
                quantity: 1,
                unit_price_cents: 1,
            }],
        )
        .unwrap();
    assert_eq!(
        state
            .create_order(
                "cust".into(),
                "same-key".into(),
                vec![OrderItem {
                    sku: "B".into(),
                    quantity: 1,
                    unit_price_cents: 1,
                }],
            )
            .unwrap_err()
            .code,
        "idempotency_conflict"
    );
    let order = state
        .create_order(
            "cust".into(),
            "comp-create".into(),
            vec![OrderItem {
                sku: "S".into(),
                quantity: 1,
                unit_price_cents: 1,
            }],
        )
        .unwrap();
    state
        .authorize_payment(
            order.order_id.clone(),
            "pay".into(),
            true,
            "".into(),
            "comp-pay".into(),
            None,
        )
        .unwrap();
    state
        .reserve_inventory(
            order.order_id.clone(),
            "res".into(),
            false,
            "no_stock".into(),
            "comp-inv".into(),
            None,
        )
        .unwrap();
    let aggregate = fold(&state.events_for(&order.order_id)).unwrap();
    assert_eq!(aggregate.status, Some(OrderStatus::Cancelled));
    assert_eq!(aggregate.compensation, vec!["release_payment".to_string()]);
}

#[tokio::test]
async fn http_lifecycle_and_error_routes() {
    let state = AppState::default();
    let app = router(state);
    let create_body = json!({"customer_id":"cust_api","idempotency_key":"api-create","items":[{"sku":"SKU","quantity":1,"unit_price_cents":5}]}).to_string();
    let created = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/orders")
                .header("content-type", "application/json")
                .body(Body::from(create_body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(created.status(), StatusCode::CREATED);
    let body = to_bytes(created.into_body(), usize::MAX).await.unwrap();
    let value: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let order_id = value["data"]["order_id"].as_str().unwrap();
    for (uri, body, want) in [
        (
            format!("/orders/{order_id}/authorize-payment"),
            json!({"payment_id":"pay_api","authorized":true,"idempotency_key":"api-pay"})
                .to_string(),
            StatusCode::OK,
        ),
        (
            format!("/orders/{order_id}/reserve-inventory"),
            json!({"reservation_id":"res_api","reserved":true,"idempotency_key":"api-res"})
                .to_string(),
            StatusCode::OK,
        ),
        (
            format!("/orders/{order_id}/ship"),
            json!({"shipment_id":"ship_api","carrier":"ups","idempotency_key":"api-ship"})
                .to_string(),
            StatusCode::OK,
        ),
        (
            format!("/orders/{order_id}/deliver"),
            json!({"delivered_at":"2026-06-17T12:00:00Z","idempotency_key":"api-deliver"})
                .to_string(),
            StatusCode::OK,
        ),
        (
            format!("/orders/{order_id}/cancel"),
            json!({"reason":"late","idempotency_key":"api-cancel"}).to_string(),
            StatusCode::CONFLICT,
        ),
        (
            "/orders/missing/cancel".to_string(),
            json!({"reason":"missing","idempotency_key":"missing-cancel"}).to_string(),
            StatusCode::NOT_FOUND,
        ),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(uri)
                    .header("content-type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), want);
    }
    assert_eq!(
        app.clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/orders/{order_id}"))
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/customers/cust_api/orders")
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        app.clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/admin/projections/replay")
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap()
            .status(),
        StatusCode::ACCEPTED
    );
    assert_eq!(
        app.oneshot(
            Request::builder()
                .uri("/orders/missing/events")
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap()
        .status(),
        StatusCode::NOT_FOUND
    );
}
