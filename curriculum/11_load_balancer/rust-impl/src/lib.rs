use axum::{
    body::{to_bytes, Body, Bytes},
    extract::State,
    http::{HeaderValue, Request, Response, StatusCode, Uri},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::RwLock,
    task::JoinHandle,
    time,
};
use tracing::{error, info};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RoutingAlgorithm {
    RoundRobin,
    LeastConnections,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthState {
    Healthy,
    Unhealthy,
    Unknown,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

#[derive(Clone, Debug)]
pub struct BackendConfig {
    pub id: String,
    pub url: String,
    pub weight: usize,
    pub health_path: String,
}
#[derive(Clone, Debug)]
pub struct Config {
    pub routing_algorithm: RoutingAlgorithm,
    pub health_check_interval: Duration,
    pub health_check_timeout: Duration,
    pub healthy_threshold: usize,
    pub unhealthy_threshold: usize,
    pub failure_threshold: usize,
    pub open_duration: Duration,
    pub backends: Vec<BackendConfig>,
}

#[derive(Clone, Debug, Serialize)]
pub struct BackendSnapshot {
    pub id: String,
    pub url: String,
    pub weight: usize,
    pub health: HealthState,
    pub circuit_state: CircuitState,
    pub active_connections: usize,
    pub total_requests: u64,
    pub failed_requests: u64,
}

#[derive(Clone, Debug)]
struct BackendRuntime {
    snapshot: BackendSnapshot,
    consecutive_successes: usize,
    consecutive_failures: usize,
    opened_at: Option<Instant>,
    half_open_probe: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct Metrics {
    pub requests_total: u64,
    pub requests_in_flight: usize,
    pub responses_by_status_class: HashMap<String, u64>,
    pub backend_requests: HashMap<String, u64>,
    pub routing_algorithm: RoutingAlgorithm,
}

#[derive(Debug)]
struct StateData {
    backends: HashMap<String, BackendRuntime>,
    order: Vec<String>,
    cursor: usize,
    metrics: Metrics,
}

#[derive(Clone)]
pub struct LoadBalancer {
    state: Arc<RwLock<StateData>>,
    config: Config,
}

impl BackendConfig {
    pub fn new(id: &str, url: &str, weight: usize) -> Self {
        Self {
            id: id.to_string(),
            url: url.trim_end_matches('/').to_string(),
            weight,
            health_path: "/health".to_string(),
        }
    }
}
pub fn default_config(backends: Vec<BackendConfig>) -> Config {
    Config {
        routing_algorithm: RoutingAlgorithm::RoundRobin,
        health_check_interval: Duration::from_secs(1),
        health_check_timeout: Duration::from_millis(500),
        healthy_threshold: 1,
        unhealthy_threshold: 1,
        failure_threshold: 2,
        open_duration: Duration::from_secs(1),
        backends,
    }
}

impl LoadBalancer {
    pub fn new(config: Config) -> Result<Self, String> {
        if config.backends.is_empty() {
            return Err("at least one backend is required".to_string());
        }
        let mut state = StateData {
            backends: HashMap::new(),
            order: Vec::new(),
            cursor: 0,
            metrics: Metrics {
                requests_total: 0,
                requests_in_flight: 0,
                responses_by_status_class: HashMap::new(),
                backend_requests: HashMap::new(),
                routing_algorithm: config.routing_algorithm,
            },
        };
        for backend in &config.backends {
            validate_backend(backend)?;
            if state.backends.contains_key(&backend.id) {
                return Err("duplicate backend id".to_string());
            }
            state.order.push(backend.id.clone());
            state.backends.insert(
                backend.id.clone(),
                BackendRuntime {
                    snapshot: BackendSnapshot {
                        id: backend.id.clone(),
                        url: backend.url.trim_end_matches('/').to_string(),
                        weight: backend.weight,
                        health: HealthState::Unknown,
                        circuit_state: CircuitState::Closed,
                        active_connections: 0,
                        total_requests: 0,
                        failed_requests: 0,
                    },
                    consecutive_successes: 0,
                    consecutive_failures: 0,
                    opened_at: None,
                    half_open_probe: false,
                },
            );
        }
        let lb = Self {
            state: Arc::new(RwLock::new(state)),
            config: config.clone(),
        };
        Ok(lb)
    }

    pub async fn add_backend(&self, backend: BackendConfig) -> Result<(), String> {
        validate_backend(&backend)?;
        let mut state = self.state.write().await;
        if state.backends.contains_key(&backend.id) {
            return Err("duplicate backend id".to_string());
        }
        state.order.push(backend.id.clone());
        state.backends.insert(
            backend.id.clone(),
            BackendRuntime {
                snapshot: BackendSnapshot {
                    id: backend.id,
                    url: backend.url,
                    weight: backend.weight,
                    health: HealthState::Unknown,
                    circuit_state: CircuitState::Closed,
                    active_connections: 0,
                    total_requests: 0,
                    failed_requests: 0,
                },
                consecutive_successes: 0,
                consecutive_failures: 0,
                opened_at: None,
                half_open_probe: false,
            },
        );
        Ok(())
    }

    pub async fn remove_backend(&self, id: &str) -> bool {
        let mut state = self.state.write().await;
        let existed = state.backends.remove(id).is_some();
        state.order.retain(|item| item != id);
        existed
    }
    pub async fn mark_healthy(&self, id: &str) {
        if let Some(backend) = self.state.write().await.backends.get_mut(id) {
            backend.snapshot.health = HealthState::Healthy;
        }
    }
    pub async fn snapshots(&self) -> Vec<BackendSnapshot> {
        let state = self.state.read().await;
        state
            .order
            .iter()
            .filter_map(|id| state.backends.get(id).map(|b| b.snapshot.clone()))
            .collect()
    }
    pub async fn metrics(&self) -> Metrics {
        self.state.read().await.metrics.clone()
    }

    pub async fn select_backend(&self) -> Option<BackendSnapshot> {
        let mut state = self.state.write().await;
        let eligible = weighted_eligible(&mut state, self.config.open_duration);
        if eligible.is_empty() {
            return None;
        }
        let selected_id = if self.config.routing_algorithm == RoutingAlgorithm::LeastConnections {
            eligible.into_iter().min_by_key(|id| {
                let b = &state.backends[id];
                (b.snapshot.active_connections, b.snapshot.id.clone())
            })?
        } else {
            let id = eligible[state.cursor % eligible.len()].clone();
            state.cursor += 1;
            id
        };
        state.backends.get(&selected_id).map(|b| b.snapshot.clone())
    }

    pub async fn check_backend(&self, id: &str) {
        let target = {
            let state = self.state.read().await;
            state
                .backends
                .get(id)
                .map(|b| format!("{}/health", b.snapshot.url))
        };
        let Some(url) = target else {
            return;
        };
        match raw_http_request(
            "GET",
            &url,
            HeaderMapLite::default(),
            Bytes::new(),
            self.config.health_check_timeout,
        )
        .await
        {
            Ok((status, _, _)) if (200..300).contains(&status) => {
                self.record_health_success(id).await
            }
            _ => self.record_health_failure(id).await,
        }
    }

    pub fn start_health_checks(&self) -> JoinHandle<()> {
        let lb = self.clone();
        tokio::spawn(async move {
            let mut ticker = time::interval(lb.config.health_check_interval);
            loop {
                ticker.tick().await;
                let ids: Vec<String> = {
                    let state = lb.state.read().await;
                    state.order.clone()
                };
                for id in ids {
                    let copy = lb.clone();
                    tokio::spawn(async move {
                        copy.check_backend(&id).await;
                    });
                }
            }
        })
    }

    pub fn router(self) -> Router {
        Router::new()
            .route("/__lb/health", get(admin_health))
            .route("/__lb/backends", get(admin_backends))
            .route("/__lb/metrics", get(admin_metrics))
            .fallback(proxy_handler)
            .with_state(Arc::new(self))
    }

    async fn record_health_success(&self, id: &str) {
        let mut state = self.state.write().await;
        if let Some(b) = state.backends.get_mut(id) {
            b.consecutive_successes += 1;
            b.consecutive_failures = 0;
            if b.consecutive_successes >= self.config.healthy_threshold {
                b.snapshot.health = HealthState::Healthy;
            }
            if b.snapshot.circuit_state == CircuitState::HalfOpen {
                b.snapshot.circuit_state = CircuitState::Closed;
            }
            info!(backend = id, "health_success");
        }
    }
    async fn record_health_failure(&self, id: &str) {
        let mut state = self.state.write().await;
        if let Some(b) = state.backends.get_mut(id) {
            b.consecutive_failures += 1;
            b.consecutive_successes = 0;
            if b.consecutive_failures >= self.config.unhealthy_threshold {
                b.snapshot.health = HealthState::Unhealthy;
            }
            record_failure_locked(b, self.config.failure_threshold);
            error!(backend = id, "health_failure");
        }
    }
    async fn record_failure(&self, id: &str) {
        let mut state = self.state.write().await;
        if let Some(b) = state.backends.get_mut(id) {
            record_failure_locked(b, self.config.failure_threshold);
        }
    }
}

fn validate_backend(backend: &BackendConfig) -> Result<(), String> {
    if backend.id.trim().is_empty() {
        return Err("backend id is required".to_string());
    }
    if backend.weight == 0 {
        return Err("backend weight must be >= 1".to_string());
    }
    if !(backend.url.starts_with("http://") || backend.url.starts_with("https://")) {
        return Err("backend url must be http(s)".to_string());
    }
    Ok(())
}
fn weighted_eligible(state: &mut StateData, open_duration: Duration) -> Vec<String> {
    let mut out = Vec::new();
    for id in &state.order {
        if let Some(b) = state.backends.get_mut(id) {
            if b.snapshot.circuit_state == CircuitState::Open
                && b.opened_at
                    .map(|t| t.elapsed() >= open_duration)
                    .unwrap_or(false)
            {
                b.snapshot.circuit_state = CircuitState::HalfOpen;
                b.half_open_probe = false;
            }
            let allowed = b.snapshot.circuit_state == CircuitState::Closed
                || (b.snapshot.circuit_state == CircuitState::HalfOpen && !b.half_open_probe);
            if b.snapshot.health != HealthState::Unhealthy && allowed {
                for _ in 0..b.snapshot.weight {
                    out.push(id.clone());
                }
            }
        }
    }
    out
}
fn record_failure_locked(backend: &mut BackendRuntime, threshold: usize) {
    backend.snapshot.failed_requests += 1;
    backend.consecutive_failures += 1;
    if backend.consecutive_failures >= threshold {
        backend.snapshot.circuit_state = CircuitState::Open;
        backend.opened_at = Some(Instant::now());
        backend.half_open_probe = false;
    }
}

async fn proxy_handler(
    State(lb): State<Arc<LoadBalancer>>,
    req: Request<Body>,
) -> impl IntoResponse {
    let Some(selected) = lb.select_backend().await else {
        return json_response(
            StatusCode::SERVICE_UNAVAILABLE,
            serde_json::json!({"error":{"code":"no_eligible_backend"}}),
        );
    };
    {
        let mut state = lb.state.write().await;
        if let Some(b) = state.backends.get_mut(&selected.id) {
            b.snapshot.active_connections += 1;
            b.snapshot.total_requests += 1;
        }
        state.metrics.requests_total += 1;
        state.metrics.requests_in_flight += 1;
        *state
            .metrics
            .backend_requests
            .entry(selected.id.clone())
            .or_insert(0) += 1;
    }
    let result = forward(&selected, req).await;
    let (status, response) = match result {
        Ok(resp) => (resp.status(), resp),
        Err(message) => {
            lb.record_failure(&selected.id).await;
            (
                StatusCode::BAD_GATEWAY,
                json_response(
                    StatusCode::BAD_GATEWAY,
                    serde_json::json!({"error":{"code":"bad_gateway","message":message}}),
                ),
            )
        }
    };
    {
        let mut state = lb.state.write().await;
        if let Some(b) = state.backends.get_mut(&selected.id) {
            b.snapshot.active_connections = b.snapshot.active_connections.saturating_sub(1);
            if status.is_server_error() {
                record_failure_locked(b, lb.config.failure_threshold);
            } else {
                b.consecutive_failures = 0;
                if b.snapshot.circuit_state == CircuitState::HalfOpen {
                    b.snapshot.circuit_state = CircuitState::Closed;
                }
            }
        }
        state.metrics.requests_in_flight = state.metrics.requests_in_flight.saturating_sub(1);
        *state
            .metrics
            .responses_by_status_class
            .entry(format!("{}xx", status.as_u16() / 100))
            .or_insert(0) += 1;
    }
    response
}

async fn forward(backend: &BackendSnapshot, req: Request<Body>) -> Result<Response<Body>, String> {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let headers = req.headers().clone();
    let body = to_bytes(req.into_body(), 8 * 1024 * 1024)
        .await
        .map_err(|e| e.to_string())?;
    let target = format!("{}{}", backend.url, path_and_query(&uri));
    let mut outbound = HeaderMapLite::default();
    for (name, value) in headers.iter() {
        if !is_hop_header(name.as_str()) {
            outbound.push(
                name.as_str().to_string(),
                value.to_str().unwrap_or_default().to_string(),
            );
        }
    }
    let request_id = headers.get("x-request-id").cloned().unwrap_or_else(|| {
        HeaderValue::from_str(&uuid::Uuid::new_v4().to_string())
            .unwrap_or_else(|_| HeaderValue::from_static("req"))
    });
    outbound.push(
        "x-request-id".to_string(),
        request_id.to_str().unwrap_or("req").to_string(),
    );
    outbound.push("x-forwarded-proto".to_string(), "http".to_string());
    let (status, response_headers, bytes) = raw_http_request(
        method.as_str(),
        &target,
        outbound,
        body,
        Duration::from_secs(5),
    )
    .await?;
    let mut response =
        Response::builder().status(StatusCode::from_u16(status).map_err(|e| e.to_string())?);
    for (name, value) in response_headers.0 {
        if !is_hop_header(&name) {
            response = response.header(name, value);
        }
    }
    response.body(Body::from(bytes)).map_err(|e| e.to_string())
}

fn path_and_query(uri: &Uri) -> String {
    uri.path_and_query()
        .map(|pq| pq.as_str().to_string())
        .unwrap_or_else(|| "/".to_string())
}
fn is_hop_header(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        "connection"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailer"
            | "transfer-encoding"
            | "upgrade"
    )
}

#[derive(Default)]
struct HeaderMapLite(Vec<(String, String)>);
impl HeaderMapLite {
    fn push(&mut self, name: String, value: String) {
        self.0.push((name, value));
    }
}

async fn raw_http_request(
    method: &str,
    target: &str,
    headers: HeaderMapLite,
    body: Bytes,
    timeout: Duration,
) -> Result<(u16, HeaderMapLite, Bytes), String> {
    let parsed = parse_http_url(target)?;
    let mut stream = time::timeout(
        timeout,
        TcpStream::connect((parsed.host.as_str(), parsed.port)),
    )
    .await
    .map_err(|_| "connect_timeout".to_string())?
    .map_err(|e| e.to_string())?;
    let mut request = format!(
        "{} {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nContent-Length: {}\r\n",
        method,
        parsed.path,
        parsed.host,
        body.len()
    );
    for (name, value) in headers.0 {
        request.push_str(&format!("{}: {}\r\n", name, value));
    }
    request.push_str("\r\n");
    stream
        .write_all(request.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    if !body.is_empty() {
        stream.write_all(&body).await.map_err(|e| e.to_string())?;
    }
    let mut raw = Vec::new();
    stream
        .read_to_end(&mut raw)
        .await
        .map_err(|e| e.to_string())?;
    parse_http_response(&raw)
}

struct ParsedUrl {
    host: String,
    port: u16,
    path: String,
}
fn parse_http_url(target: &str) -> Result<ParsedUrl, String> {
    let rest = target
        .strip_prefix("http://")
        .ok_or_else(|| "only http upstreams are supported by the teaching proxy".to_string())?;
    let (authority, path) = match rest.find('/') {
        Some(index) => (&rest[..index], &rest[index..]),
        None => (rest, "/"),
    };
    let (host, port) = match authority.rsplit_once(':') {
        Some((host, port)) => (
            host.to_string(),
            port.parse::<u16>()
                .map_err(|_| "invalid port".to_string())?,
        ),
        None => (authority.to_string(), 80),
    };
    Ok(ParsedUrl {
        host,
        port,
        path: path.to_string(),
    })
}
fn parse_http_response(raw: &[u8]) -> Result<(u16, HeaderMapLite, Bytes), String> {
    let split = raw
        .windows(4)
        .position(|w| w == b"\r\n\r\n")
        .ok_or_else(|| "invalid http response".to_string())?;
    let head = String::from_utf8(raw[..split].to_vec()).map_err(|e| e.to_string())?;
    let mut lines = head.lines();
    let status_line = lines
        .next()
        .ok_or_else(|| "missing status line".to_string())?;
    let status = status_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "missing status".to_string())?
        .parse::<u16>()
        .map_err(|e| e.to_string())?;
    let mut headers = HeaderMapLite::default();
    for line in lines {
        if let Some((name, value)) = line.split_once(':') {
            headers.push(name.trim().to_string(), value.trim().to_string());
        }
    }
    Ok((status, headers, Bytes::copy_from_slice(&raw[split + 4..])))
}
fn json_response(status: StatusCode, value: serde_json::Value) -> Response<Body> {
    let bytes = serde_json::to_vec(&value).unwrap_or_default();
    Response::builder()
        .status(status)
        .header("content-type", "application/json")
        .body(Body::from(bytes))
        .unwrap_or_else(|_| Response::new(Body::empty()))
}

#[derive(Serialize)]
struct HealthBody {
    status: &'static str,
    backend_summary: HashMap<&'static str, usize>,
}
async fn admin_health(State(lb): State<Arc<LoadBalancer>>) -> Json<HealthBody> {
    let snapshots = lb.snapshots().await;
    let mut summary = HashMap::from([("healthy", 0), ("unhealthy", 0), ("openCircuits", 0)]);
    for b in snapshots {
        if b.health == HealthState::Healthy {
            *summary.get_mut("healthy").expect("key exists") += 1;
        }
        if b.health == HealthState::Unhealthy {
            *summary.get_mut("unhealthy").expect("key exists") += 1;
        }
        if b.circuit_state == CircuitState::Open {
            *summary.get_mut("openCircuits").expect("key exists") += 1;
        }
    }
    Json(HealthBody {
        status: "ok",
        backend_summary: summary,
    })
}
async fn admin_backends(State(lb): State<Arc<LoadBalancer>>) -> Json<serde_json::Value> {
    Json(serde_json::json!({ "items": lb.snapshots().await }))
}
async fn admin_metrics(State(lb): State<Arc<LoadBalancer>>) -> Json<Metrics> {
    Json(lb.metrics().await)
}

pub async fn serve(addr: SocketAddr, lb: LoadBalancer) -> Result<(), std::io::Error> {
    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, lb.router()).await
}

pub async fn body_bytes(response: Response<Body>) -> Bytes {
    to_bytes(response.into_body(), 8 * 1024 * 1024)
        .await
        .unwrap_or_default()
}
