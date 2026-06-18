use distributed_cache::{Cache, Config, HttpApp};

fn main() {
    let cache = Cache::new(
        Config::new("rust-node-a")
            .capacity_entries(1024)
            .max_value_bytes(1 << 20),
    );
    let app = HttpApp::new(cache.clone());
    let health = app.handle("GET", "/health", "");
    println!("distributed-cache rust node ready: {}", health.body);
    cache.shutdown();
}
