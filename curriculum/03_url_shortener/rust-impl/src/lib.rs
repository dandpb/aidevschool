use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    env,
    net::SocketAddr,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tokio::{net::TcpListener, signal, sync::mpsc};
use tracing_subscriber::EnvFilter;

const BASE62: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const MAX_URL_LENGTH: usize = 2048;
const MIN_ALIAS_LENGTH: usize = 3;
const MAX_ALIAS_LENGTH: usize = 32;
const MAX_BATCH_SIZE: usize = 100;

#[derive(Debug, Clone, Serialize)]
pub struct UrlRecord {
    pub code: String,
    pub short_url: String,
    pub original_url: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub clicks: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClickEvent {
    pub clicked_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub referrer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_agent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_ip_hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub code: String,
    pub original_url: String,
    pub total_clicks: usize,
    pub created_at: DateTime<Utc>,
    pub last_clicked_at: Option<DateTime<Utc>>,
    pub recent_clicks: Vec<ClickEvent>,
}

#[derive(Debug, Serialize)]
pub struct ListResponse {
    pub items: Vec<UrlRecord>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorEnvelope {
    pub error: ErrorBody,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorBody {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: &'static str,
}

impl ApiError {
    fn new(status: StatusCode, code: &'static str, message: &'static str) -> Self {
        Self {
            status,
            code,
            message,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = ErrorEnvelope {
            error: ErrorBody {
                code: self.code.to_string(),
                message: self.message.to_string(),
            },
        };
        (self.status, Json(body)).into_response()
    }
}

#[derive(Default)]
struct StoreInner {
    urls: HashMap<String, UrlRecord>,
    clicks: HashMap<String, Vec<ClickEvent>>,
    rate_limits: HashMap<String, Vec<DateTime<Utc>>>,
}

#[derive(Clone)]
pub struct AppState {
    inner: Arc<Mutex<StoreInner>>,
    counter: Arc<AtomicU64>,
    analytics: mpsc::Sender<QueuedClick>,
    base_url: String,
    rate_limit: usize,
}

#[derive(Clone)]
struct QueuedClick {
    code: String,
    event: ClickEvent,
}

#[derive(Debug, Deserialize)]
pub struct ShortenRequest {
    pub url: String,
    #[serde(default)]
    pub custom_alias: Option<String>,
    #[serde(default)]
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct BatchRequest {
    pub urls: Vec<ShortenRequest>,
}

#[derive(Debug, Serialize)]
pub struct BatchResult {
    pub index: usize,
    pub status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ListQuery {
    limit: Option<usize>,
    cursor: Option<String>,
}

impl AppState {
    pub fn new(base_url: impl Into<String>) -> Self {
        let (tx, mut rx) = mpsc::channel::<QueuedClick>(1024);
        let inner = Arc::new(Mutex::new(StoreInner::default()));
        let worker_inner = Arc::clone(&inner);
        tokio::spawn(async move {
            while let Some(click) = rx.recv().await {
                let mut guard = worker_inner.lock().expect("analytics mutex poisoned");
                if let Some(record) = guard.urls.get_mut(&click.code) {
                    if record.deleted_at.is_none() {
                        record.clicks += 1;
                        record.updated_at = Utc::now();
                        guard
                            .clicks
                            .entry(click.code)
                            .or_default()
                            .push(click.event);
                    }
                }
            }
        });
        Self {
            inner,
            counter: Arc::new(AtomicU64::new(0)),
            analytics: tx,
            base_url: base_url.into(),
            rate_limit: 60,
        }
    }

    pub fn with_rate_limit(mut self, limit: usize) -> Self {
        self.rate_limit = limit;
        self
    }

    pub fn create(&self, req: &ShortenRequest) -> Result<UrlRecord, ApiError> {
        validate_url(&req.url)?;
        if let Some(alias) = &req.custom_alias {
            validate_alias(alias)?;
        }
        let mut guard = self.inner.lock().expect("store mutex poisoned");
        let code = if let Some(alias) = &req.custom_alias {
            if guard.urls.contains_key(alias) {
                return Err(ApiError::new(
                    StatusCode::CONFLICT,
                    "alias_conflict",
                    "Alias already exists.",
                ));
            }
            alias.clone()
        } else {
            let mut generated = None;
            for _ in 0..10 {
                let candidate = self.next_code(&req.url);
                if !guard.urls.contains_key(&candidate) {
                    generated = Some(candidate);
                    break;
                }
            }
            generated.ok_or_else(|| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "code_generation_failed",
                    "Could not generate a unique code.",
                )
            })?
        };
        let now = Utc::now();
        let record = UrlRecord {
            short_url: format!("{}/{}", self.base_url.trim_end_matches('/'), code),
            code: code.clone(),
            original_url: req.url.clone(),
            created_at: now,
            updated_at: now,
            expires_at: req.expires_at,
            deleted_at: None,
            clicks: 0,
        };
        guard.urls.insert(code, record.clone());
        Ok(record)
    }

    pub fn resolve(&self, code: &str) -> Result<UrlRecord, ApiError> {
        let guard = self.inner.lock().expect("store mutex poisoned");
        let record = guard.urls.get(code).cloned().ok_or_else(|| {
            ApiError::new(
                StatusCode::NOT_FOUND,
                "code_not_found",
                "Code was not found.",
            )
        })?;
        if record.deleted_at.is_some() {
            return Err(ApiError::new(
                StatusCode::GONE,
                "code_deleted",
                "Code has been deleted.",
            ));
        }
        if record
            .expires_at
            .is_some_and(|expires| expires <= Utc::now())
        {
            return Err(ApiError::new(
                StatusCode::GONE,
                "code_expired",
                "Code has expired.",
            ));
        }
        Ok(record)
    }

    pub fn delete(&self, code: &str) -> Result<(), ApiError> {
        let mut guard = self.inner.lock().expect("store mutex poisoned");
        let record = guard.urls.get_mut(code).ok_or_else(|| {
            ApiError::new(
                StatusCode::NOT_FOUND,
                "code_not_found",
                "Code was not found.",
            )
        })?;
        if record.deleted_at.is_some() {
            return Err(ApiError::new(
                StatusCode::GONE,
                "code_deleted",
                "Code has been deleted.",
            ));
        }
        let now = Utc::now();
        record.deleted_at = Some(now);
        record.updated_at = now;
        Ok(())
    }

    pub fn stats(&self, code: &str) -> Result<StatsResponse, ApiError> {
        let record = self.resolve(code)?;
        let guard = self.inner.lock().expect("store mutex poisoned");
        let mut recent = guard.clicks.get(code).cloned().unwrap_or_default();
        if recent.len() > 10 {
            recent = recent.split_off(recent.len() - 10);
        }
        let last_clicked_at = recent.last().map(|event| event.clicked_at);
        Ok(StatsResponse {
            code: code.to_string(),
            original_url: record.original_url,
            total_clicks: record.clicks,
            created_at: record.created_at,
            last_clicked_at,
            recent_clicks: recent,
        })
    }

    fn list(&self, limit: usize, cursor: Option<String>) -> Result<ListResponse, ApiError> {
        if !(1..=100).contains(&limit) {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "invalid_pagination",
                "Limit must be between 1 and 100.",
            ));
        }
        let start = match cursor {
            Some(value) => value.parse::<usize>().map_err(|_| {
                ApiError::new(
                    StatusCode::BAD_REQUEST,
                    "invalid_pagination",
                    "Cursor is invalid.",
                )
            })?,
            None => 0,
        };
        let guard = self.inner.lock().expect("store mutex poisoned");
        let mut items = guard.urls.values().cloned().collect::<Vec<_>>();
        items.sort_by_key(|item| item.created_at);
        let bounded_start = start.min(items.len());
        let end = (bounded_start + limit).min(items.len());
        let next_cursor = (end < items.len()).then(|| end.to_string());
        Ok(ListResponse {
            items: items[bounded_start..end].to_vec(),
            next_cursor,
        })
    }

    fn allow_create(&self, key: &str) -> Result<(), ApiError> {
        let mut guard = self.inner.lock().expect("store mutex poisoned");
        let now = Utc::now();
        let cutoff = now - chrono::Duration::minutes(1);
        let bucket = guard.rate_limits.entry(key.to_string()).or_default();
        bucket.retain(|seen| *seen > cutoff);
        if bucket.len() >= self.rate_limit {
            return Err(ApiError::new(
                StatusCode::TOO_MANY_REQUESTS,
                "rate_limit_exceeded",
                "Too many create requests.",
            ));
        }
        bucket.push(now);
        Ok(())
    }

    fn next_code(&self, original: &str) -> String {
        let n = self.counter.fetch_add(1, Ordering::SeqCst) + 1;
        let mut hasher = Sha256::new();
        hasher.update(original.as_bytes());
        hasher.update(n.to_be_bytes());
        let digest = hasher.finalize();
        let mut value = n;
        for byte in digest.iter().take(6) {
            value = (value << 8) ^ u64::from(*byte);
        }
        base62(value)
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/shorten/batch", post(shorten_batch))
        .route("/shorten", post(shorten))
        .route("/urls", get(list_urls))
        .route("/:code/stats", get(stats))
        .route("/:code", get(redirect_code).delete(delete_code))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}

async fn shorten(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<ShortenRequest>,
) -> Result<(StatusCode, Json<UrlRecord>), ApiError> {
    state.allow_create(&client_key(&headers))?;
    let record = state.create(&req)?;
    tracing::info!(code = %record.code, "short_url_created");
    Ok((StatusCode::CREATED, Json(record)))
}

async fn shorten_batch(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<BatchRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), ApiError> {
    state.allow_create(&client_key(&headers))?;
    if req.urls.is_empty() {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_batch",
            "Batch must contain at least one URL.",
        ));
    }
    if req.urls.len() > MAX_BATCH_SIZE {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "batch_too_large",
            "Batch cannot contain more than 100 URLs.",
        ));
    }
    let results = req
        .urls
        .iter()
        .enumerate()
        .map(|(index, item)| match state.create(item) {
            Ok(record) => BatchResult {
                index,
                status: 201,
                code: Some(record.code),
                short_url: Some(record.short_url),
                error: None,
            },
            Err(error) => BatchResult {
                index,
                status: error.status.as_u16(),
                code: None,
                short_url: None,
                error: Some(error.code.to_string()),
            },
        })
        .collect::<Vec<_>>();
    Ok((
        StatusCode::MULTI_STATUS,
        Json(serde_json::json!({ "results": results })),
    ))
}

async fn list_urls(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<ListResponse>, ApiError> {
    Ok(Json(state.list(query.limit.unwrap_or(50), query.cursor)?))
}

async fn stats(
    Path(code): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<StatsResponse>, ApiError> {
    Ok(Json(state.stats(&code)?))
}

async fn delete_code(
    Path(code): Path<String>,
    State(state): State<AppState>,
) -> Result<StatusCode, ApiError> {
    state.delete(&code)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn redirect_code(
    Path(code): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let record = state.resolve(&code)?;
    let event = click_from_headers(&headers);
    if state
        .analytics
        .try_send(QueuedClick { code, event })
        .is_err()
    {
        tracing::warn!("analytics_queue_full");
    }
    Ok((
        StatusCode::MOVED_PERMANENTLY,
        [(header::LOCATION, record.original_url)],
    )
        .into_response())
}

fn validate_url(raw: &str) -> Result<(), ApiError> {
    if raw.is_empty() {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_url",
            "URL must use http or https and be absolute.",
        ));
    }
    if raw.len() > MAX_URL_LENGTH {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "max_url_length_exceeded",
            "URL must be no longer than 2048 characters.",
        ));
    }
    let without_scheme = if let Some(rest) = raw.strip_prefix("http://") {
        rest
    } else if let Some(rest) = raw.strip_prefix("https://") {
        rest
    } else {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_url",
            "URL must use http or https and be absolute.",
        ));
    };
    let host = without_scheme
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default();
    if host.is_empty() || host.contains(char::is_whitespace) {
        Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_url",
            "URL must use http or https and be absolute.",
        ))
    } else {
        Ok(())
    }
}

fn validate_alias(alias: &str) -> Result<(), ApiError> {
    let reserved = ["urls", "shorten", "health", "healthz"];
    if alias.len() < MIN_ALIAS_LENGTH
        || alias.len() > MAX_ALIAS_LENGTH
        || reserved.contains(&alias.to_ascii_lowercase().as_str())
        || !alias.chars().all(|c| c.is_ascii_alphanumeric())
    {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_alias",
            "Alias must be 3-32 base62 characters and not reserved.",
        ));
    }
    Ok(())
}

fn base62(mut value: u64) -> String {
    if value == 0 {
        return "0".to_string();
    }
    let mut out = Vec::new();
    while value > 0 {
        out.push(BASE62[(value % 62) as usize]);
        value /= 62;
    }
    while out.len() < 6 {
        out.push(b'0');
    }
    out.reverse();
    String::from_utf8(out).expect("base62 alphabet is valid utf8")
}

fn client_key(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("unknown")
        .to_string()
}

fn click_from_headers(headers: &HeaderMap) -> ClickEvent {
    let key = client_key(headers);
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    ClickEvent {
        clicked_at: Utc::now(),
        referrer: header_string(headers, header::REFERER, MAX_URL_LENGTH),
        user_agent: header_string(headers, header::USER_AGENT, 512),
        client_ip_hash: Some(hash[..16].to_string()),
    }
}

fn header_string(headers: &HeaderMap, name: header::HeaderName, max: usize) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.chars().take(max).collect())
}

pub fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    let _ = tracing_subscriber::fmt()
        .json()
        .with_env_filter(filter)
        .try_init();
}

pub async fn run() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let port = env::var("PORT").unwrap_or_else(|_| "8082".to_string());
    let addr: SocketAddr = if port.contains(':') {
        port.parse()?
    } else {
        format!("0.0.0.0:{port}").parse()?
    };
    let state = AppState::new(format!("http://localhost:{}", addr.port()));
    let listener = TcpListener::bind(addr).await?;
    tracing::info!(%addr, "server_listening");
    axum::serve(listener, router(state))
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    tokio::time::sleep(Duration::from_millis(1)).await;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        let mut stream = signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("install SIGTERM handler");
        stream.recv().await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{HeaderValue, Method, Request},
    };
    use tower::ServiceExt;

    async fn body_text(response: Response) -> String {
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body bytes");
        String::from_utf8(bytes.to_vec()).expect("utf8 body")
    }

    fn json_request(method: Method, uri: &str, body: &str) -> Request<Body> {
        Request::builder()
            .method(method)
            .uri(uri)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string()))
            .expect("request")
    }

    #[tokio::test]
    async fn creates_redirects_records_stats_and_deletes() {
        let state = AppState::new("http://localhost:8082");
        let app = router(state.clone());
        let create = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                "/shorten",
                r#"{"url":"https://example.com/a","custom_alias":"abc"}"#,
            ))
            .await
            .expect("create response");
        assert_eq!(create.status(), StatusCode::CREATED);
        let redirect = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/abc")
                    .header("x-forwarded-for", "203.0.113.1")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("redirect response");
        assert_eq!(redirect.status(), StatusCode::MOVED_PERMANENTLY);
        assert_eq!(
            redirect.headers().get(header::LOCATION),
            Some(&HeaderValue::from_static("https://example.com/a"))
        );
        tokio::time::sleep(Duration::from_millis(20)).await;
        let stats = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/abc/stats")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("stats response");
        assert_eq!(stats.status(), StatusCode::OK);
        assert!(body_text(stats).await.contains(r#""total_clicks":1"#));
        let deleted = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::DELETE)
                    .uri("/abc")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("delete response");
        assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
        let gone = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/abc")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("gone response");
        assert_eq!(gone.status(), StatusCode::GONE);
    }

    #[tokio::test]
    async fn rejects_invalid_inputs_conflicts_and_rate_limits() {
        let state = AppState::new("http://localhost:8082").with_rate_limit(1);
        let app = router(state);
        let invalid = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                "/shorten",
                r#"{"url":"ftp://example.com","custom_alias":"abc"}"#,
            ))
            .await
            .expect("invalid response");
        assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);
        assert!(body_text(invalid).await.contains("invalid_url"));
        let limited = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                "/shorten",
                r#"{"url":"https://example.com","custom_alias":"abcd"}"#,
            ))
            .await
            .expect("limited response");
        assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);

        let state = AppState::new("http://localhost:8082");
        let app = router(state);
        let first = app
            .clone()
            .oneshot(json_request(
                Method::POST,
                "/shorten",
                r#"{"url":"https://example.com","custom_alias":"taken"}"#,
            ))
            .await
            .expect("first response");
        assert_eq!(first.status(), StatusCode::CREATED);
        let conflict = app
            .oneshot(json_request(
                Method::POST,
                "/shorten",
                r#"{"url":"https://example.com/2","custom_alias":"taken"}"#,
            ))
            .await
            .expect("conflict response");
        assert_eq!(conflict.status(), StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn batch_list_health_and_expiry_work() {
        let state = AppState::new("http://localhost:8082");
        let app = router(state);
        let body = r#"{"urls":[{"url":"https://example.com/one","custom_alias":"one"},{"url":"file:///tmp/no"},{"url":"https://example.com/two"}]}"#;
        let batch = app
            .clone()
            .oneshot(json_request(Method::POST, "/shorten/batch", body))
            .await
            .expect("batch response");
        assert_eq!(batch.status(), StatusCode::MULTI_STATUS);
        let batch_body = body_text(batch).await;
        assert!(batch_body.contains(r#""status":201"#));
        assert!(batch_body.contains("invalid_url"));
        let list = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/urls?limit=1")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("list response");
        assert_eq!(list.status(), StatusCode::OK);
        assert!(body_text(list).await.contains("next_cursor"));
        let health = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("health response");
        assert_eq!(health.status(), StatusCode::OK);
        let expired_at = (Utc::now() - chrono::Duration::seconds(1)).to_rfc3339();
        let expired_body = format!(
            r#"{{"url":"https://example.com/old","custom_alias":"old","expires_at":"{expired_at}"}}"#
        );
        let created = app
            .clone()
            .oneshot(json_request(Method::POST, "/shorten", &expired_body))
            .await
            .expect("expired create");
        assert_eq!(created.status(), StatusCode::CREATED);
        let expired = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/old")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("expired response");
        assert_eq!(expired.status(), StatusCode::GONE);
    }

    #[test]
    fn pure_validation_and_encoding_helpers_are_deterministic() {
        assert!(validate_url("https://example.com").is_ok());
        assert!(validate_url("").is_err());
        assert!(validate_url(&format!("https://example.com/{}", "a".repeat(2050))).is_err());
        assert!(validate_alias("abc123").is_ok());
        assert!(validate_alias("ab").is_err());
        assert!(validate_alias("has-dash").is_err());
        assert!(validate_alias("shorten").is_err());
        assert_eq!(base62(0), "0");
        assert_eq!(client_key(&HeaderMap::new()), "unknown");
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            HeaderValue::from_static("203.0.113.10, 10.0.0.1"),
        );
        headers.insert(header::USER_AGENT, HeaderValue::from_static("agent"));
        assert_eq!(client_key(&headers), "203.0.113.10");
        assert_eq!(
            header_string(&headers, header::USER_AGENT, 2),
            Some("ag".to_string())
        );
        assert!(click_from_headers(&headers).client_ip_hash.is_some());
    }

    #[tokio::test]
    async fn store_methods_cover_missing_and_pagination_errors() {
        let state = AppState::new("http://localhost:8082");
        let first = state
            .create(&ShortenRequest {
                url: "https://example.com/one".to_string(),
                custom_alias: None,
                expires_at: None,
            })
            .expect("first create");
        let second = state
            .create(&ShortenRequest {
                url: "https://example.com/two".to_string(),
                custom_alias: None,
                expires_at: None,
            })
            .expect("second create");
        assert_ne!(first.code, second.code);
        assert_eq!(state.list(1, None).expect("page").items.len(), 1);
        assert!(state.list(0, None).is_err());
        assert!(state.list(10, Some("bad".to_string())).is_err());
        assert!(state.resolve("missing").is_err());
        assert!(state.delete("missing").is_err());
    }
}
