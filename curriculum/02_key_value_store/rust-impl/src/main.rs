#[tokio::main]
async fn main() {
    if let Err(error) = key_value_store_rust::run().await {
        tracing::error!(%error, "server_failed");
        std::process::exit(1);
    }
}
