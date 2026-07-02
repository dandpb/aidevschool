use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use axum::extract::{Multipart, Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::sync::RwLock;
use tracing::{info, warn};

#[derive(Clone)]
pub struct Config {
    pub port: String,
    pub storage_dir: PathBuf,
    pub max_bytes: u64,
    pub read_buffer_bytes: usize,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT").unwrap_or_else(|_| "8087".to_string()),
            storage_dir: std::env::var("UPLOAD_STORAGE_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|_| std::env::temp_dir().join("file-upload-pipeline-rust")),
            max_bytes: std::env::var("MAX_UPLOAD_BYTES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1 << 30),
            read_buffer_bytes: 32 * 1024,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UploadStatus {
    Receiving,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UploadError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Chunk {
    pub index: usize,
    pub offset: u64,
    pub size: usize,
    #[serde(rename = "receivedAt")]
    pub received_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct UploadMetadata {
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    pub extension: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(
        rename = "clientMetadata",
        skip_serializing_if = "HashMap::is_empty",
        default
    )]
    pub client_metadata: HashMap<String, String>,
    #[serde(rename = "thumbnailStatus")]
    pub thumbnail_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Upload {
    pub id: String,
    pub filename: String,
    pub size: u64,
    pub chunks: Vec<Chunk>,
    pub status: UploadStatus,
    pub checksum: Option<String>,
    #[serde(rename = "expectedChecksum", skip_serializing_if = "Option::is_none")]
    pub expected_checksum: Option<String>,
    pub metadata: UploadMetadata,
    #[serde(rename = "storagePath")]
    pub storage_path: String,
    #[serde(rename = "thumbnailPath", skip_serializing_if = "Option::is_none")]
    pub thumbnail_path: Option<String>,
    pub error: Option<UploadError>,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    #[serde(rename = "updatedAt")]
    pub updated_at: u64,
    #[serde(rename = "completedAt", skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<u64>,
}

#[derive(Serialize)]
struct ListResponse {
    items: Vec<Upload>,
    #[serde(rename = "nextCursor")]
    next_cursor: Option<String>,
}

#[derive(Serialize)]
struct Progress {
    id: String,
    status: UploadStatus,
    #[serde(rename = "receivedBytes")]
    received_bytes: u64,
    #[serde(rename = "totalBytes")]
    total_bytes: Option<u64>,
    #[serde(rename = "progressPercent")]
    progress_percent: Option<f64>,
    error: Option<UploadError>,
}

#[derive(Clone)]
pub struct AppState {
    pub cfg: Config,
    registry: Arc<Registry>,
}

struct Registry {
    uploads: RwLock<HashMap<String, Upload>>,
    cancels: RwLock<HashMap<String, Arc<AtomicBool>>>,
    seq: AtomicU64,
}

impl Registry {
    fn new() -> Self {
        Self {
            uploads: RwLock::new(HashMap::new()),
            cancels: RwLock::new(HashMap::new()),
            seq: AtomicU64::new(0),
        }
    }
    fn next_id(&self) -> String {
        format!("upl_rs_{:06}", self.seq.fetch_add(1, Ordering::SeqCst) + 1)
    }
    async fn save(&self, upload: Upload) {
        self.uploads.write().await.insert(upload.id.clone(), upload);
    }
    async fn get(&self, id: &str) -> Option<Upload> {
        self.uploads.read().await.get(id).cloned()
    }
    async fn list(
        &self,
        status: Option<String>,
        limit: usize,
        cursor: Option<String>,
    ) -> (Vec<Upload>, Option<String>) {
        let uploads = self.uploads.read().await;
        let mut ids: Vec<_> = uploads.keys().cloned().collect();
        ids.sort();
        let start = cursor
            .and_then(|c| ids.iter().position(|id| *id == c).map(|i| i + 1))
            .unwrap_or(0);
        let limit = limit.clamp(1, 100);
        let mut items = Vec::new();
        for id in ids.iter().skip(start) {
            if let Some(upload) = uploads.get(id) {
                if status
                    .as_deref()
                    .is_none_or(|s| s == status_name(&upload.status))
                {
                    items.push(upload.clone());
                    if items.len() == limit {
                        break;
                    }
                }
            }
        }
        let next = if start + items.len() < ids.len() && !items.is_empty() {
            Some(items.last().expect("checked non-empty").id.clone())
        } else {
            None
        };
        (items, next)
    }
    async fn set_cancel(&self, id: String, flag: Arc<AtomicBool>) {
        self.cancels.write().await.insert(id, flag);
    }
    async fn clear_cancel(&self, id: &str) {
        self.cancels.write().await.remove(id);
    }
    async fn cancel(&self, id: &str) -> bool {
        self.cancels
            .read()
            .await
            .get(id)
            .map(|flag| {
                flag.store(true, Ordering::SeqCst);
                true
            })
            .unwrap_or(false)
    }
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug)]
struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: String,
    retryable: bool,
}

impl ApiError {
    fn new(
        status: StatusCode,
        code: &'static str,
        message: impl Into<String>,
        retryable: bool,
    ) -> Self {
        Self {
            status,
            code,
            message: message.into(),
            retryable,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = Json(
            serde_json::json!({"error": {"code": self.code, "message": self.message, "retryable": self.retryable}}),
        );
        (self.status, body).into_response()
    }
}

pub async fn build_state(cfg: Config) -> Result<AppState, std::io::Error> {
    fs::create_dir_all(cfg.storage_dir.join("tmp")).await?;
    fs::create_dir_all(cfg.storage_dir.join("files")).await?;
    Ok(AppState {
        cfg,
        registry: Arc::new(Registry::new()),
    })
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/upload", post(upload))
        .route("/files", get(files))
        .route("/files/:id", get(file_info).delete(delete_file))
        .route("/files/:id/status", get(file_status))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status":"ok"}))
}

async fn upload(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<Upload>), ApiError> {
    let id = headers
        .get("x-upload-id")
        .and_then(|v| v.to_str().ok())
        .map(str::to_string)
        .unwrap_or_else(|| state.registry.next_id());
    if !is_safe_upload_id(&id) {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_upload_id",
            "upload id must be a non-path identifier",
            false,
        ));
    }
    let flag = Arc::new(AtomicBool::new(false));
    state
        .registry
        .set_cancel(id.clone(), Arc::clone(&flag))
        .await;
    let now = now_secs();
    let mut upload = Upload {
        id: id.clone(),
        filename: String::new(),
        size: 0,
        chunks: vec![],
        status: UploadStatus::Receiving,
        checksum: None,
        expected_checksum: None,
        metadata: UploadMetadata::default(),
        storage_path: String::new(),
        thumbnail_path: None,
        error: None,
        created_at: now,
        updated_at: now,
        completed_at: None,
    };
    state.registry.save(upload.clone()).await;
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "malformed_multipart",
            e.to_string(),
            false,
        )
    })? {
        let name = field.name().unwrap_or_default().to_string();
        if name != "file" {
            let text = field.text().await.unwrap_or_default();
            if name == "expectedChecksum" {
                upload.expected_checksum = Some(text);
            } else {
                upload.metadata.client_metadata.insert(name, text);
            }
            continue;
        }
        stream_field(&state, &mut upload, &flag, field)
            .await
            .inspect_err(|e| mark_failed_sync(&mut upload, e))?;
        state.registry.clear_cancel(&id).await;
        return Ok((StatusCode::CREATED, Json(upload)));
    }
    state.registry.clear_cancel(&id).await;
    Err(ApiError::new(
        StatusCode::BAD_REQUEST,
        "malformed_multipart",
        "missing file part",
        false,
    ))
}

async fn stream_field(
    state: &AppState,
    upload: &mut Upload,
    cancel: &AtomicBool,
    mut field: axum::extract::multipart::Field<'_>,
) -> Result<(), ApiError> {
    let filename = sanitize(field.file_name().unwrap_or("upload.bin"));
    let ext = extension(&filename);
    let mime = field
        .content_type()
        .unwrap_or_else(|| guess_mime(&ext))
        .to_string();
    if !allowed_ext(&ext) || !allowed_mime(&mime) {
        fail_and_save(
            state,
            upload,
            UploadStatus::Failed,
            "invalid_file_type",
            "file type is not allowed",
            false,
        )
        .await;
        return Err(ApiError::new(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "invalid_file_type",
            "file type is not allowed",
            false,
        ));
    }
    upload.filename = filename;
    upload.metadata.extension = ext.clone();
    upload.metadata.mime_type = mime.clone();
    let tmp_path = state
        .cfg
        .storage_dir
        .join("tmp")
        .join(format!("{}.part", upload.id));
    let final_path = state
        .cfg
        .storage_dir
        .join("files")
        .join(format!("{}{}", upload.id, ext));
    let mut file = fs::File::create(&tmp_path).await.map_err(|e| {
        ApiError::new(
            StatusCode::INSUFFICIENT_STORAGE,
            "disk_full",
            e.to_string(),
            true,
        )
    })?;
    let mut hasher = Sha256::new();
    let mut offset = 0_u64;
    while let Some(chunk) = field.chunk().await.map_err(|e| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "network_interruption",
            e.to_string(),
            true,
        )
    })? {
        if cancel.load(Ordering::SeqCst) {
            let _ = fs::remove_file(&tmp_path).await;
            fail_and_save(
                state,
                upload,
                UploadStatus::Cancelled,
                "network_interruption",
                "upload cancelled",
                true,
            )
            .await;
            return Err(ApiError::new(
                StatusCode::ACCEPTED,
                "cancelled",
                "upload cancelled",
                true,
            ));
        }
        upload.size += chunk.len() as u64;
        if upload.size > state.cfg.max_bytes {
            let _ = fs::remove_file(&tmp_path).await;
            fail_and_save(
                state,
                upload,
                UploadStatus::Failed,
                "size_exceeded",
                "maximum upload size exceeded",
                false,
            )
            .await;
            return Err(ApiError::new(
                StatusCode::PAYLOAD_TOO_LARGE,
                "size_exceeded",
                "maximum upload size exceeded",
                false,
            ));
        }
        hasher.update(&chunk);
        file.write_all(&chunk).await.map_err(|e| {
            ApiError::new(
                StatusCode::INSUFFICIENT_STORAGE,
                "disk_full",
                e.to_string(),
                true,
            )
        })?;
        upload.chunks.push(Chunk {
            index: upload.chunks.len(),
            offset,
            size: chunk.len(),
            received_at: now_secs(),
        });
        offset += chunk.len() as u64;
        upload.updated_at = now_secs();
        state.registry.save(upload.clone()).await;
    }
    file.flush().await.map_err(|e| {
        ApiError::new(
            StatusCode::INSUFFICIENT_STORAGE,
            "disk_full",
            e.to_string(),
            true,
        )
    })?;
    let checksum = format!("sha256:{:x}", hasher.finalize());
    upload.checksum = Some(checksum.clone());
    if upload
        .expected_checksum
        .as_deref()
        .is_some_and(|e| e != checksum && e != checksum.trim_start_matches("sha256:"))
    {
        let _ = fs::remove_file(&tmp_path).await;
        fail_and_save(
            state,
            upload,
            UploadStatus::Failed,
            "checksum_mismatch",
            "computed checksum did not match expected checksum",
            false,
        )
        .await;
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "checksum_mismatch",
            "computed checksum did not match expected checksum",
            false,
        ));
    }
    upload.status = UploadStatus::Processing;
    state.registry.save(upload.clone()).await;
    fs::rename(&tmp_path, &final_path).await.map_err(|e| {
        ApiError::new(
            StatusCode::INSUFFICIENT_STORAGE,
            "disk_full",
            e.to_string(),
            true,
        )
    })?;
    upload.status = UploadStatus::Completed;
    upload.storage_path = final_path.to_string_lossy().to_string();
    upload.metadata.thumbnail_status = if mime.starts_with("image/") {
        "documented: temp-file-backed thumbnail processor"
    } else {
        "not_applicable"
    }
    .to_string();
    let done = now_secs();
    upload.updated_at = done;
    upload.completed_at = Some(done);
    state.registry.save(upload.clone()).await;
    Ok(())
}

#[derive(Deserialize)]
struct ListQuery {
    status: Option<String>,
    limit: Option<usize>,
    cursor: Option<String>,
}
async fn files(State(state): State<AppState>, Query(q): Query<ListQuery>) -> Json<ListResponse> {
    let (items, next_cursor) = state
        .registry
        .list(q.status, q.limit.unwrap_or(100), q.cursor)
        .await;
    Json(ListResponse { items, next_cursor })
}
async fn file_info(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Upload>, ApiError> {
    state.registry.get(&id).await.map(Json).ok_or_else(|| {
        ApiError::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "upload not found",
            false,
        )
    })
}
async fn file_status(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Progress>, ApiError> {
    let upload = state.registry.get(&id).await.ok_or_else(|| {
        ApiError::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "upload not found",
            false,
        )
    })?;
    Ok(Json(progress(upload)))
}
async fn delete_file(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<(StatusCode, Json<serde_json::Value>), ApiError> {
    let mut upload = state.registry.get(&id).await.ok_or_else(|| {
        ApiError::new(
            StatusCode::NOT_FOUND,
            "not_found",
            "upload not found",
            false,
        )
    })?;
    let _ = state.registry.cancel(&id).await;
    if !upload.storage_path.is_empty() {
        let _ = fs::remove_file(&upload.storage_path).await;
    }
    upload.status = UploadStatus::Cancelled;
    upload.updated_at = now_secs();
    state.registry.save(upload).await;
    Ok((
        StatusCode::ACCEPTED,
        Json(serde_json::json!({"id": id, "status": "cancelled"})),
    ))
}

async fn fail_and_save(
    state: &AppState,
    upload: &mut Upload,
    status: UploadStatus,
    code: &'static str,
    message: &'static str,
    retryable: bool,
) {
    upload.status = status;
    upload.error = Some(UploadError {
        code: code.to_string(),
        message: message.to_string(),
        retryable,
    });
    upload.updated_at = now_secs();
    state.registry.save(upload.clone()).await;
}
fn mark_failed_sync(upload: &mut Upload, e: &ApiError) {
    if e.status != StatusCode::ACCEPTED && upload.error.is_none() {
        upload.status = UploadStatus::Failed;
        upload.error = Some(UploadError {
            code: e.code.to_string(),
            message: e.message.clone(),
            retryable: e.retryable,
        });
        upload.updated_at = now_secs();
    }
}
fn progress(upload: Upload) -> Progress {
    Progress {
        id: upload.id,
        status: upload.status.clone(),
        received_bytes: upload.size,
        total_bytes: None,
        progress_percent: if upload.status == UploadStatus::Completed {
            Some(100.0)
        } else {
            None
        },
        error: upload.error,
    }
}
fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
}
fn sanitize(name: &str) -> String {
    PathBuf::from(name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("upload.bin")
        .to_string()
}
fn is_safe_upload_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}
fn extension(name: &str) -> String {
    PathBuf::from(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{e}").to_ascii_lowercase())
        .unwrap_or_default()
}
fn guess_mime(ext: &str) -> &'static str {
    match ext {
        ".txt" => "text/plain",
        ".png" => "image/png",
        ".jpg" | ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        _ => "application/octet-stream",
    }
}
fn allowed_ext(ext: &str) -> bool {
    matches!(ext, ".txt" | ".png" | ".jpg" | ".jpeg" | ".gif" | ".bin")
}
fn allowed_mime(mime: &str) -> bool {
    matches!(
        mime.split(';').next().unwrap_or(mime),
        "text/plain" | "image/png" | "image/jpeg" | "image/gif" | "application/octet-stream"
    )
}
fn status_name(status: &UploadStatus) -> &'static str {
    match status {
        UploadStatus::Receiving => "receiving",
        UploadStatus::Processing => "processing",
        UploadStatus::Completed => "completed",
        UploadStatus::Failed => "failed",
        UploadStatus::Cancelled => "cancelled",
    }
}

pub fn init_tracing() {
    use tracing_subscriber::{fmt, prelude::*, EnvFilter};
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(fmt::layer().json())
        .try_init()
        .ok();
}
pub async fn run() -> Result<(), AppError> {
    init_tracing();
    let cfg = Config::from_env();
    let addr: SocketAddr = if cfg.port.contains(':') {
        cfg.port
            .parse()
            .unwrap_or_else(|_| "0.0.0.0:8087".parse().expect("literal addr"))
    } else {
        format!("0.0.0.0:{}", cfg.port).parse().expect("valid port")
    };
    let state = build_state(cfg).await?;
    info!(%addr, "file-upload-pipeline-rust starting");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, router(state).into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}
async fn shutdown_signal() {
    if let Err(e) = tokio::signal::ctrl_c().await {
        warn!(error = %e, "failed to install ctrl-c handler");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn helpers_are_safe() {
        assert_eq!(sanitize("../../x.txt"), "x.txt");
        assert_eq!(extension("A.PNG"), ".png");
        assert_eq!(guess_mime(".txt"), "text/plain");
        assert!(allowed_ext(".bin"));
        assert!(allowed_mime("text/plain; charset=utf-8"));
        assert_eq!(status_name(&UploadStatus::Failed), "failed");
    }

    #[tokio::test]
    async fn registry_config_and_progress_are_covered() {
        std::env::set_var("PORT", "9999");
        std::env::set_var("MAX_UPLOAD_BYTES", "77");
        std::env::set_var("UPLOAD_STORAGE_DIR", "/tmp/file-upload-rust-test");
        let cfg = Config::from_env();
        assert_eq!(cfg.port, "9999");
        assert_eq!(cfg.max_bytes, 77);
        let registry = Registry::new();
        let id = registry.next_id();
        let upload = Upload {
            id: id.clone(),
            filename: "a.txt".to_string(),
            size: 3,
            chunks: vec![],
            status: UploadStatus::Completed,
            checksum: Some("sha256:x".to_string()),
            expected_checksum: None,
            metadata: UploadMetadata::default(),
            storage_path: String::new(),
            thumbnail_path: None,
            error: None,
            created_at: 1,
            updated_at: 1,
            completed_at: Some(1),
        };
        registry.save(upload.clone()).await;
        assert!(registry.get(&id).await.is_some());
        let (items, next) = registry.list(Some("completed".to_string()), 1, None).await;
        assert_eq!(items.len(), 1);
        assert!(next.is_none());
        let flag = Arc::new(AtomicBool::new(false));
        registry.set_cancel(id.clone(), Arc::clone(&flag)).await;
        assert!(registry.cancel(&id).await);
        assert!(flag.load(Ordering::SeqCst));
        registry.clear_cancel(&id).await;
        assert!(!registry.cancel(&id).await);
        let p = progress(upload);
        assert_eq!(p.progress_percent, Some(100.0));
        std::env::remove_var("PORT");
        std::env::remove_var("MAX_UPLOAD_BYTES");
        std::env::remove_var("UPLOAD_STORAGE_DIR");
    }
}
