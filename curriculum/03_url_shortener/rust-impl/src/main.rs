#[tokio::main]
async fn main() {
    url_shortener_rust::init_tracing();
    if let Err(error) = url_shortener_rust::run().await {
        tracing::error!(%error, "server_failed");
        std::process::exit(1);
    }
}
