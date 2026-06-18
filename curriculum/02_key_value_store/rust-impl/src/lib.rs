use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post, put},
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
use tokio::signal;
use tracing::info;

const DEFAULT_MAX_KEY_BYTES: usize = 512;
const DEFAULT_MAX_VALUE_BYTES: usize = 1 << 20;
const DEFAULT_MAX_KEYS: usize = 100_000;
const DEFAULT_MAX_MEMORY_BYTES: usize = 256 << 20;
const ENTRY_OVERHEAD_BYTES: usize = 64;
const MAX_TTL_SECONDS: u64 = 30 * 24 * 60 * 60;

#[derive(Clone, Copy)]
pub struct Config {
    pub max_key_bytes: usize,
    pub max_value_bytes: usize,
    pub max_keys: usize,
    pub max_memory_bytes: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            max_key_bytes: DEFAULT_MAX_KEY_BYTES,
            max_value_bytes: DEFAULT_MAX_VALUE_BYTES,
            max_keys: DEFAULT_MAX_KEYS,
            max_memory_bytes: DEFAULT_MAX_MEMORY_BYTES,
        }
    }
}

#[derive(Clone)]
pub struct Store {
    inner: Arc<Mutex<StoreState>>,
    config: Config,
}

#[derive(Default)]
struct StoreState {
    entries: HashMap<String, StoredEntry>,
    approx_memory_bytes: usize,
    commands_processed: u64,
    expired_keys_removed: u64,
}

#[derive(Clone)]
struct StoredEntry {
    value: Value,
    created_at: Instant,
    updated_at: Instant,
    expires_at: Option<Instant>,
    expires_at_system: Option<SystemTime>,
    approx_bytes: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorCode {
    InvalidCommand,
    InvalidJson,
    InvalidKey,
    KeyTooLong,
    InvalidTtl,
    InvalidLimit,
    KeyNotFound,
    ValueTooLarge,
    StoreFull,
    MemoryLimitExceeded,
}

impl ErrorCode {
    fn as_str(&self) -> &'static str {
        match self {
            Self::InvalidCommand => "INVALID_COMMAND",
            Self::InvalidJson => "INVALID_JSON",
            Self::InvalidKey => "INVALID_KEY",
            Self::KeyTooLong => "KEY_TOO_LONG",
            Self::InvalidTtl => "INVALID_TTL",
            Self::InvalidLimit => "INVALID_LIMIT",
            Self::KeyNotFound => "KEY_NOT_FOUND",
            Self::ValueTooLarge => "VALUE_TOO_LARGE",
            Self::StoreFull => "STORE_FULL",
            Self::MemoryLimitExceeded => "MEMORY_LIMIT_EXCEEDED",
        }
    }
}

#[derive(Debug, Clone)]
pub struct StoreError {
    code: ErrorCode,
    message: String,
}

impl StoreError {
    fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct EntryView {
    key: String,
    value: Value,
    #[serde(rename = "ttlSeconds")]
    ttl_seconds: Option<i64>,
    #[serde(rename = "expiresAt")]
    expires_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Pair {
    key: String,
    value: Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct MGetItem {
    key: String,
    value: Value,
    found: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct Health {
    status: &'static str,
    #[serde(rename = "keyCount")]
    key_count: usize,
    #[serde(rename = "approxMemoryBytes")]
    approx_memory_bytes: usize,
    #[serde(rename = "commandsProcessed")]
    commands_processed: u64,
    #[serde(rename = "expiredKeysRemoved")]
    expired_keys_removed: u64,
}

impl Store {
    pub fn new(config: Config) -> Self {
        Self {
            inner: Arc::new(Mutex::new(StoreState::default())),
            config,
        }
    }

    pub fn set(
        &self,
        key: &str,
        value: Value,
        ttl_seconds: Option<u64>,
    ) -> Result<Option<String>, StoreError> {
        let mut state = self.lock();
        state.commands_processed += 1;
        self.remove_expired_locked(&mut state, Instant::now());
        let plan = self.validate_write_locked(&state, key, &value, ttl_seconds)?;
        let now = Instant::now();
        let old = state.entries.get(key).cloned();
        let created_at = old.as_ref().map_or(now, |entry| entry.created_at);
        state.approx_memory_bytes = state.approx_memory_bytes + plan.approx_bytes
            - old.map_or(0, |entry| entry.approx_bytes);
        state.entries.insert(
            key.to_owned(),
            StoredEntry {
                value,
                created_at,
                updated_at: now,
                expires_at: plan.expires_at,
                expires_at_system: plan.expires_at_system,
                approx_bytes: plan.approx_bytes,
            },
        );
        Ok(plan.expires_at_system.map(format_system_time))
    }

    pub fn get(&self, key: &str) -> Option<EntryView> {
        let mut state = self.lock();
        state.commands_processed += 1;
        let now = Instant::now();
        if !self.valid_stored_key_locked(&mut state, key, now) {
            return None;
        }
        state
            .entries
            .get(key)
            .map(|entry| view_entry(key, entry, now))
    }

    pub fn delete(&self, keys: &[String]) -> usize {
        let mut state = self.lock();
        state.commands_processed += 1;
        let now = Instant::now();
        let mut deleted = 0;
        for key in keys {
            if self.valid_stored_key_locked(&mut state, key, now) {
                remove_key(&mut state, key);
                deleted += 1;
            }
        }
        deleted
    }

    pub fn expire(&self, key: &str, ttl_seconds: u64) -> Result<String, StoreError> {
        validate_ttl(ttl_seconds)?;
        let mut state = self.lock();
        state.commands_processed += 1;
        let now = Instant::now();
        if !self.valid_stored_key_locked(&mut state, key, now) {
            return Err(StoreError::new(ErrorCode::KeyNotFound, "key not found"));
        }
        let expires_at = now + Duration::from_secs(ttl_seconds);
        let expires_at_system = SystemTime::now() + Duration::from_secs(ttl_seconds);
        if let Some(entry) = state.entries.get_mut(key) {
            entry.expires_at = Some(expires_at);
            entry.expires_at_system = Some(expires_at_system);
            entry.updated_at = now;
        }
        Ok(format_system_time(expires_at_system))
    }

    pub fn ttl(&self, key: &str) -> i64 {
        let mut state = self.lock();
        state.commands_processed += 1;
        let now = Instant::now();
        if !self.valid_stored_key_locked(&mut state, key, now) {
            return -2;
        }
        match state.entries.get(key).and_then(|entry| entry.expires_at) {
            Some(expires_at) => remaining_seconds(expires_at, now),
            None => -1,
        }
    }

    pub fn persist(&self, key: &str) -> Result<bool, StoreError> {
        let mut state = self.lock();
        state.commands_processed += 1;
        let now = Instant::now();
        if !self.valid_stored_key_locked(&mut state, key, now) {
            return Err(StoreError::new(ErrorCode::KeyNotFound, "key not found"));
        }
        let entry = state.entries.get_mut(key).expect("key checked above");
        let changed = entry.expires_at.take().is_some();
        entry.expires_at_system = None;
        entry.updated_at = now;
        Ok(changed)
    }

    pub fn keys(&self, prefix: &str, limit: usize) -> Vec<String> {
        let mut state = self.lock();
        state.commands_processed += 1;
        self.remove_expired_locked(&mut state, Instant::now());
        let mut keys = state
            .entries
            .keys()
            .filter(|key| key.starts_with(prefix))
            .cloned()
            .collect::<Vec<_>>();
        keys.sort();
        keys.truncate(limit);
        keys
    }

    pub fn mget(&self, keys: &[String]) -> Vec<MGetItem> {
        let mut state = self.lock();
        state.commands_processed += 1;
        let now = Instant::now();
        keys.iter()
            .map(|key| {
                if self.valid_stored_key_locked(&mut state, key, now) {
                    let value = state
                        .entries
                        .get(key)
                        .map_or(Value::Null, |entry| entry.value.clone());
                    MGetItem {
                        key: key.clone(),
                        value,
                        found: true,
                    }
                } else {
                    MGetItem {
                        key: key.clone(),
                        value: Value::Null,
                        found: false,
                    }
                }
            })
            .collect()
    }

    pub fn mset(
        &self,
        items: Vec<Pair>,
        ttl_seconds: Option<u64>,
    ) -> Result<Option<String>, StoreError> {
        let mut state = self.lock();
        state.commands_processed += 1;
        self.remove_expired_locked(&mut state, Instant::now());
        let mut seen = HashSet::new();
        let mut plans = Vec::with_capacity(items.len());
        let mut new_key_count = state.entries.len();
        let mut new_memory = state.approx_memory_bytes;
        for item in &items {
            if !seen.insert(item.key.clone()) {
                return Err(StoreError::new(
                    ErrorCode::InvalidKey,
                    "duplicate key in mset",
                ));
            }
            let plan = self.validate_write_locked(&state, &item.key, &item.value, ttl_seconds)?;
            if !state.entries.contains_key(&item.key) {
                new_key_count += 1;
            }
            let old_bytes = state
                .entries
                .get(&item.key)
                .map_or(0, |entry| entry.approx_bytes);
            new_memory = new_memory + plan.approx_bytes - old_bytes;
            plans.push(plan);
        }
        if new_key_count > self.config.max_keys {
            return Err(StoreError::new(
                ErrorCode::StoreFull,
                "store key limit exceeded",
            ));
        }
        if new_memory > self.config.max_memory_bytes {
            return Err(StoreError::new(
                ErrorCode::MemoryLimitExceeded,
                "memory limit exceeded",
            ));
        }
        let now = Instant::now();
        for (item, plan) in items.into_iter().zip(plans.into_iter()) {
            let created_at = state
                .entries
                .get(&item.key)
                .map_or(now, |entry| entry.created_at);
            state.entries.insert(
                item.key,
                StoredEntry {
                    value: item.value,
                    created_at,
                    updated_at: now,
                    expires_at: plan.expires_at,
                    expires_at_system: plan.expires_at_system,
                    approx_bytes: plan.approx_bytes,
                },
            );
        }
        state.approx_memory_bytes = new_memory;
        Ok(ttl_seconds
            .map(|seconds| format_system_time(SystemTime::now() + Duration::from_secs(seconds))))
    }

    pub fn flushdb(&self) -> usize {
        let mut state = self.lock();
        state.commands_processed += 1;
        let deleted = state.entries.len();
        state.entries.clear();
        state.approx_memory_bytes = 0;
        deleted
    }

    pub fn health(&self) -> Health {
        let mut state = self.lock();
        self.remove_expired_locked(&mut state, Instant::now());
        Health {
            status: "ok",
            key_count: state.entries.len(),
            approx_memory_bytes: state.approx_memory_bytes,
            commands_processed: state.commands_processed,
            expired_keys_removed: state.expired_keys_removed,
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, StoreState> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn validate_write_locked(
        &self,
        state: &StoreState,
        key: &str,
        value: &Value,
        ttl_seconds: Option<u64>,
    ) -> Result<WritePlan, StoreError> {
        self.validate_key(key)?;
        if let Some(seconds) = ttl_seconds {
            validate_ttl(seconds)?;
        }
        let serialized = serde_json::to_vec(value).map_err(|_| {
            StoreError::new(ErrorCode::InvalidJson, "value is not JSON serializable")
        })?;
        if serialized.len() > self.config.max_value_bytes {
            return Err(StoreError::new(
                ErrorCode::ValueTooLarge,
                "value is too large",
            ));
        }
        if !state.entries.contains_key(key) && state.entries.len() >= self.config.max_keys {
            return Err(StoreError::new(
                ErrorCode::StoreFull,
                "store key limit exceeded",
            ));
        }
        let old_bytes = state.entries.get(key).map_or(0, |entry| entry.approx_bytes);
        let approx_bytes = key.len() + serialized.len() + ENTRY_OVERHEAD_BYTES;
        if state.approx_memory_bytes + approx_bytes - old_bytes > self.config.max_memory_bytes {
            return Err(StoreError::new(
                ErrorCode::MemoryLimitExceeded,
                "memory limit exceeded",
            ));
        }
        let expires_at = ttl_seconds.map(|seconds| Instant::now() + Duration::from_secs(seconds));
        let expires_at_system =
            ttl_seconds.map(|seconds| SystemTime::now() + Duration::from_secs(seconds));
        Ok(WritePlan {
            approx_bytes,
            expires_at,
            expires_at_system,
        })
    }

    fn validate_key(&self, key: &str) -> Result<(), StoreError> {
        if key.is_empty() {
            return Err(StoreError::new(
                ErrorCode::InvalidKey,
                "key must be non-empty",
            ));
        }
        if key.len() > self.config.max_key_bytes {
            return Err(StoreError::new(ErrorCode::KeyTooLong, "key is too long"));
        }
        Ok(())
    }

    fn valid_stored_key_locked(&self, state: &mut StoreState, key: &str, now: Instant) -> bool {
        if state
            .entries
            .get(key)
            .is_some_and(|entry| is_expired(entry, now))
        {
            remove_key(state, key);
            state.expired_keys_removed += 1;
            return false;
        }
        state.entries.contains_key(key)
    }

    fn remove_expired_locked(&self, state: &mut StoreState, now: Instant) {
        let expired = state
            .entries
            .iter()
            .filter_map(|(key, entry)| is_expired(entry, now).then_some(key.clone()))
            .collect::<Vec<_>>();
        for key in expired {
            remove_key(state, &key);
            state.expired_keys_removed += 1;
        }
    }
}

struct WritePlan {
    approx_bytes: usize,
    expires_at: Option<Instant>,
    expires_at_system: Option<SystemTime>,
}

fn validate_ttl(ttl_seconds: u64) -> Result<(), StoreError> {
    if ttl_seconds == 0 || ttl_seconds > MAX_TTL_SECONDS {
        return Err(StoreError::new(
            ErrorCode::InvalidTtl,
            "ttlSeconds must be between 1 and 2592000",
        ));
    }
    Ok(())
}

fn remove_key(state: &mut StoreState, key: &str) {
    if let Some(entry) = state.entries.remove(key) {
        state.approx_memory_bytes = state.approx_memory_bytes.saturating_sub(entry.approx_bytes);
    }
}

fn is_expired(entry: &StoredEntry, now: Instant) -> bool {
    entry.expires_at.is_some_and(|expires_at| expires_at <= now)
}

fn view_entry(key: &str, entry: &StoredEntry, now: Instant) -> EntryView {
    EntryView {
        key: key.to_owned(),
        value: entry.value.clone(),
        ttl_seconds: entry
            .expires_at
            .map(|expires_at| remaining_seconds(expires_at, now)),
        expires_at: entry.expires_at_system.map(format_system_time),
    }
}

fn remaining_seconds(expires_at: Instant, now: Instant) -> i64 {
    expires_at.saturating_duration_since(now).as_secs() as i64
}

fn format_system_time(value: SystemTime) -> String {
    let seconds = value
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{seconds}")
}

#[derive(Clone)]
struct AppState {
    store: Store,
}

#[derive(Deserialize)]
struct SetRequest {
    value: Value,
    #[serde(rename = "ttlSeconds")]
    ttl_seconds: Option<u64>,
}

#[derive(Deserialize)]
struct TtlRequest {
    #[serde(rename = "ttlSeconds")]
    ttl_seconds: u64,
}

#[derive(Deserialize)]
struct KeysQuery {
    prefix: Option<String>,
    limit: Option<usize>,
}

#[derive(Deserialize)]
struct MGetRequest {
    keys: Vec<String>,
}

#[derive(Deserialize)]
struct MSetRequest {
    items: Vec<Pair>,
    #[serde(rename = "ttlSeconds")]
    ttl_seconds: Option<u64>,
}

pub fn router(store: Store) -> Router {
    let state = AppState { store };
    Router::new()
        .route("/health", get(health_handler))
        .route(
            "/v1/kv/:key",
            put(set_handler).get(get_handler).delete(delete_handler),
        )
        .route("/v1/kv/:key/expire", post(expire_handler))
        .route("/v1/kv/:key/ttl", get(ttl_handler))
        .route("/v1/kv/:key/persist", post(persist_handler))
        .route("/v1/keys", get(keys_handler))
        .route("/v1/mget", post(mget_handler))
        .route("/v1/mset", post(mset_handler))
        .route("/v1/flushdb", post(flushdb_handler))
        .fallback(invalid_command_handler)
        .with_state(state)
}

async fn health_handler(State(state): State<AppState>) -> impl IntoResponse {
    ok(state.store.health())
}

async fn set_handler(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Json(body): Json<SetRequest>,
) -> Response {
    match state.store.set(&key, body.value, body.ttl_seconds) {
        Ok(expires_at) => {
            ok(json!({ "key": key, "stored": true, "expiresAt": expires_at })).into_response()
        }
        Err(err) => err.into_response(),
    }
}

async fn get_handler(State(state): State<AppState>, Path(key): Path<String>) -> Response {
    match state.store.get(&key) {
        Some(entry) => ok(entry).into_response(),
        None => StoreError::new(ErrorCode::KeyNotFound, "key not found").into_response(),
    }
}

async fn delete_handler(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> impl IntoResponse {
    ok(json!({ "deleted": state.store.delete(&[key]) }))
}

async fn expire_handler(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Json(body): Json<TtlRequest>,
) -> Response {
    match state.store.expire(&key, body.ttl_seconds) {
        Ok(expires_at) => {
            ok(json!({ "updated": true, "ttlSeconds": body.ttl_seconds, "expiresAt": expires_at }))
                .into_response()
        }
        Err(err) => err.into_response(),
    }
}

async fn ttl_handler(State(state): State<AppState>, Path(key): Path<String>) -> impl IntoResponse {
    ok(json!({ "ttlSeconds": state.store.ttl(&key) }))
}

async fn persist_handler(State(state): State<AppState>, Path(key): Path<String>) -> Response {
    match state.store.persist(&key) {
        Ok(updated) => ok(json!({ "updated": updated })).into_response(),
        Err(err) => err.into_response(),
    }
}

async fn keys_handler(State(state): State<AppState>, Query(query): Query<KeysQuery>) -> Response {
    let prefix = query.prefix.unwrap_or_default();
    let limit = query.limit.unwrap_or(1000);
    if limit > 10_000 {
        return StoreError::new(ErrorCode::InvalidLimit, "limit must be at most 10000")
            .into_response();
    }
    if prefix.len() > DEFAULT_MAX_KEY_BYTES {
        return StoreError::new(ErrorCode::KeyTooLong, "prefix is too long").into_response();
    }
    let keys = state.store.keys(&prefix, limit);
    ok(json!({ "count": keys.len(), "keys": keys })).into_response()
}

async fn mget_handler(State(state): State<AppState>, Json(body): Json<MGetRequest>) -> Response {
    for key in &body.keys {
        if let Err(err) = state.store.validate_key(key) {
            return err.into_response();
        }
    }
    ok(json!({ "items": state.store.mget(&body.keys) })).into_response()
}

async fn mset_handler(State(state): State<AppState>, Json(body): Json<MSetRequest>) -> Response {
    let stored = body.items.len();
    match state.store.mset(body.items, body.ttl_seconds) {
        Ok(expires_at) => ok(json!({ "stored": stored, "expiresAt": expires_at })).into_response(),
        Err(err) => err.into_response(),
    }
}

async fn flushdb_handler(State(state): State<AppState>) -> impl IntoResponse {
    ok(json!({ "deleted": state.store.flushdb() }))
}

async fn invalid_command_handler() -> impl IntoResponse {
    StoreError::new(ErrorCode::InvalidCommand, "unsupported route")
}

fn ok<T: Serialize>(data: T) -> impl IntoResponse {
    Json(json!({ "ok": true, "data": data }))
}

impl IntoResponse for StoreError {
    fn into_response(self) -> Response {
        let status = match self.code {
            ErrorCode::KeyNotFound => StatusCode::NOT_FOUND,
            ErrorCode::ValueTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            ErrorCode::StoreFull | ErrorCode::MemoryLimitExceeded => {
                StatusCode::INSUFFICIENT_STORAGE
            }
            _ => StatusCode::BAD_REQUEST,
        };
        (
            status,
            Json(json!({
                "ok": false,
                "error": { "code": self.code.as_str(), "message": self.message, "details": {} }
            })),
        )
            .into_response()
    }
}

pub fn init_tracing() {
    let filter =
        tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into());
    let _ = tracing_subscriber::fmt()
        .json()
        .with_env_filter(filter)
        .try_init();
}

pub async fn run() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    init_tracing();
    let port = std::env::var("PORT").unwrap_or_else(|_| "8082".to_owned());
    let addr: SocketAddr = if port.contains(':') {
        port.parse()?
    } else {
        format!("0.0.0.0:{port}").parse()?
    };
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(%addr, "server_starting");
    axum::serve(listener, router(Store::new(Config::default())))
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    info!("server_stopped");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install ctrl-c handler")
    };
    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;

    #[test]
    fn set_get_replace_ttl_and_persist() {
        let store = Store::new(Config::default());
        assert!(store
            .set("alpha", json!({"n": 1}), Some(10))
            .unwrap()
            .is_some());
        let entry = store.get("alpha").expect("stored entry");
        assert_eq!(entry.value, json!({"n": 1}));
        assert!(entry.ttl_seconds.is_some());
        assert!(store.persist("alpha").unwrap());
        assert_eq!(store.ttl("alpha"), -1);
        store.set("alpha", json!("replacement"), None).unwrap();
        assert_eq!(store.get("alpha").unwrap().value, json!("replacement"));
    }

    #[test]
    fn mset_is_atomic_mget_keeps_order_and_flush_clears() {
        let store = Store::new(Config {
            max_keys: 2,
            ..Config::default()
        });
        store
            .mset(
                vec![
                    Pair {
                        key: "a".into(),
                        value: json!(1),
                    },
                    Pair {
                        key: "b".into(),
                        value: Value::Null,
                    },
                ],
                None,
            )
            .unwrap();
        let items = store.mget(&["a".into(), "missing".into(), "b".into(), "a".into()]);
        assert!(items[0].found && !items[1].found && items[2].found && items[3].found);
        assert!(matches!(
            store
                .mset(
                    vec![Pair {
                        key: "c".into(),
                        value: json!(3)
                    }],
                    None
                )
                .unwrap_err()
                .code,
            ErrorCode::StoreFull
        ));
        assert!(store.get("c").is_none());
        assert_eq!(store.flushdb(), 2);
    }

    #[test]
    fn validation_and_expiry() {
        let store = Store::new(Config {
            max_key_bytes: 3,
            max_value_bytes: 4,
            ..Config::default()
        });
        assert!(matches!(
            store.set("", json!(1), None).unwrap_err().code,
            ErrorCode::InvalidKey
        ));
        assert!(matches!(
            store.set("long", json!(1), None).unwrap_err().code,
            ErrorCode::KeyTooLong
        ));
        assert!(matches!(
            store.set("ok", json!("large"), None).unwrap_err().code,
            ErrorCode::ValueTooLarge
        ));
        assert!(matches!(
            store.set("ok", json!(1), Some(0)).unwrap_err().code,
            ErrorCode::InvalidTtl
        ));
    }

    #[tokio::test]
    async fn http_health_set_get_and_mget() {
        let app = router(Store::new(Config::default()));
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("PUT")
                    .uri("/v1/kv/name")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"value":{"ok":true},"ttlSeconds":5}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/v1/kv/name")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/mget")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"keys":["name","missing","name"]}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn http_remaining_commands_and_error_envelopes() {
        let app = router(Store::new(Config::default()));
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/mset")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        r#"{"items":[{"key":"p:1","value":1},{"key":"p:2","value":2}],"ttlSeconds":5}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let cases = [
            ("GET", "/v1/keys?prefix=p:&limit=1", StatusCode::OK, ""),
            ("GET", "/v1/kv/p:1/ttl", StatusCode::OK, ""),
            ("POST", "/v1/kv/p:1/persist", StatusCode::OK, ""),
            (
                "POST",
                "/v1/kv/p:2/expire",
                StatusCode::OK,
                r#"{"ttlSeconds":10}"#,
            ),
            ("DELETE", "/v1/kv/p:1", StatusCode::OK, ""),
            ("POST", "/v1/flushdb", StatusCode::OK, "{}"),
            ("GET", "/v1/kv/missing", StatusCode::NOT_FOUND, ""),
            ("GET", "/v1/keys?limit=10001", StatusCode::BAD_REQUEST, ""),
            ("POST", "/v1/kv/missing/persist", StatusCode::NOT_FOUND, ""),
            (
                "POST",
                "/v1/kv/missing/expire",
                StatusCode::NOT_FOUND,
                r#"{"ttlSeconds":5}"#,
            ),
            (
                "POST",
                "/v1/mget",
                StatusCode::BAD_REQUEST,
                r#"{"keys":[""]}"#,
            ),
            (
                "POST",
                "/v1/mset",
                StatusCode::BAD_REQUEST,
                r#"{"items":[{"key":"a","value":1},{"key":"a","value":2}]}"#,
            ),
            ("GET", "/not-found", StatusCode::BAD_REQUEST, ""),
        ];

        for (method, uri, status, body) in cases {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(method)
                        .uri(uri)
                        .header("content-type", "application/json")
                        .body(Body::from(body.to_owned()))
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), status, "{method} {uri}");
        }
    }

    #[test]
    fn domain_capacity_memory_delete_expire_and_health_paths() {
        let store = Store::new(Config {
            max_keys: 2,
            max_memory_bytes: 220,
            ..Config::default()
        });
        store.set("aa", json!("one"), None).unwrap();
        store.set("ab", json!("two"), None).unwrap();
        assert!(matches!(
            store.set("ac", json!("three"), None).unwrap_err().code,
            ErrorCode::StoreFull
        ));
        assert_eq!(store.keys("a", 1), vec!["aa".to_string()]);
        store.set("aa", json!("updated"), None).unwrap();
        assert_eq!(store.delete(&["aa".to_string(), "missing".to_string()]), 1);
        assert_eq!(store.flushdb(), 1);
        assert_eq!(store.health().key_count, 0);

        let memory_limited = Store::new(Config {
            max_memory_bytes: 10,
            ..Config::default()
        });
        assert!(matches!(
            memory_limited.set("k", json!("v"), None).unwrap_err().code,
            ErrorCode::MemoryLimitExceeded
        ));

        let ttl_store = Store::new(Config::default());
        ttl_store.set("ttl", json!(true), None).unwrap();
        let expires_at = ttl_store.expire("ttl", 5).unwrap();
        assert!(!expires_at.is_empty());
        assert!(ttl_store.ttl("ttl") >= 0);
        assert!(ttl_store.persist("ttl").unwrap());
        assert!(!ttl_store.persist("ttl").unwrap());
        assert!(matches!(
            ttl_store.expire("missing", 5).unwrap_err().code,
            ErrorCode::KeyNotFound
        ));
    }
}
