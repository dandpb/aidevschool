use std::net::SocketAddr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt().json().init();
    let port = std::env::var("PORT").unwrap_or_else(|_| "8084".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{port}").parse()?;
    concurrent_task_queue_rust::run(addr).await
}
