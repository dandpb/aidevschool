use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tokio::sync::broadcast;
use tracing::{info, Level};

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EventType {
    OrderCreated,
    PaymentAuthorized,
    PaymentFailed,
    InventoryReserved,
    InventoryRejected,
    OrderConfirmed,
    OrderCancelled,
    OrderShipped,
    OrderDelivered,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Pending,
    PaymentAuthorized,
    PaymentFailed,
    InventoryReserved,
    InventoryRejected,
    Confirmed,
    Cancelled,
    Shipped,
    Delivered,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct OrderItem {
    pub sku: String,
    pub quantity: i64,
    pub unit_price_cents: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrderEvent {
    pub event_id: String,
    pub aggregate_id: String,
    pub aggregate_type: String,
    pub event_type: EventType,
    pub sequence: i64,
    pub global_position: i64,
    pub schema_version: i64,
    pub occurred_at: String,
    pub correlation_id: String,
    pub causation_id: Option<String>,
    pub idempotency_key: Option<String>,
    pub payload: Value,
}

#[derive(Clone, Debug, Serialize)]
pub struct OrderSummary {
    pub order_id: String,
    pub customer_id: String,
    pub status: OrderStatus,
    pub total_cents: i64,
    pub version: i64,
    pub last_event_id: String,
    pub projection_updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct OrderAggregate {
    pub order_id: String,
    pub customer_id: String,
    pub status: Option<OrderStatus>,
    pub total_cents: i64,
    pub version: i64,
    pub payment_ok: bool,
    pub inventory_ok: bool,
    pub compensation: Vec<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct CommandResult {
    pub order_id: String,
    pub status: OrderStatus,
    pub event_id: String,
    pub version: i64,
}

#[derive(Debug, Clone)]
pub struct ApiError {
    pub code: &'static str,
    pub message: String,
    pub status: StatusCode,
}
impl ApiError {
    fn new(status: StatusCode, code: &'static str, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            status,
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    inner: Arc<Mutex<Inner>>,
    topic: broadcast::Sender<OrderEvent>,
}

#[derive(Clone, Debug)]
struct IdempotencyEntry {
    fingerprint: String,
    result: CommandResult,
}
#[derive(Clone, Debug)]
struct OutboxRecord {
    event_id: String,
    status: String,
    attempts: i64,
}
#[derive(Debug, Default)]
struct Inner {
    events: Vec<OrderEvent>,
    by_order: HashMap<String, Vec<OrderEvent>>,
    outbox: Vec<OutboxRecord>,
    idempotency: HashMap<String, IdempotencyEntry>,
    summaries: HashMap<String, OrderSummary>,
    histories: HashMap<String, Vec<OrderSummary>>,
    applied: HashSet<String>,
    next_id: i64,
    subscriber_failures: i64,
}

impl Default for AppState {
    fn default() -> Self {
        let (topic, _) = broadcast::channel(1024);
        Self {
            inner: Arc::new(Mutex::new(Inner::default())),
            topic,
        }
    }
}

impl AppState {
    pub fn subscribe(&self) -> broadcast::Receiver<OrderEvent> {
        self.topic.subscribe()
    }
    pub fn create_order(
        &self,
        customer_id: String,
        key: String,
        items: Vec<OrderItem>,
    ) -> Result<CommandResult, ApiError> {
        if customer_id.is_empty() || items.is_empty() {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_order",
                "customer and items are required",
            ));
        }
        let mut total = 0;
        for item in &items {
            if item.sku.is_empty() || item.quantity < 1 || item.unit_price_cents < 0 {
                return Err(ApiError::new(
                    StatusCode::BAD_REQUEST,
                    "invalid_item",
                    "invalid item",
                ));
            }
            total += item.quantity * item.unit_price_cents;
        }
        let order_id = format!("ord_{}", stable_id(&format!("{customer_id}{key}")));
        self.append(
            order_id,
            key,
            None,
            EventType::OrderCreated,
            json!({"customer_id":customer_id,"items":items,"total_cents":total}),
        )
    }
    pub fn authorize_payment(
        &self,
        id: String,
        payment: String,
        authorized: bool,
        reason: String,
        key: String,
        expected: Option<i64>,
    ) -> Result<CommandResult, ApiError> {
        if payment.is_empty() {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_payment",
                "payment id is required",
            ));
        }
        let typ = if authorized {
            EventType::PaymentAuthorized
        } else {
            EventType::PaymentFailed
        };
        self.lifecycle(
            id,
            key,
            expected,
            typ,
            json!({"payment_id":payment,"reason":reason}),
        )
    }
    pub fn reserve_inventory(
        &self,
        id: String,
        reservation: String,
        reserved: bool,
        reason: String,
        key: String,
        expected: Option<i64>,
    ) -> Result<CommandResult, ApiError> {
        if reservation.is_empty() {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_reservation",
                "reservation id is required",
            ));
        }
        let typ = if reserved {
            EventType::InventoryReserved
        } else {
            EventType::InventoryRejected
        };
        self.lifecycle(
            id,
            key,
            expected,
            typ,
            json!({"reservation_id":reservation,"reason":reason}),
        )
    }
    pub fn cancel(
        &self,
        id: String,
        reason: String,
        key: String,
        expected: Option<i64>,
    ) -> Result<CommandResult, ApiError> {
        if reason.is_empty() {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_reason",
                "reason is required",
            ));
        }
        self.lifecycle(
            id,
            key,
            expected,
            EventType::OrderCancelled,
            json!({"reason":reason}),
        )
    }
    pub fn ship(
        &self,
        id: String,
        shipment: String,
        carrier: String,
        key: String,
        expected: Option<i64>,
    ) -> Result<CommandResult, ApiError> {
        if shipment.is_empty() || carrier.is_empty() {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_shipment",
                "shipment and carrier are required",
            ));
        }
        self.lifecycle(
            id,
            key,
            expected,
            EventType::OrderShipped,
            json!({"shipment_id":shipment,"carrier":carrier}),
        )
    }
    pub fn deliver(
        &self,
        id: String,
        delivered_at: String,
        key: String,
        expected: Option<i64>,
    ) -> Result<CommandResult, ApiError> {
        if delivered_at.is_empty() {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_delivery",
                "delivered_at is required",
            ));
        }
        self.lifecycle(
            id,
            key,
            expected,
            EventType::OrderDelivered,
            json!({"delivered_at":delivered_at}),
        )
    }
    fn lifecycle(
        &self,
        id: String,
        key: String,
        expected: Option<i64>,
        typ: EventType,
        payload: Value,
    ) -> Result<CommandResult, ApiError> {
        let events = self.events_for(&id);
        if events.is_empty() {
            return Err(ApiError::new(
                StatusCode::NOT_FOUND,
                "order_not_found",
                "order not found",
            ));
        }
        let agg = fold(&events)?;
        if !can_apply(&agg, &typ) {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "invalid_transition",
                "transition is not allowed",
            ));
        }
        self.append(id, key, expected, typ, payload)
    }
    fn append(
        &self,
        order_id: String,
        key: String,
        expected: Option<i64>,
        typ: EventType,
        payload: Value,
    ) -> Result<CommandResult, ApiError> {
        if key.is_empty() {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_idempotency_key",
                "idempotency key is required",
            ));
        }
        let fingerprint = format!("{order_id}{typ:?}{payload}");
        let event = {
            let mut inner = self.inner.lock().expect("state mutex poisoned");
            if let Some(old) = inner.idempotency.get(&key) {
                if old.fingerprint != fingerprint {
                    return Err(ApiError::new(
                        StatusCode::CONFLICT,
                        "idempotency_conflict",
                        "idempotency key reused",
                    ));
                }
                return Ok(old.result.clone());
            }
            let current = inner.by_order.get(&order_id).map_or(0, Vec::len) as i64;
            if expected.is_some_and(|v| v != current) {
                return Err(ApiError::new(
                    StatusCode::CONFLICT,
                    "concurrency_conflict",
                    "expected version does not match current version",
                ));
            }
            inner.next_id += 1;
            let event = OrderEvent {
                event_id: format!("evt_{:06}", inner.next_id),
                aggregate_id: order_id.clone(),
                aggregate_type: "Order".to_string(),
                event_type: typ.clone(),
                sequence: current + 1,
                global_position: inner.events.len() as i64 + 1,
                schema_version: 1,
                occurred_at: now_string(),
                correlation_id: format!("corr_{}", stable_id(&key)),
                causation_id: None,
                idempotency_key: Some(key.clone()),
                payload,
            };
            let result = CommandResult {
                order_id: order_id.clone(),
                status: status_after(&typ),
                event_id: event.event_id.clone(),
                version: event.sequence,
            };
            inner.events.push(event.clone());
            inner
                .by_order
                .entry(order_id)
                .or_default()
                .push(event.clone());
            inner.outbox.push(OutboxRecord {
                event_id: event.event_id.clone(),
                status: "pending".to_string(),
                attempts: 0,
            });
            inner.idempotency.insert(
                key,
                IdempotencyEntry {
                    fingerprint,
                    result,
                },
            );
            event
        };
        self.publish_outbox();
        info!(order_id=%event.aggregate_id, event_id=%event.event_id, event_type=?event.event_type, "event_appended");
        Ok(CommandResult {
            order_id: event.aggregate_id,
            status: status_after(&event.event_type),
            event_id: event.event_id,
            version: event.sequence,
        })
    }
    pub fn publish_outbox(&self) {
        let events = {
            let mut inner = self.inner.lock().expect("state mutex poisoned");
            let ids: Vec<String> = inner
                .outbox
                .iter_mut()
                .filter(|r| r.status == "pending")
                .map(|r| {
                    r.status = "publishing".to_string();
                    r.attempts += 1;
                    r.event_id.clone()
                })
                .collect();
            ids.into_iter()
                .filter_map(|id| inner.events.iter().find(|e| e.event_id == id).cloned())
                .collect::<Vec<_>>()
        };
        for event in events {
            if self.topic.send(event.clone()).is_err() {
                self.inner
                    .lock()
                    .expect("state mutex poisoned")
                    .subscriber_failures += 1;
            }
            self.apply_projection(&event);
            self.react_saga(&event);
            self.mark_published(&event.event_id);
        }
    }
    fn mark_published(&self, id: &str) {
        let mut inner = self.inner.lock().expect("state mutex poisoned");
        for record in &mut inner.outbox {
            if record.event_id == id {
                record.status = "published".to_string();
            }
        }
    }
    fn apply_projection(&self, event: &OrderEvent) {
        let mut inner = self.inner.lock().expect("state mutex poisoned");
        if !inner.applied.insert(event.event_id.clone()) {
            return;
        }
        let mut summary =
            inner
                .summaries
                .get(&event.aggregate_id)
                .cloned()
                .unwrap_or(OrderSummary {
                    order_id: event.aggregate_id.clone(),
                    customer_id: String::new(),
                    status: OrderStatus::Pending,
                    total_cents: 0,
                    version: 0,
                    last_event_id: String::new(),
                    projection_updated_at: String::new(),
                });
        if event.event_type == EventType::OrderCreated {
            summary.customer_id = event.payload["customer_id"]
                .as_str()
                .unwrap_or_default()
                .to_string();
            summary.total_cents = event.payload["total_cents"].as_i64().unwrap_or_default();
        }
        summary.status = status_after(&event.event_type);
        summary.version = event.sequence;
        summary.last_event_id = event.event_id.clone();
        summary.projection_updated_at = now_string();
        inner
            .summaries
            .insert(event.aggregate_id.clone(), summary.clone());
        let history = inner
            .histories
            .entry(summary.customer_id.clone())
            .or_default();
        if let Some(existing) = history.iter_mut().find(|s| s.order_id == summary.order_id) {
            *existing = summary;
        } else {
            history.push(summary);
        }
    }
    fn react_saga(&self, event: &OrderEvent) {
        if !matches!(
            event.event_type,
            EventType::PaymentAuthorized
                | EventType::InventoryReserved
                | EventType::PaymentFailed
                | EventType::InventoryRejected
        ) {
            return;
        }
        let events = self.events_for(&event.aggregate_id);
        let has = |t: EventType| events.iter().any(|e| e.event_type == t);
        let agg = match fold(&events) {
            Ok(a) => a,
            Err(_) => return,
        };
        if agg.payment_ok && agg.inventory_ok && !has(EventType::OrderConfirmed) {
            let _ = self.append(
                event.aggregate_id.clone(),
                format!("saga-confirm-{}", event.aggregate_id),
                None,
                EventType::OrderConfirmed,
                json!({"confirmed_by":"fulfillment_saga"}),
            );
        }
        if matches!(
            event.event_type,
            EventType::PaymentFailed | EventType::InventoryRejected
        ) && !has(EventType::OrderCancelled)
        {
            let compensation = if event.event_type == EventType::InventoryRejected
                && has(EventType::PaymentAuthorized)
            {
                "release_payment"
            } else {
                ""
            };
            let _ = self.append(
                event.aggregate_id.clone(),
                format!("saga-cancel-{}", event.aggregate_id),
                None,
                EventType::OrderCancelled,
                json!({"reason":"saga_compensation","compensation":compensation}),
            );
        }
    }
    pub fn events_for(&self, id: &str) -> Vec<OrderEvent> {
        self.inner
            .lock()
            .expect("state mutex poisoned")
            .by_order
            .get(id)
            .cloned()
            .unwrap_or_default()
    }
    pub fn summary(&self, id: &str) -> Option<OrderSummary> {
        self.inner
            .lock()
            .expect("state mutex poisoned")
            .summaries
            .get(id)
            .cloned()
    }
    pub fn history(&self, customer: &str) -> Vec<OrderSummary> {
        self.inner
            .lock()
            .expect("state mutex poisoned")
            .histories
            .get(customer)
            .cloned()
            .unwrap_or_default()
    }
    pub fn replay(&self) -> (usize, u128) {
        let start = Instant::now();
        let events = self
            .inner
            .lock()
            .expect("state mutex poisoned")
            .events
            .clone();
        {
            let mut inner = self.inner.lock().expect("state mutex poisoned");
            inner.summaries.clear();
            inner.histories.clear();
            inner.applied.clear();
        }
        for event in &events {
            self.apply_projection(event);
        }
        (events.len(), start.elapsed().as_millis())
    }
    pub fn health(&self) -> Value {
        let inner = self.inner.lock().expect("state mutex poisoned");
        let backlog = inner
            .outbox
            .iter()
            .filter(|r| r.status != "published")
            .count();
        json!({"status":"ok","event_store":"ok","outbox_backlog":backlog,"projection_lag_events":0,"projection_lag_ms":0,"saga_backlog":0,"subscriber_failures":inner.subscriber_failures})
    }
}

pub fn fold(events: &[OrderEvent]) -> Result<OrderAggregate, ApiError> {
    let mut agg = OrderAggregate::default();
    let mut last = 0;
    for event in events {
        if event.sequence != last + 1 {
            return Err(ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "event_sequence_gap",
                "event sequence gap",
            ));
        }
        last = event.sequence;
        agg.order_id = event.aggregate_id.clone();
        agg.version = event.sequence;
        match event.event_type {
            EventType::OrderCreated => {
                agg.customer_id = event.payload["customer_id"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string();
                agg.total_cents = event.payload["total_cents"].as_i64().unwrap_or_default();
                agg.status = Some(OrderStatus::Pending);
            }
            EventType::PaymentAuthorized => {
                agg.payment_ok = true;
                agg.status = Some(OrderStatus::PaymentAuthorized);
            }
            EventType::PaymentFailed => agg.status = Some(OrderStatus::PaymentFailed),
            EventType::InventoryReserved => {
                agg.inventory_ok = true;
                agg.status = Some(OrderStatus::InventoryReserved);
            }
            EventType::InventoryRejected => agg.status = Some(OrderStatus::InventoryRejected),
            EventType::OrderConfirmed => agg.status = Some(OrderStatus::Confirmed),
            EventType::OrderCancelled => {
                agg.status = Some(OrderStatus::Cancelled);
                if let Some(c) = event.payload["compensation"].as_str() {
                    if !c.is_empty() {
                        agg.compensation.push(c.to_string());
                    }
                }
            }
            EventType::OrderShipped => agg.status = Some(OrderStatus::Shipped),
            EventType::OrderDelivered => agg.status = Some(OrderStatus::Delivered),
        }
    }
    Ok(agg)
}
fn can_apply(agg: &OrderAggregate, typ: &EventType) -> bool {
    match typ {
        EventType::PaymentAuthorized
        | EventType::PaymentFailed
        | EventType::InventoryReserved
        | EventType::InventoryRejected => !matches!(
            agg.status,
            Some(OrderStatus::Cancelled | OrderStatus::Shipped | OrderStatus::Delivered)
        ),
        EventType::OrderCancelled => !matches!(
            agg.status,
            Some(OrderStatus::Cancelled | OrderStatus::Delivered)
        ),
        EventType::OrderShipped => agg.status == Some(OrderStatus::Confirmed),
        EventType::OrderDelivered => agg.status == Some(OrderStatus::Shipped),
        _ => true,
    }
}
fn status_after(typ: &EventType) -> OrderStatus {
    match typ {
        EventType::OrderCreated => OrderStatus::Pending,
        EventType::PaymentAuthorized => OrderStatus::PaymentAuthorized,
        EventType::PaymentFailed => OrderStatus::PaymentFailed,
        EventType::InventoryReserved => OrderStatus::InventoryReserved,
        EventType::InventoryRejected => OrderStatus::InventoryRejected,
        EventType::OrderConfirmed => OrderStatus::Confirmed,
        EventType::OrderCancelled => OrderStatus::Cancelled,
        EventType::OrderShipped => OrderStatus::Shipped,
        EventType::OrderDelivered => OrderStatus::Delivered,
    }
}
fn stable_id(input: &str) -> String {
    let mut h: u64 = 1469598103934665603;
    for b in input.as_bytes() {
        h ^= u64::from(*b);
        h = h.wrapping_mul(1099511628211);
    }
    format!("{h:x}")[0..12].to_string()
}
fn now_string() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
        .to_string()
}

#[derive(Deserialize)]
pub struct CreateRequest {
    customer_id: String,
    idempotency_key: String,
    items: Vec<OrderItem>,
}
#[derive(Deserialize)]
pub struct PaymentRequest {
    payment_id: String,
    authorized: bool,
    reason: Option<String>,
    idempotency_key: String,
    expected_version: Option<i64>,
}
#[derive(Deserialize)]
pub struct InventoryRequest {
    reservation_id: String,
    reserved: bool,
    reason: Option<String>,
    idempotency_key: String,
    expected_version: Option<i64>,
}
#[derive(Deserialize)]
pub struct CancelRequest {
    reason: String,
    idempotency_key: String,
    expected_version: Option<i64>,
}
#[derive(Deserialize)]
pub struct ShipRequest {
    shipment_id: String,
    carrier: String,
    idempotency_key: String,
    expected_version: Option<i64>,
}
#[derive(Deserialize)]
pub struct DeliverRequest {
    delivered_at: String,
    idempotency_key: String,
    expected_version: Option<i64>,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/orders", post(create_handler))
        .route("/orders/:id", get(summary_handler))
        .route("/orders/:id/events", get(events_handler))
        .route("/orders/:id/authorize-payment", post(payment_handler))
        .route("/orders/:id/reserve-inventory", post(inventory_handler))
        .route("/orders/:id/cancel", post(cancel_handler))
        .route("/orders/:id/ship", post(ship_handler))
        .route("/orders/:id/deliver", post(deliver_handler))
        .route("/customers/:id/orders", get(history_handler))
        .route("/admin/projections/replay", post(replay_handler))
        .route("/health", get(health_handler))
        .with_state(state)
}
async fn create_handler(
    State(s): State<AppState>,
    Json(r): Json<CreateRequest>,
) -> impl IntoResponse {
    respond(
        StatusCode::CREATED,
        s.create_order(r.customer_id, r.idempotency_key, r.items),
    )
}
async fn payment_handler(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(r): Json<PaymentRequest>,
) -> impl IntoResponse {
    respond(
        StatusCode::OK,
        s.authorize_payment(
            id,
            r.payment_id,
            r.authorized,
            r.reason.unwrap_or_default(),
            r.idempotency_key,
            r.expected_version,
        ),
    )
}
async fn inventory_handler(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(r): Json<InventoryRequest>,
) -> impl IntoResponse {
    respond(
        StatusCode::OK,
        s.reserve_inventory(
            id,
            r.reservation_id,
            r.reserved,
            r.reason.unwrap_or_default(),
            r.idempotency_key,
            r.expected_version,
        ),
    )
}
async fn cancel_handler(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(r): Json<CancelRequest>,
) -> impl IntoResponse {
    respond(
        StatusCode::OK,
        s.cancel(id, r.reason, r.idempotency_key, r.expected_version),
    )
}
async fn ship_handler(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(r): Json<ShipRequest>,
) -> impl IntoResponse {
    respond(
        StatusCode::OK,
        s.ship(
            id,
            r.shipment_id,
            r.carrier,
            r.idempotency_key,
            r.expected_version,
        ),
    )
}
async fn deliver_handler(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(r): Json<DeliverRequest>,
) -> impl IntoResponse {
    respond(
        StatusCode::OK,
        s.deliver(id, r.delivered_at, r.idempotency_key, r.expected_version),
    )
}
async fn summary_handler(State(s): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    match s.summary(&id) {
        Some(v) => ok(StatusCode::OK, json!(v), v.version),
        None => err(ApiError::new(
            StatusCode::NOT_FOUND,
            "projection_not_found",
            "projection not found",
        )),
    }
}
async fn events_handler(State(s): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    let events = s.events_for(&id);
    if events.is_empty() {
        err(ApiError::new(
            StatusCode::NOT_FOUND,
            "order_not_found",
            "order not found",
        ))
    } else {
        ok(StatusCode::OK, json!({"order_id":id,"events":events}), 0)
    }
}
async fn history_handler(State(s): State<AppState>, Path(id): Path<String>) -> impl IntoResponse {
    ok(
        StatusCode::OK,
        json!({"items":s.history(&id),"next_cursor":null}),
        0,
    )
}
async fn replay_handler(State(s): State<AppState>) -> impl IntoResponse {
    let (n, ms) = s.replay();
    ok(
        StatusCode::ACCEPTED,
        json!({"replay_id":"replay_latest","status":"completed","events_processed":n,"duration_ms":ms}),
        0,
    )
}
async fn health_handler(State(s): State<AppState>) -> impl IntoResponse {
    ok(StatusCode::OK, s.health(), 0)
}
fn respond(
    status: StatusCode,
    result: Result<CommandResult, ApiError>,
) -> (StatusCode, Json<Value>) {
    match result {
        Ok(r) => ok(
            status,
            json!({"order_id":r.order_id,"status":r.status,"event_id":r.event_id}),
            r.version,
        ),
        Err(e) => err(e),
    }
}
fn ok(status: StatusCode, data: Value, version: i64) -> (StatusCode, Json<Value>) {
    (
        status,
        Json(
            json!({"ok":true,"data":data,"metadata":{"correlation_id":"corr_http","aggregate_version":version}}),
        ),
    )
}
fn err(error: ApiError) -> (StatusCode, Json<Value>) {
    (
        error.status,
        Json(
            json!({"ok":false,"error":{"code":error.code,"message":error.message,"details":{}},"metadata":{"correlation_id":"corr_http"}}),
        ),
    )
}

pub async fn run() {
    let _ = tracing_subscriber::fmt()
        .json()
        .with_max_level(Level::INFO)
        .try_init();
    let addr: SocketAddr = "127.0.0.1:8082".parse().expect("valid listen address");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind server");
    axum::serve(listener, router(AppState::default()))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .expect("serve");
}
