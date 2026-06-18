use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::Duration;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tower_http::{cors::CorsLayer, timeout::TimeoutLayer, trace::TraceLayer};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
#[derive(Default)]
pub enum MetricType {
    #[default]
    Counter,
    Gauge,
    Histogram,
    Timer,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricSample {
    pub name: String,
    #[serde(skip_deserializing)]
    pub metric_type: MetricType,
    pub value: f64,
    #[serde(default = "Utc::now")]
    pub timestamp: DateTime<Utc>,
    #[serde(default)]
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct TimeSeriesPoint {
    pub timestamp: DateTime<Utc>,
    pub value: f64,
}

#[derive(Debug, Clone, Default)]
pub struct HistogramData {
    pub buckets: Vec<HistogramBucket>,
    pub count: i64,
    pub sum: f64,
}

#[derive(Debug, Clone)]
pub struct HistogramBucket {
    pub upper_bound: f64,
    pub cumulative_count: i64,
}

impl Default for HistogramBucket {
    fn default() -> Self {
        Self {
            upper_bound: 0.0,
            cumulative_count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub rule_id: String,
    pub name: String,
    pub enabled: bool,
    pub query: String,
    pub operator: String,
    pub threshold: f64,
    pub window_seconds: i64,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEvent {
    pub alert_event_id: String,
    pub rule_id: String,
    pub triggered_at: DateTime<Utc>,
    pub observed_value: f64,
    pub threshold: f64,
    pub severity: String,
}

fn series_key(name: &str, metric_type: &MetricType, labels: &HashMap<String, String>) -> String {
    let mut parts = vec![format!("{:?}", metric_type), name.to_string()];
    let mut keys: Vec<_> = labels.keys().collect();
    keys.sort();
    for k in keys {
        parts.push(format!("{}={}", k, labels.get(k).unwrap()));
    }
    parts.join(",")
}

#[derive(Clone)]
pub struct MetricStore {
    samples: Arc<RwLock<HashMap<String, Vec<TimeSeriesPoint>>>>,
    histograms: Arc<RwLock<HashMap<String, HistogramData>>>,
    alerts: Arc<RwLock<HashMap<String, AlertRule>>>,
    pub events: Arc<RwLock<Vec<AlertEvent>>>,
    max_size: usize,
}

impl MetricStore {
    pub fn new(max_size: usize) -> Self {
        Self {
            samples: Arc::new(RwLock::new(HashMap::new())),
            histograms: Arc::new(RwLock::new(HashMap::new())),
            alerts: Arc::new(RwLock::new(HashMap::new())),
            events: Arc::new(RwLock::new(Vec::new())),
            max_size,
        }
    }

    pub fn record(&self, sample: MetricSample) {
        let key = series_key(&sample.name, &sample.metric_type, &sample.labels);
        match sample.metric_type {
            MetricType::Counter | MetricType::Gauge => {
                let mut samples = self.samples.write().unwrap();
                let points = samples.entry(key).or_default();
                if points.len() >= self.max_size {
                    points.remove(0);
                }
                points.push(TimeSeriesPoint {
                    timestamp: sample.timestamp,
                    value: sample.value,
                });
            }
            MetricType::Histogram | MetricType::Timer => {
                let mut histograms = self.histograms.write().unwrap();
                let h = histograms.entry(key).or_insert_with(|| {
                    let bounds = vec![0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, f64::MAX];
                    HistogramData {
                        buckets: bounds.into_iter().map(|b| HistogramBucket {
                            upper_bound: b,
                            cumulative_count: 0,
                        }).collect(),
                        count: 0,
                        sum: 0.0,
                    }
                });
                h.count += 1;
                h.sum += sample.value;
                for bucket in &mut h.buckets {
                    if sample.value <= bucket.upper_bound {
                        bucket.cumulative_count += 1;
                    }
                }
            }
        }
    }

    pub fn query(&self, name: &str, metric_type: MetricType, labels: &HashMap<String, String>, start: Option<DateTime<Utc>>, end: Option<DateTime<Utc>>, aggregation: &str) -> f64 {
        let key = series_key(name, &metric_type, labels);
        let samples = self.samples.read().unwrap();
        let points = samples.get(&key).cloned().unwrap_or_default();

        let values: Vec<f64> = points.into_iter()
            .filter(|p| {
                if let Some(s) = start { p.timestamp >= s } else { true }
            })
            .filter(|p| {
                if let Some(e) = end { p.timestamp <= e } else { true }
            })
            .map(|p| p.value)
            .collect();

        aggregate(&values, aggregation)
    }

    pub fn histogram_percentile(&self, name: &str, labels: &HashMap<String, String>, percentile: f64) -> f64 {
        let key = series_key(name, &MetricType::Histogram, labels);
        let histograms = self.histograms.read().unwrap();
        let h = histograms.get(&key).cloned()
            .or_else(|| histograms.get(&series_key(name, &MetricType::Timer, labels)).cloned());
        
        if let Some(h) = h {
            if h.count == 0 {
                return 0.0;
            }
            let target = (h.count as f64 * percentile) as i64;
            for bucket in &h.buckets {
                if bucket.cumulative_count >= target {
                    return bucket.upper_bound;
                }
            }
        }
        0.0
    }

    pub fn create_alert(&self, rule: AlertRule) {
        let mut alerts = self.alerts.write().unwrap();
        alerts.insert(rule.rule_id.clone(), rule);
    }

    pub fn evaluate_alerts(&self) {
        let alerts = self.alerts.read().unwrap();
        for (_, rule) in alerts.iter().filter(|(_, r)| r.enabled) {
            let parts: Vec<_> = rule.query.split('(').collect();
            if parts.len() < 2 {
                continue;
            }
            let agg = parts[0].trim();
            let name = parts[1].trim().trim_end_matches(')');

            let window = Duration::from_secs(rule.window_seconds as u64);
            let now = Utc::now();
            let start = now - chrono::Duration::from_std(window).unwrap_or_default();
            let value = self.aggregate_query(name, agg, start, now);

            let triggered = match rule.operator.as_str() {
                "gt" => value > rule.threshold,
                "gte" => value >= rule.threshold,
                "lt" => value < rule.threshold,
                "lte" => value <= rule.threshold,
                _ => false,
            };

            if triggered {
                let mut events = self.events.write().unwrap();
                events.push(AlertEvent {
                    alert_event_id: format!("evt_{}", Utc::now().timestamp_millis()),
                    rule_id: rule.rule_id.clone(),
                    triggered_at: Utc::now(),
                    observed_value: value,
                    threshold: rule.threshold,
                    severity: rule.severity.clone(),
                });
            }
        }
    }

    fn aggregate_query(&self, name: &str, aggregation: &str, start: DateTime<Utc>, end: DateTime<Utc>) -> f64 {
        let samples = self.samples.read().unwrap();
        let mut values = Vec::new();
        for (key, points) in samples.iter() {
            if key.contains(name) {
                for p in points {
                    if p.timestamp > start && p.timestamp < end {
                        values.push(p.value);
                    }
                }
            }
        }
        aggregate(&values, aggregation)
    }

    pub fn prometheus_export(&self) -> String {
        let samples = self.samples.read().unwrap();
        let histograms = self.histograms.read().unwrap();
        let mut output = String::new();

        for (key, points) in samples.iter() {
            let parts: Vec<_> = key.splitn(3, ',').collect();
            if parts.len() < 2 {
                continue;
            }
            let name = parts[1];
            let value = points.last().map(|p| p.value).unwrap_or(0.0);
            output.push_str(&format!("# TYPE {} {}\n", name, parts[0].to_lowercase()));
            let labels = if parts.len() > 2 && !parts[2].is_empty() {
                format!("{{{}}}", parts[2..].join(","))
            } else {
                String::new()
            };
            output.push_str(&format!("{} {} {}\n", name, labels, value));
        }

        for (key, h) in histograms.iter() {
            let parts: Vec<_> = key.splitn(3, ',').collect();
            if parts.len() < 2 {
                continue;
            }
            let name = parts[1];
            output.push_str(&format!("# TYPE {} histogram\n", name));
            for bucket in &h.buckets {
                output.push_str(&format!("{}_bucket{{le=\"{}\"}} {}\n", name, bucket.upper_bound, bucket.cumulative_count));
            }
            output.push_str(&format!("{}_sum {}\n", name, h.sum));
            output.push_str(&format!("{}_count {}\n", name, h.count));
        }

        output
    }
}

fn aggregate(values: &[f64], aggregation: &str) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    match aggregation {
        "sum" => values.iter().sum(),
        "avg" => values.iter().sum::<f64>() / values.len() as f64,
        "min" => *values.iter().min_by(|a, b| a.partial_cmp(b).unwrap()).unwrap(),
        "max" => *values.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap(),
        "count" => values.len() as f64,
        "p50" | "p95" | "p99" => {
            let mut sorted = values.to_vec();
            sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let idx = match aggregation {
                "p50" => ((sorted.len() - 1) as f64 * 0.50) as usize,
                "p95" => ((sorted.len() - 1) as f64 * 0.95) as usize,
                "p99" => ((sorted.len() - 1) as f64 * 0.99) as usize,
                _ => 0,
            };
            sorted[idx]
        }
        _ => 0.0,
    }
}

#[derive(Clone)]
pub struct AppState {
    pub store: MetricStore,
}

#[derive(Serialize)]
struct ApiResponse<T> {
    ok: bool,
    data: Option<T>,
    error: Option<ApiError>,
}

#[derive(Serialize)]
struct ApiError {
    code: String,
    message: String,
}

#[derive(Deserialize)]
struct RecordPayload {
    name: String,
    value: f64,
    #[serde(default)]
    timestamp: Option<DateTime<Utc>>,
    #[serde(default)]
    labels: HashMap<String, String>,
}

#[derive(Deserialize)]
struct QueryParams {
    query: String,
    #[serde(default)]
    start: Option<DateTime<Utc>>,
    #[serde(default)]
    end: Option<DateTime<Utc>>,
}

async fn handle_record(
    State(state): State<AppState>,
    axum::extract::Path(metric_type): axum::extract::Path<String>,
    Json(payload): Json<RecordPayload>,
) -> impl IntoResponse {
    let metric_type = match metric_type.as_str() {
        "counter" => MetricType::Counter,
        "gauge" => MetricType::Gauge,
        "histogram" => MetricType::Histogram,
        "timer" => MetricType::Timer,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::<serde_json::Value> {
                    ok: false,
                    data: None,
                    error: Some(ApiError {
                        code: "invalid_metric_type".into(),
                        message: format!("unknown metric type: {}", metric_type),
                    }),
                }),
            );
        }
    };

    if payload.name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<serde_json::Value> {
                ok: false,
                data: None,
                error: Some(ApiError {
                    code: "invalid_metric_sample".into(),
                    message: "name is required".into(),
                }),
            }),
        );
    }

    let sample = MetricSample {
        name: payload.name,
        metric_type,
        value: payload.value,
        timestamp: payload.timestamp.unwrap_or_else(Utc::now),
        labels: payload.labels,
    };

    state.store.record(sample);

    (
        StatusCode::ACCEPTED,
        Json(ApiResponse {
            ok: true,
            data: Some(serde_json::json!({
                "accepted": 1,
                "duplicates": 0,
                "rejected": 0,
            })),
            error: None,
        }),
    )
}

async fn handle_query(
    State(state): State<AppState>,
    Query(params): Query<QueryParams>,
) -> impl IntoResponse {
    let (agg, name) = parse_query(&params.query);
    let value = state.store.query(&name, MetricType::Gauge, &HashMap::new(), params.start, params.end, &agg);

    (
        StatusCode::OK,
        Json(ApiResponse {
            ok: true,
            data: Some(serde_json::json!({
                "query": params.query,
                "value": value,
            })),
            error: None,
        }),
    )
}

async fn handle_prometheus(State(state): State<AppState>) -> impl IntoResponse {
    (
        StatusCode::OK,
        [("Content-Type", "text/plain; version=0.0.4")],
        state.store.prometheus_export(),
    )
}

async fn handle_dashboard() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(ApiResponse {
            ok: true,
            data: Some(serde_json::json!({
                "dashboard_id": "default",
                "panels": Vec::<serde_json::Value>::new(),
                "alerts": Vec::<serde_json::Value>::new(),
            })),
            error: None,
        }),
    )
}

#[derive(Deserialize)]
struct AlertRulePayload {
    rule_id: String,
    name: String,
    enabled: bool,
    query: String,
    operator: String,
    threshold: f64,
    window_seconds: i64,
    severity: String,
}

async fn handle_create_alert(
    State(state): State<AppState>,
    Json(payload): Json<AlertRulePayload>,
) -> impl IntoResponse {
    state.store.create_alert(AlertRule {
        rule_id: payload.rule_id.clone(),
        name: payload.name,
        enabled: payload.enabled,
        query: payload.query,
        operator: payload.operator,
        threshold: payload.threshold,
        window_seconds: payload.window_seconds,
        severity: payload.severity,
    });

    (
        StatusCode::CREATED,
        Json(ApiResponse {
            ok: true,
            data: Some(serde_json::json!({
                "rule_id": payload.rule_id,
                "status": "enabled",
            })),
            error: None,
        }),
    )
}

async fn handle_list_alerts() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(ApiResponse {
            ok: true,
            data: Some(serde_json::json!({
                "items": Vec::<serde_json::Value>::new(),
            })),
            error: None,
        }),
    )
}

async fn handle_health() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(ApiResponse {
            ok: true,
            data: Some(serde_json::json!({
                "status": "ok",
                "durability_mode": "volatile_until_flush",
                "active_series": 0,
            })),
            error: None,
        }),
    )
}

fn parse_query(query: &str) -> (String, String) {
    let parts: Vec<_> = query.split('(').collect();
    if parts.len() < 2 {
        return ("sum".into(), query.into());
    }
    let agg = parts[0].trim().to_string();
    let name = parts[1].trim().trim_end_matches(')').to_string();
    (agg, name)
}

pub fn app() -> Router {
    let state = AppState {
        store: MetricStore::new(10000),
    };

    Router::new()
        .route("/metrics/:metric_type", post(handle_record))
        .route("/metrics", get(|| async { "use /metrics/:metric_type or /metrics?query=..." }))
        .route("/metrics/query", get(handle_query))
        .route("/metrics/prometheus", get(handle_prometheus))
        .route("/dashboard", get(handle_dashboard))
        .route("/alerts/rules", post(handle_create_alert).get(handle_list_alerts))
        .route("/health", get(handle_health))
        .layer(TraceLayer::new_for_http())
        .layer(#[allow(deprecated)] TimeoutLayer::new(Duration::from_secs(30)))
        .layer(CorsLayer::permissive())
        .with_state(state)
}
