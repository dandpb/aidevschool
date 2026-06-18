use rest_api_auth_rust::{build_router, AppState, Config, RealClock};
use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::signal;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().json())
        .init();
    let mut config = Config::default();
    if let Ok(secret) = std::env::var("JWT_SECRET") {
        config.jwt_secret = secret;
    }
    let state = AppState {
        config,
        store: Arc::new(Mutex::new(Default::default())),
        clock: Arc::new(RealClock),
    };
    let app = build_router(state);
    let addr: SocketAddr = "0.0.0.0:8080".parse().expect("valid listen address");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind server");
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = signal::ctrl_c().await;
        })
        .await
        .expect("server");
}
