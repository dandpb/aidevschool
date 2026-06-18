use load_balancer::{default_config, serve, BackendConfig, LoadBalancer};
use std::{env, net::SocketAddr};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().json().init();
    let raw = env::var("BACKENDS")
        .unwrap_or_else(|_| "http://127.0.0.1:9001,http://127.0.0.1:9002".to_string());
    let backends = raw
        .split(',')
        .enumerate()
        .map(|(index, url)| BackendConfig::new(&format!("backend-{}", index + 1), url.trim(), 1))
        .collect();
    let lb = LoadBalancer::new(default_config(backends)).expect("valid load balancer config");
    let health_task = lb.start_health_checks();
    let addr: SocketAddr = env::var("LISTEN_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8080".to_string())
        .parse()
        .expect("valid LISTEN_ADDR");
    if let Err(error) = serve(addr, lb).await {
        eprintln!("server error: {error}");
    }
    health_task.abort();
}
