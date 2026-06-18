use websocket_chat_rust::{server, ChatConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    let port = std::env::var("PORT").unwrap_or_else(|_| "8085".to_string());
    server::run(&format!("0.0.0.0:{port}"), ChatConfig::default()).await
}
