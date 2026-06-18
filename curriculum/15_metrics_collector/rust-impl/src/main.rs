use metrics_collector_rust::app;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = app();
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("metrics collector listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
