use axum::{
    routing::{get, post},
    extract::{Path, State},
    http::StatusCode,
    response::sse::{Event, Sse},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower_http::trace::TraceLayer;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ConfigValue {
    pub value: serde_json::Value,
    pub content_type: String,
    pub version: u64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub reason: Option<String>,
    pub author: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConfigRequest {
    pub value: serde_json::Value,
    pub content_type: String,
    pub reason: Option<String>,
    pub author: Option<String>,
    pub expected_version: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlagConfig {
    pub key: String,
    pub enabled: bool,
    pub default_treatment: String,
    pub treatments: Vec<String>,
    pub targeting_rules: Vec<TargetingRule>,
    pub rollout_percentage: u8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetingRule {
    pub attribute: String,
    pub operator: String,
    pub value: serde_json::Value,
    pub treatment: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationRequest {
    pub subject: HashMap<String, serde_json::Value>,
    pub default_treatment: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationResult {
    pub flag_key: String,
    pub treatment: String,
    pub reason: String,
}

#[derive(Clone, Debug)]
pub struct AppState {
    pub configs: Arc<RwLock<HashMap<String, ConfigValue>>>,
    pub history: Arc<RwLock<HashMap<String, Vec<ConfigValue>>>>,
    pub flags: Arc<RwLock<HashMap<String, FlagConfig>>>,
    pub tx: broadcast::Sender<(String, ConfigValue)>,
}

impl AppState {
    pub fn new() -> Self {
        let (tx, _rx) = broadcast::channel(100);
        Self {
            configs: Arc::new(RwLock::new(HashMap::new())),
            history: Arc::new(RwLock::new(HashMap::new())),
            flags: Arc::new(RwLock::new(HashMap::new())),
            tx,
        }
    }
}

async fn get_config(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
) -> Result<Json<ConfigValue>, StatusCode> {
    let configs = state.configs.read().await;
    match configs.get(&key) {
        Some(config) => Ok(Json(config.clone())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn put_config(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
    Json(req): Json<CreateConfigRequest>,
) -> Result<StatusCode, StatusCode> {
    let mut configs = state.configs.write().await;
    
    if let Some(expected) = req.expected_version {
        if let Some(existing) = configs.get(&key) {
            if existing.version != expected {
                return Err(StatusCode::CONFLICT);
            }
        }
    }

    let new_version = configs.get(&key).map(|c| c.version + 1).unwrap_or(1);
    
    let config = ConfigValue {
        value: req.value,
        content_type: req.content_type,
        version: new_version,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        reason: req.reason,
        author: req.author,
    };

    configs.insert(key.clone(), config.clone());
    
    let mut history = state.history.write().await;
    history.entry(key.clone()).or_insert_with(Vec::new).push(config.clone());
    
    let _ = state.tx.send((key, config));
    
    Ok(StatusCode::CREATED)
}

async fn get_flag(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
) -> Result<Json<FlagConfig>, StatusCode> {
    let flags = state.flags.read().await;
    match flags.get(&key) {
        Some(flag) => Ok(Json(flag.clone())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn put_flag(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
    Json(req): Json<FlagConfig>,
) -> StatusCode {
    let mut flags = state.flags.write().await;
    let mut flag = req;
    flag.key = key.clone();
    flags.insert(key, flag);
    StatusCode::CREATED
}

async fn evaluate_flag(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
    Json(req): Json<EvaluationRequest>,
) -> Result<Json<EvaluationResult>, StatusCode> {
    let flags = state.flags.read().await;
    let flag = match flags.get(&key) {
        Some(f) => f.clone(),
        None => return Err(StatusCode::NOT_FOUND),
    };
    drop(flags);

    if !flag.enabled {
        return Ok(Json(EvaluationResult {
            flag_key: key,
            treatment: flag.default_treatment,
            reason: "flag_disabled".to_string(),
        }));
    }

    // Check targeting rules
    for rule in &flag.targeting_rules {
        if let Some(subject_val) = req.subject.get(&rule.attribute) {
            let matches = match rule.operator.as_str() {
                "equals" => subject_val == &rule.value,
                "contains" => {
                    if let (Some(s), Some(v)) = (subject_val.as_str(), rule.value.as_str()) {
                        s.contains(v)
                    } else {
                        false
                    }
                }
                _ => false,
            };
            
            if matches {
                return Ok(Json(EvaluationResult {
                    flag_key: key,
                    treatment: rule.treatment.clone(),
                    reason: "targeting_rule".to_string(),
                }));
            }
        }
    }

    // Check rollout percentage using deterministic hashing
    if flag.rollout_percentage < 100 {
        if let Some(user_id) = req.subject.get("id").and_then(|v| v.as_str()) {
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(user_id.as_bytes());
            hasher.update(key.as_bytes());
            let result = hasher.finalize();
            let hash_val = u32::from_be_bytes([result[0], result[1], result[2], result[3]]);
            let percentage = (hash_val % 100) as u8;
            
            if percentage >= flag.rollout_percentage {
                return Ok(Json(EvaluationResult {
                    flag_key: key,
                    treatment: req.default_treatment,
                    reason: "rollout".to_string(),
                }));
            }
        }
    }

    Ok(Json(EvaluationResult {
        flag_key: key,
        treatment: flag.default_treatment.clone(),
        reason: "default".to_string(),
    }))
}

async fn health_check() -> StatusCode {
    StatusCode::OK
}

use std::convert::Infallible;
use futures::StreamExt;

async fn watch_config(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
) -> Sse<impl futures::Stream<Item = Result<Event, Infallible>>> {
    let rx = state.tx.subscribe();
    
    let stream = tokio_stream::wrappers::BroadcastStream::new(rx)
        .filter_map(move |result| {
            let k = key.clone();
            async move {
                match result {
                    Ok((event_key, config)) if event_key == k => {
                        Some(Ok::<_, Infallible>(Event::default()
                            .event("config.changed")
                            .data(serde_json::to_string(&config).unwrap())))
                    }
                    _ => None,
                }
            }
        });

    Sse::new(stream)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState::new());

    let app = Router::new()
        .route("/config/:key", get(get_config).put(put_config))
        .route("/config/:key/watch", get(watch_config))
        .route("/flags/:key", get(get_flag).put(put_flag))
        .route("/flags/:key/evaluate", post(evaluate_flag))
        .route("/__config/health", get(health_check))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::util::ServiceExt;

    fn app() -> Router {
        let state = Arc::new(AppState::new());
        Router::new()
            .route("/config/:key", get(get_config).put(put_config))
            .route("/config/:key/watch", get(watch_config))
            .route("/flags/:key", get(get_flag).put(put_flag))
            .route("/flags/:key/evaluate", post(evaluate_flag))
            .route("/__config/health", get(health_check))
            .with_state(state)
    }

    #[tokio::test]
    async fn test_health_check() {
        let response = app()
            .oneshot(Request::get("/__config/health").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_put_and_get_config() {
        let app = app();
        
        let put_response = app
            .clone()
            .oneshot(
                Request::put("/config/test-key")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"value":{"maxRetries":3},"contentType":"application/json"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(put_response.status(), StatusCode::CREATED);

        let get_response = app
            .oneshot(Request::get("/config/test-key").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(get_response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_config_not_found() {
        let response = app()
            .oneshot(Request::get("/config/nonexistent").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_put_flag_and_evaluate() {
        let app = app();
        
        let put_response = app
            .clone()
            .oneshot(
                Request::put("/flags/test-flag")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"key":"test-flag","enabled":true,"defaultTreatment":"off","treatments":["on","off"],"targetingRules":[],"rolloutPercentage":100}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(put_response.status(), StatusCode::CREATED);

        let eval_response = app
            .oneshot(
                Request::post("/flags/test-flag/evaluate")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"subject":{"id":"user-123"},"defaultTreatment":"off"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(eval_response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_evaluate_flag_not_found() {
        let response = app()
            .oneshot(
                Request::post("/flags/nonexistent/evaluate")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"subject":{"id":"user-123"},"defaultTreatment":"off"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_version_conflict() {
        let app = app();
        
        let put_response = app
            .clone()
            .oneshot(
                Request::put("/config/version-test")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"value":{"data":"v1"},"contentType":"application/json"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(put_response.status(), StatusCode::CREATED);

        let conflict_response = app
            .oneshot(
                Request::put("/config/version-test")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"value":{"data":"v2"},"contentType":"application/json","expectedVersion":99}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(conflict_response.status(), StatusCode::CONFLICT);
    }
}
