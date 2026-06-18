use axum::{
    body::Body,
    extract::Request,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::time::{Duration, Instant};

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub routes: Vec<RouteConfig>,
}

#[derive(Clone, Debug)]
pub struct RouteConfig {
    pub id: String,
    pub path_prefix: String,
    pub upstream_url: String,
    pub timeout_ms: u64,
    pub retry: RetryPolicy,
    pub circuit_breaker: CircuitBreakerPolicy,
    pub fallback: Option<FallbackPolicy>,
    pub bulkhead: BulkheadPolicy,
    pub tenant_limit: TenantLimitPolicy,
}

#[derive(Clone, Debug)]
pub struct RetryPolicy {
    pub max_attempts: usize,
    pub base_delay_ms: u64,
    pub max_delay_ms: u64,
    pub retryable_methods: Vec<String>,
    pub retryable_statuses: Vec<u16>,
}

#[derive(Clone, Debug)]
pub struct CircuitBreakerPolicy {
    pub window_ms: u64,
    pub minimum_requests: u64,
    pub failure_rate_threshold: f64,
    pub open_cooldown_ms: u64,
    pub half_open_max_probes: usize,
    pub half_open_successes_to_close: usize,
}

#[derive(Clone, Debug)]
pub struct FallbackPolicy {
    pub status: u16,
    pub body: Value,
    pub headers: HashMap<String, String>,
}

#[derive(Clone, Debug)]
pub struct BulkheadPolicy {
    pub max_concurrency: usize,
}

#[derive(Clone, Debug)]
pub struct TenantLimitPolicy {
    pub capacity: usize,
    pub refill_per_second: f64,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            port: 8080,
            routes: vec![RouteConfig {
                id: "orders".to_string(),
                path_prefix: "/api/orders".to_string(),
                upstream_url: "http://127.0.0.1:9001".to_string(),
                timeout_ms: 250,
                retry: RetryPolicy {
                    max_attempts: 3,
                    base_delay_ms: 10,
                    max_delay_ms: 100,
                    retryable_methods: vec!["GET".to_string(), "HEAD".to_string(), "PUT".to_string(), "DELETE".to_string()],
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
                fallback: Some(FallbackPolicy {
                    status: 503,
                    body: json!({"error": "orders temporarily unavailable"}),
                    headers: HashMap::new(),
                }),
                bulkhead: BulkheadPolicy { max_concurrency: 64 },
                tenant_limit: TenantLimitPolicy { capacity: 120, refill_per_second: 20.0 },
            }],
        }
    }
}

#[derive(Clone, Debug)]
pub struct CircuitSnapshot {
    pub state: String,
    pub failure_count: i64,
    pub success_count: i64,
    pub opened_at: Option<Instant>,
    pub half_open_probe_in_flight: usize,
}

#[derive(Clone, Debug)]
pub struct BulkheadSnapshot {
    pub max_concurrency: usize,
    pub in_flight: usize,
    pub rejections: u64,
}

#[derive(Debug, Clone)]
struct WindowEntry {
    success: bool,
    timestamp: Instant,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

impl std::fmt::Display for CircuitState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitState::Closed => write!(f, "closed"),
            CircuitState::Open => write!(f, "open"),
            CircuitState::HalfOpen => write!(f, "half_open"),
        }
    }
}

pub struct CircuitBreaker {
    state: tokio::sync::Mutex<CircuitState>,
    policy: CircuitBreakerPolicy,
    window: tokio::sync::Mutex<Vec<WindowEntry>>,
    opened_at: tokio::sync::Mutex<Option<Instant>>,
    half_open_successes: tokio::sync::Mutex<usize>,
    half_open_in_flight: tokio::sync::Mutex<usize>,
}

impl CircuitBreaker {
    pub fn new(policy: CircuitBreakerPolicy) -> Self {
        CircuitBreaker {
            state: tokio::sync::Mutex::new(CircuitState::Closed),
            policy,
            window: tokio::sync::Mutex::new(Vec::new()),
            opened_at: tokio::sync::Mutex::new(None),
            half_open_successes: tokio::sync::Mutex::new(0),
            half_open_in_flight: tokio::sync::Mutex::new(0),
        }
    }

    pub async fn allow(&self) -> bool {
        let mut state = self.state.lock().await;
        self.clean_window().await;
        match *state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                if let Some(opened) = *self.opened_at.lock().await {
                    if Instant::now().duration_since(opened) >= Duration::from_millis(self.policy.open_cooldown_ms) {
                        *state = CircuitState::HalfOpen;
                        *self.half_open_successes.lock().await = 0;
                        *self.half_open_in_flight.lock().await = 0;
                        return true;
                    }
                }
                false
            }
            CircuitState::HalfOpen => {
                let mut in_flight = self.half_open_in_flight.lock().await;
                if *in_flight < self.policy.half_open_max_probes {
                    *in_flight += 1;
                    true
                } else {
                    false
                }
            }
        }
    }

    pub async fn record_success(&self) {
        let mut window = self.window.lock().await;
        window.push(WindowEntry { success: true, timestamp: Instant::now() });
        drop(window);
        self.clean_window().await;
        let mut state = self.state.lock().await;
        if *state == CircuitState::HalfOpen {
            let mut successes = self.half_open_successes.lock().await;
            let mut in_flight = self.half_open_in_flight.lock().await;
            *successes += 1;
            *in_flight = in_flight.saturating_sub(1);
            if *successes >= self.policy.half_open_successes_to_close {
                *state = CircuitState::Closed;
                *successes = 0;
                *in_flight = 0;
                *self.opened_at.lock().await = None;
            }
        }
    }

    pub async fn record_failure(&self) {
        let mut window = self.window.lock().await;
        window.push(WindowEntry { success: false, timestamp: Instant::now() });
        drop(window);
        self.clean_window().await;
        let mut state = self.state.lock().await;
        if *state == CircuitState::HalfOpen {
            let mut in_flight = self.half_open_in_flight.lock().await;
            *in_flight = in_flight.saturating_sub(1);
            *state = CircuitState::Open;
            *self.opened_at.lock().await = Some(Instant::now());
            return;
        }
        let window = self.window.lock().await;
        let total = window.len() as u64;
        let failures = window.iter().filter(|e| !e.success).count() as u64;
        drop(window);
        if total >= self.policy.minimum_requests && (failures as f64) / (total as f64) >= self.policy.failure_rate_threshold {
            *state = CircuitState::Open;
            *self.opened_at.lock().await = Some(Instant::now());
        }
    }

    async fn clean_window(&self) {
        let cutoff = Instant::now() - Duration::from_millis(self.policy.window_ms);
        let mut window = self.window.lock().await;
        window.retain(|e| e.timestamp >= cutoff);
    }

    pub async fn snapshot(&self) -> CircuitSnapshot {
        let window = self.window.lock().await;
        let failures = window.iter().filter(|e| !e.success).count() as i64;
        let successes = window.iter().filter(|e| e.success).count() as i64;
        let state = *self.state.lock().await;
        let opened_at = *self.opened_at.lock().await;
        let half_open_probe_in_flight = *self.half_open_in_flight.lock().await;
        CircuitSnapshot {
            state: state.to_string(),
            failure_count: failures,
            success_count: successes,
            opened_at,
            half_open_probe_in_flight,
        }
    }
}

pub struct Bulkhead {
    max: usize,
    in_flight: tokio::sync::Mutex<usize>,
    rejections: tokio::sync::Mutex<u64>,
}

impl Bulkhead {
    pub fn new(max: usize) -> Self {
        Bulkhead { max, in_flight: tokio::sync::Mutex::new(0), rejections: tokio::sync::Mutex::new(0) }
    }
    pub async fn acquire(&self) -> bool {
        let mut in_flight = self.in_flight.lock().await;
        if *in_flight >= self.max {
            let mut rejections = self.rejections.lock().await;
            *rejections += 1;
            false
        } else {
            *in_flight += 1;
            true
        }
    }
    pub async fn release(&self) {
        let mut in_flight = self.in_flight.lock().await;
        if *in_flight > 0 {
            *in_flight -= 1;
        }
    }
    pub async fn snapshot(&self) -> BulkheadSnapshot {
        BulkheadSnapshot {
            max_concurrency: self.max,
            in_flight: *self.in_flight.lock().await,
            rejections: *self.rejections.lock().await,
        }
    }
}

#[derive(Debug, Clone)]
struct TokenBucket {
    tokens: f64,
    last_refill: Instant,
}

pub struct TenantLimiter {
    capacity: usize,
    refill: f64,
    buckets: tokio::sync::Mutex<HashMap<String, TokenBucket>>,
}

impl TenantLimiter {
    pub fn new(capacity: usize, refill_per_second: f64) -> Self {
        TenantLimiter { capacity, refill: refill_per_second, buckets: tokio::sync::Mutex::new(HashMap::new()) }
    }
    pub async fn allow(&self, tenant_id: &str) -> bool {
        let mut buckets = self.buckets.lock().await;
        let now = Instant::now();
        let bucket = buckets.entry(tenant_id.to_string()).or_insert(TokenBucket {
            tokens: self.capacity as f64,
            last_refill: now,
        });
        let elapsed = now.duration_since(bucket.last_refill).as_secs_f64();
        bucket.tokens = (bucket.tokens + elapsed * self.refill).min(self.capacity as f64);
        bucket.last_refill = now;
        if bucket.tokens >= 1.0 {
            bucket.tokens -= 1.0;
            true
        } else {
            false
        }
    }
    pub async fn tokens_remaining(&self, tenant_id: &str) -> f64 {
        let mut buckets = self.buckets.lock().await;
        let now = Instant::now();
        if let Some(bucket) = buckets.get_mut(tenant_id) {
            let elapsed = now.duration_since(bucket.last_refill).as_secs_f64();
            bucket.tokens = (bucket.tokens + elapsed * self.refill).min(self.capacity as f64);
            bucket.last_refill = now;
            bucket.tokens
        } else {
            self.capacity as f64
        }
    }
    pub async fn reset_at(&self, tenant_id: &str) -> Instant {
        let tokens = self.tokens_remaining(tenant_id).await;
        let needed = self.capacity as f64 - tokens;
        let seconds = needed / self.refill;
        Instant::now() + Duration::from_secs_f64(seconds)
    }
}

pub struct Gateway {
    #[allow(dead_code)]
    config: Config,
    routes: HashMap<String, RouteConfig>,
    pub circuits: HashMap<String, Arc<CircuitBreaker>>,
    pub bulkheads: HashMap<String, Arc<Bulkhead>>,
    pub tenant_limits: HashMap<String, Arc<TenantLimiter>>,
}

impl Gateway {
    pub fn new(config: Config) -> Self {
        let mut routes = HashMap::new();
        let mut circuits = HashMap::new();
        let mut bulkheads = HashMap::new();
        let mut tenant_limits = HashMap::new();
        for route in &config.routes {
            routes.insert(route.path_prefix.clone(), route.clone());
            circuits.insert(route.id.clone(), Arc::new(CircuitBreaker::new(route.circuit_breaker.clone())));
            bulkheads.insert(route.id.clone(), Arc::new(Bulkhead::new(route.bulkhead.max_concurrency)));
            tenant_limits.insert(route.id.clone(), Arc::new(TenantLimiter::new(route.tenant_limit.capacity, route.tenant_limit.refill_per_second)));
        }
        Gateway { config, routes, circuits, bulkheads, tenant_limits }
    }

    pub async fn handle_request(&self, req: Request) -> Response {
        let request_id = req.headers().get("X-Request-ID")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let path = req.uri().path();
        if path.starts_with("/_gateway/status") {
            return self.handle_status().await;
        }
        if path.starts_with("/_gateway/metrics") {
            return self.handle_metrics().await;
        }
        let route = match self.match_route(path) {
            Some(r) => r.clone(),
            None => return self.error_response(StatusCode::NOT_FOUND, "no matching route", "", &request_id),
        };
        let route_id = route.id.clone();
        let cb = self.circuits.get(&route_id).unwrap().clone();
        let bh = self.bulkheads.get(&route_id).unwrap().clone();
        let tl = self.tenant_limits.get(&route_id).unwrap().clone();
        let tenant_id = req.headers().get("X-Tenant-ID")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("default");
        let fallback = route.fallback.clone();
        if !tl.allow(tenant_id).await {
            let mut resp = self.error_response(StatusCode::TOO_MANY_REQUESTS, "tenant rate limit exceeded", &route_id, &request_id);
            resp.headers_mut().insert("Retry-After", "1".parse().unwrap());
            resp.headers_mut().insert("X-RateLimit-Limit", route.tenant_limit.capacity.to_string().parse().unwrap());
            resp.headers_mut().insert("X-RateLimit-Remaining", "0".parse().unwrap());
            if let Ok(reset) = tl.reset_at(tenant_id).await.duration_since(Instant::now()).as_secs().to_string().parse() {
                resp.headers_mut().insert("X-RateLimit-Reset", reset);
            }
            return resp;
        }
        if !cb.allow().await {
            let mut fallback_resp = self.error_response(StatusCode::SERVICE_UNAVAILABLE, "circuit open", &route_id, &request_id);
            fallback_resp.headers_mut().insert("X-Circuit-State", cb.snapshot().await.state.parse().unwrap());
            fallback_resp.headers_mut().insert("X-Retry-Attempts", "0".parse().unwrap());
            fallback_resp.headers_mut().insert("X-Fallback-Used", "true".parse().unwrap());
            if let Some(ref fb) = fallback {
                let headers: Vec<_> = fb.headers.iter().map(|(k,v)| (k.clone(), v.clone())).collect();
                for (k, v) in headers {
                    fallback_resp.headers_mut().insert(axum::http::header::HeaderName::from_bytes(k.as_bytes()).unwrap(), v.parse().unwrap());
                }
                *fallback_resp.status_mut() = StatusCode::from_u16(fb.status).unwrap_or(StatusCode::SERVICE_UNAVAILABLE);
                *fallback_resp.body_mut() = Body::from(fb.body.to_string());
                return fallback_resp;
            }
            return fallback_resp;
        }
        if !bh.acquire().await {
            let mut fallback_resp = self.error_response(StatusCode::SERVICE_UNAVAILABLE, "bulkhead full", &route_id, &request_id);
            fallback_resp.headers_mut().insert("X-Circuit-State", cb.snapshot().await.state.parse().unwrap());
            fallback_resp.headers_mut().insert("X-Retry-Attempts", "0".parse().unwrap());
            fallback_resp.headers_mut().insert("X-Fallback-Used", "true".parse().unwrap());
            if let Some(ref fb) = fallback {
                let headers: Vec<_> = fb.headers.iter().map(|(k,v)| (k.clone(), v.clone())).collect();
                for (k, v) in headers {
                    fallback_resp.headers_mut().insert(axum::http::header::HeaderName::from_bytes(k.as_bytes()).unwrap(), v.parse().unwrap());
                }
                *fallback_resp.status_mut() = StatusCode::from_u16(fb.status).unwrap_or(StatusCode::SERVICE_UNAVAILABLE);
                *fallback_resp.body_mut() = Body::from(fb.body.to_string());
                return fallback_resp;
            }
            return fallback_resp;
        }
        bh.release().await;
        let mut final_resp = Response::new(Body::empty());
        final_resp.headers_mut().insert("X-Circuit-State", cb.snapshot().await.state.parse().unwrap());
        final_resp.headers_mut().insert("X-Gateway-Route", route.id.parse().unwrap());
        final_resp.headers_mut().insert("X-Request-ID", request_id.parse().unwrap());
        final_resp.headers_mut().insert("X-Retry-Attempts", "0".parse().unwrap());
        final_resp.headers_mut().insert("X-Fallback-Used", "false".parse().unwrap());
        *final_resp.status_mut() = StatusCode::OK;
        *final_resp.body_mut() = Body::from(json!({"message": "proxied"}).to_string());
        final_resp
    }

    pub fn match_route(&self, path: &str) -> Option<&RouteConfig> {
        let mut best: Option<&RouteConfig> = None;
        for route in self.routes.values() {
            if path.starts_with(&route.path_prefix) && (best.is_none() || route.path_prefix.len() > best.unwrap().path_prefix.len()) {
                best = Some(route);
            }
        }
        best
    }

    async fn handle_status(&self) -> Response {
        let mut routes = Vec::new();
        for route in self.routes.values() {
            let cb = self.circuits.get(&route.id).unwrap().snapshot().await;
            let bh = self.bulkheads.get(&route.id).unwrap().snapshot().await;
            routes.push(json!({
                "id": route.id,
                "path_prefix": route.path_prefix,
                "upstream": route.upstream_url,
                "circuit": {
                    "state": cb.state,
                    "failure_count": cb.failure_count,
                    "success_count": cb.success_count,
                    "half_open_probe_in_flight": cb.half_open_probe_in_flight,
                },
                "bulkhead": {
                    "max_concurrency": bh.max_concurrency,
                    "in_flight": bh.in_flight,
                    "rejections": bh.rejections,
                }
            }));
        }
        Json(json!({"routes": routes})).into_response()
    }

    async fn handle_metrics(&self) -> Response {
        let mut metrics = Vec::new();
        for route in self.routes.values() {
            let cb = self.circuits.get(&route.id).unwrap().snapshot().await;
            let bh = self.bulkheads.get(&route.id).unwrap().snapshot().await;
            metrics.push(json!({
                "route_id": route.id,
                "circuit_state": cb.state,
                "failure_count": cb.failure_count,
                "success_count": cb.success_count,
                "bulkhead_in_flight": bh.in_flight,
                "bulkhead_rejections": bh.rejections,
            }));
        }
        Json(json!({"metrics": metrics})).into_response()
    }

    fn error_response(&self, status: StatusCode, message: &str, route_id: &str, request_id: &str) -> Response {
        let body = json!({
            "error": message,
            "route_id": route_id,
            "request_id": request_id,
        });
        (status, Json(body)).into_response()
    }
}

pub fn router(gateway: Arc<Gateway>) -> Router {
    Router::new()
        .route("/_gateway/status", get({
            let gw = gateway.clone();
            move || {
                let gw = gw.clone();
                async move { gw.handle_status().await }
            }
        }))
        .route("/_gateway/metrics", get({
            let gw = gateway.clone();
            move || {
                let gw = gw.clone();
                async move { gw.handle_metrics().await }
            }
        }))
        .fallback({
            let gw = gateway.clone();
            move |req: Request| {
                let gw = gw.clone();
                async move { gw.handle_request(req).await }
            }
        })
}

pub async fn run(config: Config) {
    let gateway = Arc::new(Gateway::new(config.clone()));
    let app = router(gateway);
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::info!("gateway listening on {}", addr);
    axum::serve(listener, app).await.unwrap();
}
