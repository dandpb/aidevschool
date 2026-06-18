use log_aggregator_rust::run;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    run().await;
}
