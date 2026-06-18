use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use distributed_job_scheduler::{Health, Scheduler};
use std::env;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::net::TcpListener;
use tracing::info;

type SharedScheduler = Arc<Mutex<Scheduler>>;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().json().init();

    let scheduler = Arc::new(Mutex::new(Scheduler::new("rust-node")));
    {
        let mut guard = scheduler.lock().expect("scheduler lock poisoned");
        guard.become_leader(["rust-node"], Duration::from_secs(30));
    }

    let app = Router::new()
        .route("/health", get(health))
        .with_state(Arc::clone(&scheduler));

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let listener = TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("bind server");
    info!(addr = %listener.local_addr().expect("local addr"), "scheduler_started");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("serve scheduler");
}

async fn health(State(scheduler): State<SharedScheduler>) -> impl IntoResponse {
    match scheduler.lock() {
        Ok(guard) => (StatusCode::OK, Json(guard.health())).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(Health {
                node_id: "rust-node".to_string(),
                leader_id: None,
                queue_depth: 0,
                running_jobs: 0,
                expired_locks: 0,
            }),
        )
            .into_response(),
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install ctrl-c handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
    info!("scheduler_stopping");
}
