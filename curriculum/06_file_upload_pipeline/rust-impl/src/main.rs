#[tokio::main]
async fn main() {
    if let Err(error) = file_upload_pipeline_rust::run().await {
        eprintln!("server failed: {error}");
        std::process::exit(1);
    }
}
