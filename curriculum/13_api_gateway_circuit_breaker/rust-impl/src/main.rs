use api_gateway_rust::{run, Config};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let config = Config::default();
    run(config).await;
}
