use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub use async_trait::async_trait;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::sync::Notify;
use tracing::info;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct Config {
    pub worker_count: usize,
    pub capacity: usize,
    pub max_retries: u32,
    pub base_backoff_ms: u64,
    pub jitter_ms: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            worker_count: 4,
            capacity: 1000,
            max_retries: 3,
            base_backoff_ms: 100,
            jitter_ms: 50,
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct EnqueueRequest {
    pub payload: Value,
    #[serde(default)]
    pub priority: i32,
    pub idempotency_key: Option<String>,
    pub scheduled_for_ms: Option<i64>,
    pub max_retries: Option<u32>,
    pub timeout_ms: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Scheduled,
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelling,
    Cancelled,
    DeadLettered,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub payload: Value,
    pub status: TaskStatus,
    pub retries: u32,
    pub max_retries: u32,
    pub priority: i32,
    pub idempotency_key: Option<String>,
    pub scheduled_for_ms: Option<i64>,
    pub next_attempt_at_ms: Option<i64>,
    pub timeout_ms: Option<u64>,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    pub started_at_ms: Option<i64>,
    pub completed_at_ms: Option<i64>,
    pub cancelled_at_ms: Option<i64>,
    pub last_error: Option<String>,
    pub dead_letter: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct QueueStats {
    pub queue_depth: usize,
    pub scheduled_count: usize,
    pub running_count: usize,
    pub completed_count: usize,
    pub failed_count: usize,
    pub cancelled_count: usize,
    pub dead_letter_count: usize,
    pub worker_count: usize,
    pub busy_worker_count: usize,
    pub backpressure: String,
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum QueueError {
    #[error("queue_full")]
    QueueFull,
    #[error("shutting_down")]
    ShuttingDown,
    #[error("task_not_found")]
    NotFound,
    #[error("task_terminal")]
    Terminal,
    #[error("invalid_payload")]
    InvalidPayload,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TaskFailure {
    Transient(String),
    Poison(String),
}

#[async_trait]
pub trait TaskHandler: Send + Sync {
    async fn handle(&self, task: Task) -> Result<(), TaskFailure>;
}

#[derive(Clone)]
pub struct ManualClock {
    now_ms: Arc<Mutex<i64>>,
    notify: Arc<Notify>,
}

impl ManualClock {
    pub fn new(now_ms: i64) -> Self {
        Self {
            now_ms: Arc::new(Mutex::new(now_ms)),
            notify: Arc::new(Notify::new()),
        }
    }
    pub fn now_ms(&self) -> i64 {
        *self.now_ms.lock().expect("clock poisoned")
    }
    pub fn advance_ms(&self, delta: i64) {
        *self.now_ms.lock().expect("clock poisoned") += delta;
        self.notify.notify_waiters();
    }
}

#[derive(Clone)]
pub struct TaskQueue {
    inner: Arc<Mutex<Inner>>,
    notify: Arc<Notify>,
    handler: Arc<dyn TaskHandler>,
    clock: ManualClock,
}

#[derive(Default)]
struct Inner {
    config: Config,
    tasks: HashMap<String, Task>,
    idem: HashMap<String, String>,
    queue: Vec<QueuedItem>,
    dead_letters: Vec<Task>,
    running: usize,
    started: bool,
    shutting_down: bool,
    seq: u64,
}

#[derive(Clone, Debug)]
struct QueuedItem {
    id: String,
    priority: i32,
    due_ms: i64,
    seq: u64,
}

impl TaskQueue {
    pub fn new(config: Config, handler: Arc<dyn TaskHandler>, clock: ManualClock) -> Self {
        Self {
            inner: Arc::new(Mutex::new(Inner {
                config,
                ..Default::default()
            })),
            notify: Arc::new(Notify::new()),
            handler,
            clock,
        }
    }

    pub async fn start(&self) -> Result<(), QueueError> {
        let worker_count = {
            let mut inner = self.inner.lock().expect("queue poisoned");
            if inner.started {
                return Ok(());
            }
            inner.started = true;
            inner.config.worker_count
        };
        for worker_id in 0..worker_count {
            let queue = self.clone();
            tokio::spawn(async move {
                queue.worker_loop(worker_id).await;
            });
        }
        Ok(())
    }

    pub async fn enqueue(&self, req: EnqueueRequest) -> Result<Task, QueueError> {
        if req.payload.is_null() {
            return Err(QueueError::InvalidPayload);
        }
        let mut inner = self.inner.lock().expect("queue poisoned");
        if inner.shutting_down {
            return Err(QueueError::ShuttingDown);
        }
        if let Some(key) = &req.idempotency_key {
            if let Some(id) = inner.idem.get(key) {
                return Ok(inner
                    .tasks
                    .get(id)
                    .expect("idempotency index target")
                    .clone());
            }
        }
        if active_count(&inner) >= inner.config.capacity {
            return Err(QueueError::QueueFull);
        }
        let now = self.clock.now_ms();
        let status = if req.scheduled_for_ms.is_some_and(|due| due > now) {
            TaskStatus::Scheduled
        } else {
            TaskStatus::Queued
        };
        let task = Task {
            id: Uuid::new_v4().to_string(),
            payload: req.payload,
            status: status.clone(),
            retries: 0,
            max_retries: req.max_retries.unwrap_or(inner.config.max_retries),
            priority: req.priority,
            idempotency_key: req.idempotency_key.clone(),
            scheduled_for_ms: req.scheduled_for_ms,
            next_attempt_at_ms: None,
            timeout_ms: req.timeout_ms,
            created_at_ms: now,
            updated_at_ms: now,
            started_at_ms: None,
            completed_at_ms: None,
            cancelled_at_ms: None,
            last_error: None,
            dead_letter: false,
        };
        if let Some(key) = &task.idempotency_key {
            inner.idem.insert(key.clone(), task.id.clone());
        }
        let due = task.scheduled_for_ms.unwrap_or(now);
        inner.seq += 1;
        let seq = inner.seq;
        inner.queue.push(QueuedItem {
            id: task.id.clone(),
            priority: task.priority,
            due_ms: due,
            seq,
        });
        inner.tasks.insert(task.id.clone(), task.clone());
        info!(task_id = %task.id, next_status = ?status, "task_transition");
        drop(inner);
        self.notify.notify_waiters();
        Ok(task)
    }

    pub async fn get(&self, id: &str) -> Result<Task, QueueError> {
        self.inner
            .lock()
            .expect("queue poisoned")
            .tasks
            .get(id)
            .cloned()
            .ok_or(QueueError::NotFound)
    }

    pub async fn cancel(&self, id: &str) -> Result<Task, QueueError> {
        let mut inner = self.inner.lock().expect("queue poisoned");
        let now = self.clock.now_ms();
        let task = inner.tasks.get_mut(id).ok_or(QueueError::NotFound)?;
        match task.status {
            TaskStatus::Queued | TaskStatus::Scheduled => {
                task.status = TaskStatus::Cancelled;
                task.cancelled_at_ms = Some(now);
                task.updated_at_ms = now;
            }
            TaskStatus::Running => {
                task.status = TaskStatus::Cancelling;
                task.updated_at_ms = now;
            }
            _ => return Err(QueueError::Terminal),
        }
        self.notify.notify_waiters();
        Ok(task.clone())
    }

    pub async fn stats(&self) -> QueueStats {
        let inner = self.inner.lock().expect("queue poisoned");
        stats(&inner)
    }
    pub async fn dead_letters(&self) -> Vec<Task> {
        self.inner
            .lock()
            .expect("queue poisoned")
            .dead_letters
            .clone()
    }
    pub async fn dequeue_for_test(&self) -> Option<Task> {
        self.dequeue_ready().await
    }

    pub async fn shutdown(&self, timeout: Duration) -> Result<(), QueueError> {
        {
            let mut inner = self.inner.lock().expect("queue poisoned");
            inner.shutting_down = true;
        }
        self.notify.notify_waiters();
        let deadline = tokio::time::Instant::now() + timeout;
        while tokio::time::Instant::now() < deadline {
            if self.is_drained() {
                return Ok(());
            }
            tokio::select! {
                _ = self.notify.notified() => {},
                _ = tokio::time::sleep(Duration::from_millis(5)) => {},
            }
        }
        Err(QueueError::ShuttingDown)
    }

    async fn worker_loop(&self, worker_id: usize) {
        loop {
            if self.should_worker_exit() {
                return;
            }
            if let Some(task) = self.dequeue_ready().await {
                self.run_task(worker_id, task).await;
            } else {
                tokio::select! { _ = self.notify.notified() => {}, _ = self.clock.notify.notified() => {}, _ = tokio::time::sleep(Duration::from_millis(5)) => {} }
            }
        }
    }

    async fn dequeue_ready(&self) -> Option<Task> {
        let mut inner = self.inner.lock().expect("queue poisoned");
        sort_queue(&mut inner.queue);
        let now = self.clock.now_ms();
        while let Some(item) = inner.queue.first().cloned() {
            if item.due_ms > now {
                return None;
            }
            inner.queue.remove(0);
            let task = match inner.tasks.get_mut(&item.id) {
                Some(task) => task,
                None => continue,
            };
            if !matches!(task.status, TaskStatus::Queued | TaskStatus::Scheduled) {
                continue;
            }
            let due = task
                .next_attempt_at_ms
                .or(task.scheduled_for_ms)
                .unwrap_or(now);
            if due > now {
                let priority = task.priority;
                let id = task.id.clone();
                let _ = task;
                inner.seq += 1;
                let seq = inner.seq;
                inner.queue.push(QueuedItem {
                    id,
                    priority,
                    due_ms: due,
                    seq,
                });
                return None;
            }
            task.status = TaskStatus::Running;
            task.started_at_ms = Some(now);
            task.updated_at_ms = now;
            let cloned = task.clone();
            let _ = task;
            inner.running += 1;
            return Some(cloned);
        }
        None
    }

    async fn run_task(&self, worker_id: usize, task: Task) {
        let result = self.handler.handle(task.clone()).await;
        self.finish(worker_id, &task.id, result).await;
    }

    async fn finish(&self, _worker_id: usize, id: &str, result: Result<(), TaskFailure>) {
        let mut inner = self.inner.lock().expect("queue poisoned");
        inner.running = inner.running.saturating_sub(1);
        let now = self.clock.now_ms();
        let base_backoff_ms = inner.config.base_backoff_ms;
        let mut retry_item: Option<QueuedItem> = None;
        let mut dlq_task: Option<Task> = None;
        let mut notify = true;
        if let Some(task) = inner.tasks.get_mut(id) {
            match result {
                Ok(()) => {
                    task.status = TaskStatus::Succeeded;
                    task.completed_at_ms = Some(now);
                    task.updated_at_ms = now;
                }
                Err(TaskFailure::Poison(message)) => {
                    task.status = TaskStatus::DeadLettered;
                    task.dead_letter = true;
                    task.last_error = Some(message);
                    task.completed_at_ms = Some(now);
                    task.updated_at_ms = now;
                    dlq_task = Some(task.clone());
                }
                Err(TaskFailure::Transient(message)) => {
                    task.last_error = Some(message);
                    if task.retries >= task.max_retries {
                        task.status = TaskStatus::DeadLettered;
                        task.dead_letter = true;
                        task.completed_at_ms = Some(now);
                        task.updated_at_ms = now;
                        dlq_task = Some(task.clone());
                    } else {
                        task.retries += 1;
                        let due = now + (base_backoff_ms as i64 * 2_i64.pow(task.retries - 1));
                        task.status = TaskStatus::Scheduled;
                        task.next_attempt_at_ms = Some(due);
                        task.updated_at_ms = now;
                        retry_item = Some(QueuedItem {
                            id: task.id.clone(),
                            priority: task.priority,
                            due_ms: due,
                            seq: 0,
                        });
                        notify = false;
                    }
                }
            }
        }
        if let Some(task) = dlq_task {
            inner.dead_letters.push(task);
        }
        if let Some(mut item) = retry_item {
            inner.seq += 1;
            item.seq = inner.seq;
            inner.queue.push(item);
        }
        drop(inner);
        if notify {
            self.notify.notify_waiters();
        }
    }

    fn is_drained(&self) -> bool {
        let inner = self.inner.lock().expect("queue poisoned");
        active_count(&inner) == 0 && inner.running == 0
    }
    fn should_worker_exit(&self) -> bool {
        let inner = self.inner.lock().expect("queue poisoned");
        inner.shutting_down && active_count(&inner) == 0 && inner.running == 0
    }
}

fn active_count(inner: &Inner) -> usize {
    inner
        .tasks
        .values()
        .filter(|t| {
            matches!(
                t.status,
                TaskStatus::Queued
                    | TaskStatus::Scheduled
                    | TaskStatus::Running
                    | TaskStatus::Cancelling
            )
        })
        .count()
}
fn sort_queue(queue: &mut [QueuedItem]) {
    queue.sort_by(|a, b| {
        a.due_ms
            .cmp(&b.due_ms)
            .then_with(|| b.priority.cmp(&a.priority))
            .then_with(|| a.seq.cmp(&b.seq))
    });
}
fn stats(inner: &Inner) -> QueueStats {
    let mut s = QueueStats {
        queue_depth: 0,
        scheduled_count: 0,
        running_count: 0,
        completed_count: 0,
        failed_count: 0,
        cancelled_count: 0,
        dead_letter_count: 0,
        worker_count: inner.config.worker_count,
        busy_worker_count: inner.running,
        backpressure: "open".into(),
    };
    for task in inner.tasks.values() {
        match task.status {
            TaskStatus::Queued => s.queue_depth += 1,
            TaskStatus::Scheduled => s.scheduled_count += 1,
            TaskStatus::Running | TaskStatus::Cancelling => s.running_count += 1,
            TaskStatus::Succeeded => s.completed_count += 1,
            TaskStatus::Failed => s.failed_count += 1,
            TaskStatus::Cancelled => s.cancelled_count += 1,
            TaskStatus::DeadLettered => {
                s.dead_letter_count += 1;
                s.failed_count += 1;
            }
        }
    }
    if inner.shutting_down {
        s.backpressure = "shutting_down".into();
    } else if active_count(inner) >= inner.config.capacity {
        s.backpressure = "full".into();
    } else if active_count(inner) * 100 >= inner.config.capacity * 80 {
        s.backpressure = "limited".into();
    }
    s
}

pub fn router(queue: TaskQueue) -> Router {
    Router::new()
        .route("/healthz", get(|| async { Json(json!({"status":"ok"})) }))
        .route("/stats", get(stats_handler))
        .route("/tasks", post(enqueue_handler))
        .route(
            "/tasks/:id",
            get(get_task_handler).delete(cancel_task_handler),
        )
        .with_state(queue)
}
async fn enqueue_handler(
    State(queue): State<TaskQueue>,
    Json(req): Json<EnqueueRequest>,
) -> impl IntoResponse {
    match queue.enqueue(req).await {
        Ok(task) => (StatusCode::CREATED, Json(json!(task))).into_response(),
        Err(err) => error_response(err),
    }
}
async fn get_task_handler(
    State(queue): State<TaskQueue>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match queue.get(&id).await {
        Ok(task) => (StatusCode::OK, Json(json!(task))).into_response(),
        Err(err) => error_response(err),
    }
}
async fn cancel_task_handler(
    State(queue): State<TaskQueue>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match queue.cancel(&id).await {
        Ok(task) => (StatusCode::OK, Json(json!(task))).into_response(),
        Err(err) => error_response(err),
    }
}
async fn stats_handler(State(queue): State<TaskQueue>) -> impl IntoResponse {
    Json(queue.stats().await)
}
fn error_response(err: QueueError) -> axum::response::Response {
    let status = match err {
        QueueError::InvalidPayload => StatusCode::BAD_REQUEST,
        QueueError::QueueFull => StatusCode::TOO_MANY_REQUESTS,
        QueueError::ShuttingDown => StatusCode::SERVICE_UNAVAILABLE,
        QueueError::NotFound => StatusCode::NOT_FOUND,
        QueueError::Terminal => StatusCode::CONFLICT,
    };
    (status, Json(json!({"error": err.to_string()}))).into_response()
}

pub async fn run(addr: SocketAddr) -> Result<(), Box<dyn std::error::Error>> {
    let queue = TaskQueue::new(
        Config::default(),
        Arc::new(NoopHandler),
        ManualClock::new(chrono::Utc::now().timestamp_millis()),
    );
    queue.start().await?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, router(queue)).await?;
    Ok(())
}
pub struct NoopHandler;
#[async_trait]
impl TaskHandler for NoopHandler {
    async fn handle(&self, _task: Task) -> Result<(), TaskFailure> {
        Ok(())
    }
}
