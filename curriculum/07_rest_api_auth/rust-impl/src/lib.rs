use axum::{
    body::{to_bytes, Body},
    extract::{Path, Query, State},
    http::{header::AUTHORIZATION, HeaderMap, Request, StatusCode},
    middleware::{from_fn, Next},
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use rand::RngCore;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fmt::Write,
    sync::{Arc, Mutex},
};
use tower::ServiceBuilder;
use uuid::Uuid;

#[derive(Clone)]
pub struct Config {
    pub issuer: String,
    pub audience: String,
    pub jwt_secret: String,
    pub access_token_seconds: i64,
    pub refresh_token_seconds: i64,
    pub password_iterations: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            issuer: "ai-devschool-project-07".to_string(),
            audience: "project-07-learners".to_string(),
            jwt_secret: "dev-project-07-secret-change-me".to_string(),
            access_token_seconds: 900,
            refresh_token_seconds: 604_800,
            password_iterations: 12_000,
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub store: Arc<Mutex<Store>>,
    pub clock: Arc<dyn Clock>,
}

pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}
pub struct RealClock;
impl Clock for RealClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}
#[derive(Clone)]
pub struct FixedClock {
    pub value: DateTime<Utc>,
}
impl Clock for FixedClock {
    fn now(&self) -> DateTime<Utc> {
        self.value
    }
}

#[derive(Default)]
pub struct Store {
    pub users: HashMap<String, User>,
    pub sessions: HashMap<String, Session>,
    pub audits: Vec<AuditEntry>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Admin,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Active,
    Disabled,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SessionStatus {
    Active,
    Rotated,
    Expired,
    Replayed,
}

#[derive(Clone, Debug)]
pub struct User {
    pub id: String,
    pub email: String,
    pub password_hash: String,
    pub display_name: String,
    pub roles: Vec<Role>,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
#[derive(Clone, Debug)]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub refresh_token_hash: String,
    pub access_token_jti: String,
    pub status: SessionStatus,
    pub parent_session_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub rotated_at: Option<DateTime<Utc>>,
    pub last_used_at: Option<DateTime<Utc>>,
}
#[derive(Clone, Debug)]
pub struct AuditEntry {
    pub id: String,
    pub action: String,
    pub actor_user_id: Option<String>,
    pub target_user_id: Option<String>,
    pub session_id: Option<String>,
    pub request_id: String,
    pub outcome: String,
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Principal {
    pub sub: String,
    pub email: String,
    pub roles: Vec<Role>,
    pub jti: String,
}

#[derive(Debug, thiserror::Error)]
#[error("{code}")]
pub struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: &'static str,
    details: Vec<Value>,
}
impl ApiError {
    fn new(status: StatusCode, code: &'static str, message: &'static str) -> Self {
        Self {
            status,
            code,
            message,
            details: vec![],
        }
    }
    fn validation(details: Vec<Value>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            code: "VALIDATION_FAILED",
            message: "Request validation failed.",
            details,
        }
    }
}
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.status, Json(json!({ "error": { "code": self.code, "message": self.message, "details": self.details }, "request_id": "unknown" }))).into_response()
    }
}

#[derive(Deserialize)]
struct RegisterBody {
    email: String,
    password: String,
    display_name: Option<String>,
}
#[derive(Deserialize)]
struct LoginBody {
    email: String,
    password: String,
}
#[derive(Deserialize)]
struct RefreshBody {
    refresh_token: String,
}
#[derive(Deserialize)]
struct UpdateBody {
    display_name: Option<String>,
    roles: Option<Vec<Role>>,
    status: Option<UserStatus>,
}
#[derive(Deserialize)]
struct ListQuery {
    limit: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Claims {
    sub: String,
    email: String,
    roles: Vec<Role>,
    iat: usize,
    exp: usize,
    jti: String,
    iss: String,
    aud: String,
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/v1/auth/register", post(register))
        .route("/v1/auth/login", post(login))
        .route("/v1/auth/refresh", post(refresh))
        .route("/v1/users", get(list_users))
        .route("/v1/users/:id", put(update_user))
        .route(
            "/v2/*path",
            get(unsupported).post(unsupported).put(unsupported),
        )
        .layer(ServiceBuilder::new().layer(from_fn(request_context)))
        .with_state(state)
}

async fn request_context(mut req: Request<Body>, next: Next) -> Response {
    let request_id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map_or_else(|| new_id("req"), ToString::to_string);
    req.extensions_mut().insert(request_id.clone());
    let mut res = next.run(req).await;
    if let Ok(value) = request_id.parse() {
        res.headers_mut().insert("x-request-id", value);
    }
    res
}

async fn health(req: Request<Body>) -> impl IntoResponse {
    ok(&req, json!({ "status": "ok" }), StatusCode::OK)
}
async fn unsupported(req: Request<Body>) -> impl IntoResponse {
    err(
        &req,
        ApiError::new(
            StatusCode::NOT_FOUND,
            "UNSUPPORTED_API_VERSION",
            "Unsupported API version.",
        ),
    )
}

async fn register(State(state): State<AppState>, req: Request<Body>) -> Response {
    let request_id = request_id(&req);
    let body = match read_json::<RegisterBody>(req).await {
        Ok(v) => v,
        Err(e) => return err_id(&request_id, e),
    };
    if let Err(e) = validate_register(&body) {
        return err_id(&request_id, e);
    }
    let email = normalize(&body.email);
    let mut store = state.store.lock().expect("store lock");
    if store.users.values().any(|u| u.email == email) {
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::CONFLICT,
                "EMAIL_ALREADY_REGISTERED",
                "Email is already registered.",
            ),
        );
    }
    let now = state.clock.now();
    let user = User {
        id: new_id("usr"),
        email: email.clone(),
        password_hash: hash_password(&body.password, state.config.password_iterations),
        display_name: body.display_name.clone().unwrap_or_else(|| email.clone()),
        roles: vec![Role::User],
        status: UserStatus::Active,
        created_at: now,
        updated_at: now,
    };
    audit(
        &mut store,
        "user_registered",
        Some(user.id.clone()),
        Some(user.id.clone()),
        None,
        &request_id,
        "success",
    );
    store.users.insert(user.id.clone(), user.clone());
    ok_id(
        &request_id,
        json!({ "user": public_user(&user) }),
        StatusCode::CREATED,
    )
}

async fn login(State(state): State<AppState>, req: Request<Body>) -> Response {
    let request_id = request_id(&req);
    let body = match read_json::<LoginBody>(req).await {
        Ok(v) => v,
        Err(e) => return err_id(&request_id, e),
    };
    let mut store = state.store.lock().expect("store lock");
    let user = store
        .users
        .values()
        .find(|u| u.email == normalize(&body.email))
        .cloned();
    let Some(user) = user else {
        audit(
            &mut store,
            "login_failed",
            None,
            None,
            None,
            &request_id,
            "failure",
        );
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Invalid credentials.",
            ),
        );
    };
    if user.status != UserStatus::Active || !verify_password(&body.password, &user.password_hash) {
        audit(
            &mut store,
            "login_failed",
            None,
            None,
            None,
            &request_id,
            "failure",
        );
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Invalid credentials.",
            ),
        );
    }
    let (access_token, jti) = match sign_access(&state, &user) {
        Ok(v) => v,
        Err(e) => return err_id(&request_id, e),
    };
    let refresh_token = random_token(32);
    let now = state.clock.now();
    let session = Session {
        id: new_id("ses"),
        user_id: user.id.clone(),
        refresh_token_hash: hash_refresh(&refresh_token),
        access_token_jti: jti,
        status: SessionStatus::Active,
        parent_session_id: None,
        created_at: now,
        expires_at: now + Duration::seconds(state.config.refresh_token_seconds),
        rotated_at: None,
        last_used_at: Some(now),
    };
    audit(
        &mut store,
        "login_succeeded",
        Some(user.id.clone()),
        Some(user.id.clone()),
        Some(session.id.clone()),
        &request_id,
        "success",
    );
    store.sessions.insert(session.id.clone(), session);
    ok_id(
        &request_id,
        json!({ "access_token": access_token, "token_type": "Bearer", "expires_in_seconds": state.config.access_token_seconds, "refresh_token": refresh_token, "refresh_expires_in_seconds": state.config.refresh_token_seconds, "user": public_user(&user) }),
        StatusCode::OK,
    )
}

async fn refresh(State(state): State<AppState>, req: Request<Body>) -> Response {
    let request_id = request_id(&req);
    let body = match read_json::<RefreshBody>(req).await {
        Ok(v) => v,
        Err(e) => return err_id(&request_id, e),
    };
    if body.refresh_token.len() < 16 {
        return err_id(&request_id, ApiError::validation(vec![]));
    }
    let mut store = state.store.lock().expect("store lock");
    let hash = hash_refresh(&body.refresh_token);
    let session_id = store
        .sessions
        .values()
        .find(|s| s.refresh_token_hash == hash)
        .map(|s| s.id.clone());
    let Some(session_id) = session_id else {
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "Invalid refresh token.",
            ),
        );
    };
    let mut session = store
        .sessions
        .get(&session_id)
        .cloned()
        .expect("session exists");
    if session.status != SessionStatus::Active {
        session.status = SessionStatus::Replayed;
        store.sessions.insert(session.id.clone(), session.clone());
        audit(
            &mut store,
            "refresh_replayed",
            Some(session.user_id.clone()),
            Some(session.user_id.clone()),
            Some(session.id.clone()),
            &request_id,
            "denied",
        );
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "REFRESH_TOKEN_REPLAYED",
                "Refresh token was already used.",
            ),
        );
    }
    if session.expires_at <= state.clock.now() {
        session.status = SessionStatus::Expired;
        store.sessions.insert(session.id.clone(), session);
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "Invalid refresh token.",
            ),
        );
    }
    let Some(user) = store.users.get(&session.user_id).cloned() else {
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "Invalid refresh token.",
            ),
        );
    };
    let (access_token, jti) = match sign_access(&state, &user) {
        Ok(v) => v,
        Err(e) => return err_id(&request_id, e),
    };
    let refresh_token = random_token(32);
    let now = state.clock.now();
    session.status = SessionStatus::Rotated;
    session.rotated_at = Some(now);
    store.sessions.insert(session.id.clone(), session.clone());
    let next = Session {
        id: new_id("ses"),
        user_id: user.id.clone(),
        refresh_token_hash: hash_refresh(&refresh_token),
        access_token_jti: jti,
        status: SessionStatus::Active,
        parent_session_id: Some(session.id.clone()),
        created_at: now,
        expires_at: now + Duration::seconds(state.config.refresh_token_seconds),
        rotated_at: None,
        last_used_at: Some(now),
    };
    audit(
        &mut store,
        "token_refreshed",
        Some(user.id),
        Some(session.user_id),
        Some(next.id.clone()),
        &request_id,
        "success",
    );
    store.sessions.insert(next.id.clone(), next);
    ok_id(
        &request_id,
        json!({ "access_token": access_token, "token_type": "Bearer", "expires_in_seconds": state.config.access_token_seconds, "refresh_token": refresh_token, "refresh_expires_in_seconds": state.config.refresh_token_seconds }),
        StatusCode::OK,
    )
}

async fn list_users(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
    req: Request<Body>,
) -> Response {
    let request_id = request_id(&req);
    let principal = match authenticate(&state, &headers, &request_id) {
        Ok(p) => p,
        Err(e) => return err_id(&request_id, e),
    };
    if !principal.roles.contains(&Role::Admin) {
        let mut store = state.store.lock().expect("store lock");
        audit(
            &mut store,
            "authorization_forbidden",
            Some(principal.sub),
            None,
            None,
            &request_id,
            "denied",
        );
        return err_id(
            &request_id,
            ApiError::new(StatusCode::FORBIDDEN, "FORBIDDEN", "Forbidden."),
        );
    }
    let limit = query.limit.unwrap_or(25);
    if !(1..=100).contains(&limit) {
        return err_id(
            &request_id,
            ApiError::validation(vec![json!({"field":"limit","reason":"must be 1..100"})]),
        );
    }
    let store = state.store.lock().expect("store lock");
    let users: Vec<_> = store.users.values().take(limit).map(public_user).collect();
    ok_id(
        &request_id,
        json!({ "users": users, "next_cursor": null }),
        StatusCode::OK,
    )
}

async fn update_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    req: Request<Body>,
) -> Response {
    let request_id = request_id(&req);
    let principal = match authenticate(&state, &headers, &request_id) {
        Ok(p) => p,
        Err(e) => return err_id(&request_id, e),
    };
    let body = match read_json::<UpdateBody>(req).await {
        Ok(v) => v,
        Err(e) => return err_id(&request_id, e),
    };
    if let Err(e) = validate_update(&body) {
        return err_id(&request_id, e);
    }
    let mut store = state.store.lock().expect("store lock");
    let Some(mut user) = store.users.get(&id).cloned() else {
        return err_id(
            &request_id,
            ApiError::new(
                StatusCode::NOT_FOUND,
                "USER_NOT_FOUND",
                "User was not found.",
            ),
        );
    };
    let admin = principal.roles.contains(&Role::Admin);
    if !admin && (principal.sub != id || body.roles.is_some() || body.status.is_some()) {
        audit(
            &mut store,
            "authorization_forbidden",
            Some(principal.sub),
            Some(id),
            None,
            &request_id,
            "denied",
        );
        return err_id(
            &request_id,
            ApiError::new(StatusCode::FORBIDDEN, "FORBIDDEN", "Forbidden."),
        );
    }
    if let Some(name) = body.display_name {
        user.display_name = name;
    }
    if admin {
        if let Some(roles) = body.roles {
            user.roles = roles;
        }
        if let Some(status) = body.status {
            user.status = status;
        }
    }
    user.updated_at = state.clock.now();
    store.users.insert(user.id.clone(), user.clone());
    audit(
        &mut store,
        "user_updated",
        Some(principal.sub),
        Some(user.id.clone()),
        None,
        &request_id,
        "success",
    );
    ok_id(
        &request_id,
        json!({ "user": public_user(&user) }),
        StatusCode::OK,
    )
}

async fn read_json<T: for<'de> Deserialize<'de>>(req: Request<Body>) -> Result<T, ApiError> {
    let bytes = to_bytes(req.into_body(), 1024 * 1024)
        .await
        .map_err(|_| ApiError::validation(vec![]))?;
    serde_json::from_slice(&bytes).map_err(|_| ApiError::validation(vec![]))
}
fn request_id(req: &Request<Body>) -> String {
    req.extensions()
        .get::<String>()
        .cloned()
        .unwrap_or_else(|| "unknown".to_string())
}
fn ok(req: &Request<Body>, data: Value, status: StatusCode) -> Response {
    ok_id(&request_id(req), data, status)
}
fn ok_id(request_id: &str, data: Value, status: StatusCode) -> Response {
    (
        status,
        Json(json!({ "data": data, "request_id": request_id })),
    )
        .into_response()
}
fn err(req: &Request<Body>, error: ApiError) -> Response {
    err_id(&request_id(req), error)
}
fn err_id(request_id: &str, error: ApiError) -> Response {
    (error.status, Json(json!({ "error": { "code": error.code, "message": error.message, "details": error.details }, "request_id": request_id }))).into_response()
}
fn public_user(user: &User) -> Value {
    json!({ "id": user.id, "email": user.email, "display_name": user.display_name, "roles": user.roles, "status": user.status, "created_at": user.created_at.to_rfc3339_opts(chrono::SecondsFormat::Secs, true), "updated_at": user.updated_at.to_rfc3339_opts(chrono::SecondsFormat::Secs, true) })
}
fn audit(
    store: &mut Store,
    action: &str,
    actor: Option<String>,
    target: Option<String>,
    session: Option<String>,
    request_id: &str,
    outcome: &str,
) {
    store.audits.push(AuditEntry {
        id: new_id("aud"),
        action: action.to_string(),
        actor_user_id: actor,
        target_user_id: target,
        session_id: session,
        request_id: request_id.to_string(),
        outcome: outcome.to_string(),
        metadata: HashMap::new(),
        created_at: Utc::now(),
    });
}
fn validate_register(body: &RegisterBody) -> Result<(), ApiError> {
    let mut details = vec![];
    let email_re = Regex::new(r"^[^@\s]+@[^@\s]+\.[^@\s]+$").expect("valid regex");
    if !email_re.is_match(&body.email) {
        details.push(json!({"field":"email","reason":"must be a valid email address"}));
    }
    if !strong_password(&body.password) {
        details.push(json!({"field":"password","reason":"must be at least 12 chars with upper, lower, and digit"}));
    }
    if body
        .display_name
        .as_ref()
        .is_some_and(|v| v.is_empty() || v.len() > 100)
    {
        details.push(json!({"field":"display_name","reason":"must be 1..100 characters"}));
    }
    if details.is_empty() {
        Ok(())
    } else {
        Err(ApiError::validation(details))
    }
}
fn validate_update(body: &UpdateBody) -> Result<(), ApiError> {
    if body
        .display_name
        .as_ref()
        .is_some_and(|v| v.is_empty() || v.len() > 100)
    {
        return Err(ApiError::validation(vec![
            json!({"field":"display_name","reason":"must be 1..100 characters"}),
        ]));
    }
    if body.roles.as_ref().is_some_and(Vec::is_empty) {
        return Err(ApiError::validation(vec![
            json!({"field":"roles","reason":"must contain user/admin roles"}),
        ]));
    }
    Ok(())
}
fn strong_password(value: &str) -> bool {
    value.len() >= 12
        && value.chars().any(char::is_lowercase)
        && value.chars().any(char::is_uppercase)
        && value.chars().any(|c| c.is_ascii_digit())
}
fn normalize(email: &str) -> String {
    email.trim().to_lowercase()
}
fn sign_access(state: &AppState, user: &User) -> Result<(String, String), ApiError> {
    let now = state.clock.now();
    let jti = new_id("jti");
    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        roles: user.roles.clone(),
        iat: now.timestamp() as usize,
        exp: (now + Duration::seconds(state.config.access_token_seconds)).timestamp() as usize,
        jti: jti.clone(),
        iss: state.config.issuer.clone(),
        aud: state.config.audience.clone(),
    };
    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|_| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "Internal error.",
        )
    })?;
    Ok((token, jti))
}
fn authenticate(
    state: &AppState,
    headers: &HeaderMap,
    request_id: &str,
) -> Result<Principal, ApiError> {
    let Some(raw) = headers.get(AUTHORIZATION).and_then(|v| v.to_str().ok()) else {
        return Err(ApiError::new(
            StatusCode::UNAUTHORIZED,
            "UNAUTHENTICATED",
            "Unauthenticated.",
        ));
    };
    let Some(token) = raw.strip_prefix("Bearer ") else {
        return Err(ApiError::new(
            StatusCode::UNAUTHORIZED,
            "UNAUTHENTICATED",
            "Unauthenticated.",
        ));
    };
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[state.config.issuer.clone()]);
    validation.set_audience(&[state.config.audience.clone()]);
    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &validation,
    ) {
        Ok(data) => Ok(Principal {
            sub: data.claims.sub,
            email: data.claims.email,
            roles: data.claims.roles,
            jti: data.claims.jti,
        }),
        Err(_) => {
            let mut store = state.store.lock().expect("store lock");
            audit(
                &mut store,
                "token_verify_failed",
                None,
                None,
                None,
                request_id,
                "failure",
            );
            Err(ApiError::new(
                StatusCode::UNAUTHORIZED,
                "UNAUTHENTICATED",
                "Unauthenticated.",
            ))
        }
    }
}
fn hash_password(password: &str, iterations: usize) -> String {
    let salt = random_token(16);
    let hash = iterative_hash(password, &salt, iterations);
    format!("sha256${}${}${}", iterations, salt, hash)
}
fn verify_password(password: &str, stored: &str) -> bool {
    let parts: Vec<_> = stored.split('$').collect();
    if parts.len() != 4 || parts[0] != "sha256" {
        return false;
    }
    let Ok(iterations) = parts[1].parse::<usize>() else {
        return false;
    };
    iterative_hash(password, parts[2], iterations) == parts[3]
}
fn iterative_hash(password: &str, salt: &str, iterations: usize) -> String {
    let mut digest = Sha256::digest(format!("{password}:{salt}").as_bytes()).to_vec();
    for _ in 1..iterations {
        digest = Sha256::digest(&digest).to_vec();
    }
    hex_string(&digest)
}
fn hash_refresh(token: &str) -> String {
    hex_string(&Sha256::digest(token.as_bytes()))
}
fn hex_string(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut output, byte| {
        let _ = write!(&mut output, "{byte:02x}");
        output
    })
}
fn random_token(size: usize) -> String {
    let mut bytes = vec![0_u8; size];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}
fn new_id(prefix: &str) -> String {
    format!("{prefix}_{}", Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Method;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    fn app() -> (Router, AppState) {
        let state = AppState {
            config: Config::default(),
            store: Arc::new(Mutex::new(Store::default())),
            clock: Arc::new(FixedClock { value: Utc::now() }),
        };
        (build_router(state.clone()), state)
    }
    async fn call(
        app: Router,
        method: Method,
        uri: &str,
        body: Value,
        token: Option<&str>,
    ) -> (StatusCode, Value) {
        let mut builder = Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json");
        if let Some(token) = token {
            builder = builder.header("authorization", format!("Bearer {token}"));
        }
        let req = builder.body(Body::from(body.to_string())).expect("request");
        let res = app.oneshot(req).await.expect("response");
        let status = res.status();
        let bytes = res.into_body().collect().await.expect("body").to_bytes();
        (
            status,
            serde_json::from_slice(&bytes).unwrap_or_else(|_| json!({})),
        )
    }
    async fn registered() -> (Router, AppState, String, String, String) {
        let (router, state) = app();
        let (status, body) = call(router.clone(), Method::POST, "/v1/auth/register", json!({"email":"Ada@Example.com","password":"CorrectHorse1Battery","display_name":"Ada"}), None).await;
        assert_eq!(status, StatusCode::CREATED);
        let user_id = body["data"]["user"]["id"].as_str().expect("id").to_string();
        let (status, body) = call(
            router.clone(),
            Method::POST,
            "/v1/auth/login",
            json!({"email":"ada@example.com","password":"CorrectHorse1Battery"}),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        (
            router,
            state,
            user_id,
            body["data"]["access_token"]
                .as_str()
                .expect("access")
                .to_string(),
            body["data"]["refresh_token"]
                .as_str()
                .expect("refresh")
                .to_string(),
        )
    }

    #[tokio::test]
    async fn register_validates_hashes_and_audits() {
        let (router, state) = app();
        let (status, body) = call(router.clone(), Method::POST, "/v1/auth/register", json!({"email":"Learner@Example.com","password":"CorrectHorse1Battery","display_name":"Learner"}), None).await;
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(body["data"]["user"]["email"], "learner@example.com");
        assert!(!body.to_string().contains("CorrectHorse1Battery"));
        {
            let store = state.store.lock().expect("store");
            let user = store.users.values().next().expect("user");
            assert_ne!(user.password_hash, "CorrectHorse1Battery");
            assert_eq!(store.audits[0].action, "user_registered");
        }
        let (status, _) = call(
            router.clone(),
            Method::POST,
            "/v1/auth/register",
            json!({"email":"bad","password":"weak"}),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        let (status, body) = call(
            router,
            Method::POST,
            "/v1/auth/register",
            json!({"email":"LEARNER@example.com","password":"CorrectHorse1Battery"}),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::CONFLICT);
        assert_eq!(body["error"]["code"], "EMAIL_ALREADY_REGISTERED");
    }
    #[tokio::test]
    async fn login_issues_jwt_and_hides_failures() {
        let (router, state, _, access, _) = registered().await;
        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_issuer(&[Config::default().issuer]);
        validation.set_audience(&[Config::default().audience]);
        let claims = decode::<Claims>(
            &access,
            &DecodingKey::from_secret(Config::default().jwt_secret.as_bytes()),
            &validation,
        )
        .expect("jwt")
        .claims;
        assert_eq!(claims.roles, vec![Role::User]);
        assert!(claims.jti.starts_with("jti_"));
        let (status, body) = call(
            router,
            Method::POST,
            "/v1/auth/login",
            json!({"email":"none@example.com","password":"WrongPassword1"}),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(body["error"]["code"], "INVALID_CREDENTIALS");
        assert!(state
            .store
            .lock()
            .expect("store")
            .audits
            .iter()
            .any(|a| a.action == "login_failed"));
    }
    #[tokio::test]
    async fn rbac_ownership_refresh_health_and_version() {
        let (router, state, user_id, access, refresh) = registered().await;
        assert_eq!(
            call(router.clone(), Method::GET, "/v1/users", json!({}), None)
                .await
                .0,
            StatusCode::UNAUTHORIZED
        );
        assert_eq!(
            call(
                router.clone(),
                Method::GET,
                "/v1/users",
                json!({}),
                Some(&access)
            )
            .await
            .0,
            StatusCode::FORBIDDEN
        );
        assert_eq!(
            call(
                router.clone(),
                Method::PUT,
                &format!("/v1/users/{user_id}"),
                json!({"display_name":"Ada L."}),
                Some(&access)
            )
            .await
            .0,
            StatusCode::OK
        );
        assert_eq!(
            call(
                router.clone(),
                Method::PUT,
                &format!("/v1/users/{user_id}"),
                json!({"roles":["admin"]}),
                Some(&access)
            )
            .await
            .0,
            StatusCode::FORBIDDEN
        );
        {
            let mut store = state.store.lock().expect("store");
            let user = store.users.get_mut(&user_id).expect("user");
            user.roles = vec![Role::Admin];
        }
        let (_, body) = call(
            router.clone(),
            Method::POST,
            "/v1/auth/login",
            json!({"email":"ada@example.com","password":"CorrectHorse1Battery"}),
            None,
        )
        .await;
        let admin = body["data"]["access_token"]
            .as_str()
            .expect("token")
            .to_string();
        assert_eq!(
            call(
                router.clone(),
                Method::GET,
                "/v1/users?limit=10",
                json!({}),
                Some(&admin)
            )
            .await
            .0,
            StatusCode::OK
        );
        let (status, _body) = call(
            router.clone(),
            Method::POST,
            "/v1/auth/refresh",
            json!({"refresh_token":refresh}),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        let (status, body) = call(
            router.clone(),
            Method::POST,
            "/v1/auth/refresh",
            json!({"refresh_token":refresh}),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(body["error"]["code"], "REFRESH_TOKEN_REPLAYED");
        assert_eq!(
            call(router.clone(), Method::GET, "/healthz", json!({}), None)
                .await
                .0,
            StatusCode::OK
        );
        assert_eq!(
            call(router, Method::GET, "/v2/users", json!({}), None)
                .await
                .0,
            StatusCode::NOT_FOUND
        );
    }
}
