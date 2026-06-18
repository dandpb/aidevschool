use std::sync::{
    atomic::AtomicBool,
    atomic::{AtomicI32, Ordering},
    Arc,
};
use std::time::Duration;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use concurrent_task_queue_rust::*;
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn priority_fifo_idempotency_and_backpressure_work() {
    let clock = ManualClock::new(1_000);
    let queue = TaskQueue::new(
        Config {
            worker_count: 0,
            capacity: 2,
            max_retries: 1,
            base_backoff_ms: 100,
            jitter_ms: 0,
        },
        Arc::new(SucceedingHandler),
        clock.clone(),
    );

    let low = queue
        .enqueue(EnqueueRequest {
            payload: json!({"name":"low"}),
            priority: 0,
            idempotency_key: Some("same".into()),
            ..Default::default()
        })
        .await
        .unwrap();
    let duplicate = queue
        .enqueue(EnqueueRequest {
            payload: json!({"name":"dup"}),
            priority: 9,
            idempotency_key: Some("same".into()),
            ..Default::default()
        })
        .await
        .unwrap();
    assert_eq!(low.id, duplicate.id);
    let high_a = queue
        .enqueue(EnqueueRequest {
            payload: json!({"name":"high-a"}),
            priority: 2,
            ..Default::default()
        })
        .await
        .unwrap();
    assert!(matches!(
        queue
            .enqueue(EnqueueRequest {
                payload: json!({"name":"overflow"}),
                ..Default::default()
            })
            .await,
        Err(QueueError::QueueFull)
    ));

    let first = queue.dequeue_for_test().await.unwrap();
    let second = queue.dequeue_for_test().await.unwrap();
    assert_eq!(first.id, high_a.id);
    assert_eq!(second.id, low.id);
}

#[tokio::test]
async fn workers_retry_with_backoff_then_dead_letter() {
    let clock = ManualClock::new(2_000);
    let queue = TaskQueue::new(
        Config {
            worker_count: 1,
            capacity: 4,
            max_retries: 2,
            base_backoff_ms: 100,
            jitter_ms: 0,
        },
        Arc::new(FailingHandler),
        clock.clone(),
    );
    queue.start().await.unwrap();
    let task = queue
        .enqueue(EnqueueRequest {
            payload: json!({"kind":"retry"}),
            ..Default::default()
        })
        .await
        .unwrap();
    wait_until(|| async { queue.get(&task.id).await.unwrap().retries == 1 }).await;
    clock.advance_ms(110);
    wait_until(|| async { queue.get(&task.id).await.unwrap().retries == 2 }).await;
    clock.advance_ms(210);
    wait_until(|| async { queue.get(&task.id).await.unwrap().status == TaskStatus::DeadLettered })
        .await;
    let stats = queue.stats().await;
    assert_eq!(stats.dead_letter_count, 1);
    assert_eq!(queue.dead_letters().await.len(), 1);
    queue.shutdown(Duration::from_secs(1)).await.unwrap();
}

#[tokio::test]
async fn worker_limit_cancellation_zero_workers_and_shutdown() {
    let clock = ManualClock::new(3_000);
    let running = Arc::new(AtomicI32::new(0));
    let max_running = Arc::new(AtomicI32::new(0));
    let release = Arc::new(AtomicBool::new(false));
    let handler = Arc::new(BlockingHandler {
        running: running.clone(),
        max_running: max_running.clone(),
        release: release.clone(),
    });
    let queue = TaskQueue::new(
        Config {
            worker_count: 2,
            capacity: 6,
            max_retries: 0,
            base_backoff_ms: 1,
            jitter_ms: 0,
        },
        handler,
        clock.clone(),
    );
    queue.start().await.unwrap();
    let scheduled_at = clock.now_ms() + 10_000;
    let scheduled = queue
        .enqueue(EnqueueRequest {
            payload: json!({"kind":"scheduled"}),
            scheduled_for_ms: Some(scheduled_at),
            ..Default::default()
        })
        .await
        .unwrap();
    let cancelled = queue
        .enqueue(EnqueueRequest {
            payload: json!({"kind":"cancel"}),
            ..Default::default()
        })
        .await
        .unwrap();
    queue.cancel(&cancelled.id).await.unwrap();
    for i in 0..3 {
        queue
            .enqueue(EnqueueRequest {
                payload: json!({"n": i}),
                ..Default::default()
            })
            .await
            .unwrap();
    }
    wait_until(|| async { queue.stats().await.busy_worker_count == 2 }).await;
    assert!(max_running.load(Ordering::SeqCst) <= 2);
    release.store(true, Ordering::SeqCst);
    clock.advance_ms(11_000);
    queue.shutdown(Duration::from_secs(1)).await.unwrap();
    assert_eq!(
        queue.get(&scheduled.id).await.unwrap().status,
        TaskStatus::Succeeded
    );
    assert!(matches!(
        queue
            .enqueue(EnqueueRequest {
                payload: json!({"late":true}),
                ..Default::default()
            })
            .await,
        Err(QueueError::ShuttingDown)
    ));

    let paused = TaskQueue::new(
        Config {
            worker_count: 0,
            capacity: 2,
            max_retries: 0,
            base_backoff_ms: 1,
            jitter_ms: 0,
        },
        Arc::new(SucceedingHandler),
        clock,
    );
    paused.start().await.unwrap();
    let queued = paused
        .enqueue(EnqueueRequest {
            payload: json!({"paused":true}),
            ..Default::default()
        })
        .await
        .unwrap();
    tokio::time::sleep(Duration::from_millis(20)).await;
    assert_eq!(
        paused.get(&queued.id).await.unwrap().status,
        TaskStatus::Queued
    );
}

#[tokio::test]
async fn http_routes_map_success_and_errors() {
    let clock = ManualClock::new(4_000);
    let queue = TaskQueue::new(
        Config {
            worker_count: 0,
            capacity: 1,
            max_retries: 0,
            base_backoff_ms: 1,
            jitter_ms: 0,
        },
        Arc::new(SucceedingHandler),
        clock,
    );
    let app = router(queue);

    let health = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::OK);

    let create = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/tasks")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"payload":{"hello":"world"},"idempotency_key":"http"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create.status(), StatusCode::CREATED);

    let full = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/tasks")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"payload":{"two":true}}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(full.status(), StatusCode::TOO_MANY_REQUESTS);

    let missing = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/tasks/missing")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);

    let stats = app
        .oneshot(
            Request::builder()
                .uri("/stats")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(stats.status(), StatusCode::OK);
}

#[tokio::test]
async fn poison_invalid_terminal_and_shutdown_timeout_paths() {
    let clock = ManualClock::new(5_000);
    let release = Arc::new(AtomicBool::new(false));
    let queue = TaskQueue::new(
        Config {
            worker_count: 1,
            capacity: 3,
            max_retries: 0,
            base_backoff_ms: 1,
            jitter_ms: 0,
        },
        Arc::new(MixedHandler {
            release: release.clone(),
        }),
        clock,
    );
    assert!(matches!(
        queue.enqueue(EnqueueRequest::default()).await,
        Err(QueueError::InvalidPayload)
    ));
    queue.start().await.unwrap();

    let poison = queue
        .enqueue(EnqueueRequest {
            payload: json!({"poison": true}),
            ..Default::default()
        })
        .await
        .unwrap();
    wait_until(|| async {
        queue.get(&poison.id).await.unwrap().status == TaskStatus::DeadLettered
    })
    .await;
    assert!(matches!(
        queue.cancel(&poison.id).await,
        Err(QueueError::Terminal)
    ));

    let blocked = queue
        .enqueue(EnqueueRequest {
            payload: json!({"block": true}),
            ..Default::default()
        })
        .await
        .unwrap();
    wait_until(|| async { queue.get(&blocked.id).await.unwrap().status == TaskStatus::Running })
        .await;
    assert!(matches!(
        queue.shutdown(Duration::from_millis(20)).await,
        Err(QueueError::ShuttingDown)
    ));
    release.store(true, Ordering::SeqCst);
}

async fn wait_until<F, Fut>(mut check: F)
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = bool>,
{
    let deadline = tokio::time::Instant::now() + Duration::from_secs(2);
    while tokio::time::Instant::now() < deadline {
        if check().await {
            return;
        }
        tokio::time::sleep(Duration::from_millis(5)).await;
    }
    panic!("condition not met");
}

struct SucceedingHandler;
#[async_trait]
impl TaskHandler for SucceedingHandler {
    async fn handle(&self, _task: Task) -> Result<(), TaskFailure> {
        Ok(())
    }
}

struct FailingHandler;
#[async_trait]
impl TaskHandler for FailingHandler {
    async fn handle(&self, _task: Task) -> Result<(), TaskFailure> {
        Err(TaskFailure::Transient("nope".into()))
    }
}

struct BlockingHandler {
    running: Arc<AtomicI32>,
    max_running: Arc<AtomicI32>,
    release: Arc<AtomicBool>,
}
#[async_trait]
impl TaskHandler for BlockingHandler {
    async fn handle(&self, _task: Task) -> Result<(), TaskFailure> {
        let cur = self.running.fetch_add(1, Ordering::SeqCst) + 1;
        self.max_running.fetch_max(cur, Ordering::SeqCst);
        while !self.release.load(Ordering::SeqCst) {
            tokio::time::sleep(Duration::from_millis(1)).await;
        }
        self.running.fetch_sub(1, Ordering::SeqCst);
        Ok(())
    }
}

struct MixedHandler {
    release: Arc<AtomicBool>,
}

#[async_trait]
impl TaskHandler for MixedHandler {
    async fn handle(&self, task: Task) -> Result<(), TaskFailure> {
        if task.payload.get("poison") == Some(&json!(true)) {
            return Err(TaskFailure::Poison("poison".into()));
        }
        while !self.release.load(Ordering::SeqCst) {
            tokio::time::sleep(Duration::from_millis(1)).await;
        }
        Ok(())
    }
}
