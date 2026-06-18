use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub log_id: String,
    #[serde(default = "Utc::now")]
    pub timestamp: DateTime<Utc>,
    #[serde(default = "Utc::now")]
    pub ingested_at: DateTime<Utc>,
    pub level: String,
    pub message: String,
    pub source: LogSource,
    #[serde(default)]
    pub correlation_id: Option<String>,
    #[serde(default)]
    pub trace_id: Option<String>,
    #[serde(default)]
    pub span_id: Option<String>,
    #[serde(default)]
    pub parent_span_id: Option<String>,
    #[serde(default)]
    pub attributes: HashMap<String, serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LogSource {
    pub service: String,
    #[serde(default)]
    pub host: Option<String>,
    #[serde(default)]
    pub environment: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub labels: HashMap<String, String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct IngestResponse {
    pub ok: bool,
    pub data: IngestData,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct IngestData {
    pub accepted: usize,
    pub duplicates: usize,
    pub rejected: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QueryResponse {
    pub ok: bool,
    pub data: QueryData,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QueryData {
    pub items: Vec<LogEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
    pub query: QueryInfo,
    pub stats: QueryStats,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QueryInfo {
    pub filter: String,
    pub level: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QueryStats {
    pub matched: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TraceResponse {
    pub ok: bool,
    pub data: TraceData,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TraceData {
    pub trace: TraceInfo,
    pub partial: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TraceInfo {
    pub trace_id: String,
    pub logs: Vec<LogEntry>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub data: HealthData,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HealthData {
    pub status: String,
    pub durability_mode: String,
    pub buffer_depth: usize,
}

pub struct LogStore {
    logs: RwLock<Vec<LogEntry>>,
    max_size: usize,
}

impl LogStore {
    pub fn new(max_size: usize) -> Self {
        LogStore {
            logs: RwLock::new(Vec::with_capacity(max_size)),
            max_size,
        }
    }

    pub async fn ingest(&self, mut entry: LogEntry) {
        if entry.log_id.is_empty() {
            entry.log_id = format!("{}", Utc::now().timestamp_nanos_opt().unwrap_or(0));
        }
        if entry.timestamp.timestamp() == 0 {
            entry.timestamp = Utc::now();
        }
        entry.ingested_at = Utc::now();

        let mut logs = self.logs.write().await;
        if logs.len() >= self.max_size {
            logs.remove(0);
        }
        logs.push(entry);
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn query(
        &self,
        level: String,
        source: Option<String>,
        correlation_id: Option<String>,
        trace_id: Option<String>,
        filter: String,
        start: Option<DateTime<Utc>>,
        end: Option<DateTime<Utc>>,
        limit: usize,
        order_desc: bool,
    ) -> Vec<LogEntry> {
        let logs = self.logs.read().await;
        let mut results: Vec<LogEntry> = logs
            .iter()
            .filter(|entry| {
                if let Some(s) = &start {
                    if entry.timestamp < *s {
                        return false;
                    }
                }
                if let Some(e) = &end {
                    if entry.timestamp > *e {
                        return false;
                    }
                }
                if !level.is_empty() && entry.level != level {
                        return false;
                    }
                if let Some(s) = &source {
                    if &entry.source.service != s {
                        return false;
                    }
                }
                if let Some(c) = &correlation_id {
                    if entry.correlation_id.as_ref() != Some(c) {
                        return false;
                    }
                }
                if let Some(t) = &trace_id {
                    if entry.trace_id.as_ref() != Some(t) {
                        return false;
                    }
                }
                if !filter.is_empty() && !entry.message.to_lowercase().contains(&filter.to_lowercase()) {
                    return false;
                }
                true
            })
            .cloned()
            .collect();

        if order_desc {
            results.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        } else {
            results.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        }

        if limit > 0 && results.len() > limit {
            results.truncate(limit);
        }
        results
    }

    pub async fn get_trace(&self, trace_id: &str) -> Vec<LogEntry> {
        let logs = self.logs.read().await;
        let mut results: Vec<LogEntry> = logs
            .iter()
            .filter(|entry| entry.trace_id.as_ref() == Some(&trace_id.to_string()))
            .cloned()
            .collect();
        results.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        results
    }

    pub async fn count(&self) -> usize {
        self.logs.read().await.len()
    }

    pub async fn apply_retention(&self, max_age: chrono::Duration) {
        let cutoff = Utc::now() - max_age;
        let mut logs = self.logs.write().await;
        logs.retain(|entry| entry.timestamp > cutoff);
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QueryParams {
    #[serde(default)]
    pub level: String,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
    #[serde(default)]
    pub trace_id: Option<String>,
    #[serde(default)]
    pub filter: String,
    #[serde(default)]
    pub start: Option<DateTime<Utc>>,
    #[serde(default)]
    pub end: Option<DateTime<Utc>>,
    #[serde(default = "default_limit")]
    pub limit: usize,
    #[serde(default)]
    pub order: String,
}

fn default_limit() -> usize {
    100
}

pub type AppState = Arc<LogStore>;

pub async fn ingest_handler(
    State(store): State<AppState>,
    Json(entry): Json<LogEntry>,
) -> Response {
    if entry.message.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"ok": false, "error": {"code": "invalid_log_entry", "message": "message is required"}}))).into_response();
    }
    if entry.level.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"ok": false, "error": {"code": "invalid_log_entry", "message": "level is required"}}))).into_response();
    }
    if entry.source.service.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"ok": false, "error": {"code": "invalid_log_entry", "message": "source.service is required"}}))).into_response();
    }

    store.ingest(entry).await;
    (StatusCode::ACCEPTED, Json(IngestResponse {
        ok: true,
        data: IngestData { accepted: 1, duplicates: 0, rejected: 0 },
    })).into_response()
}

pub async fn query_handler(
    State(store): State<AppState>,
    Query(params): Query<QueryParams>,
) -> Response {
    let level = params.level.clone();
    let filter = params.filter.clone();
    let correlation_id = params.correlation_id.clone();
    let items = store.query(
        params.level,
        params.source,
        params.correlation_id,
        params.trace_id,
        params.filter,
        params.start,
        params.end,
        params.limit,
        params.order == "desc",
    ).await;

    (StatusCode::OK, Json(QueryResponse {
        ok: true,
        data: QueryData {
            items,
            next_cursor: None,
            query: QueryInfo {
                filter,
                level,
                correlation_id,
            },
            stats: QueryStats { matched: 0 },
        },
    })).into_response()
}

pub async fn trace_handler(
    State(store): State<AppState>,
    axum::extract::Path(trace_id): axum::extract::Path<String>,
) -> Response {
    let logs = store.get_trace(&trace_id).await;
    (StatusCode::OK, Json(TraceResponse {
        ok: true,
        data: TraceData {
            trace: TraceInfo { trace_id, logs },
            partial: false,
        },
    })).into_response()
}

pub async fn health_handler(State(store): State<AppState>) -> Response {
    (StatusCode::OK, Json(HealthResponse {
        ok: true,
        data: HealthData {
            status: "ok".to_string(),
            durability_mode: "volatile_until_flush".to_string(),
            buffer_depth: store.count().await,
        },
    })).into_response()
}

pub async fn metrics_handler(State(store): State<AppState>) -> Response {
    (StatusCode::OK, Json(json!({
        "ok": true,
        "data": {
            "ingested_total": store.count().await,
        }
    }))).into_response()
}

pub fn app() -> Router {
    let store = Arc::new(LogStore::new(10000));
    Router::new()
        .route("/logs", post(ingest_handler).get(query_handler))
        .route("/traces/:trace_id", get(trace_handler))
        .route("/health", get(health_handler))
        .route("/metrics", get(metrics_handler))
        .with_state(store)
}

pub async fn run() {
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("log aggregator listening on 0.0.0.0:8080");
    axum::serve(listener, app()).await.unwrap();
}
