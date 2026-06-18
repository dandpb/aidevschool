use plugin_system_rust::PluginHost;

fn main() {
    let host = PluginHost::new("1.2.0");
    let health = serde_json::to_string(&host.health()).expect("health serializes");
    println!("{health}");
}
