use distributed_cache::*;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use std::thread;
use std::time::Duration;

#[test]
fn set_get_delete_ttl_and_invalidation() {
    let cache = Cache::new(
        Config::new("node-a")
            .capacity_entries(10)
            .max_value_bytes(64)
            .default_ttl(Duration::from_secs(60)),
    );
    let set = cache
        .set(
            "users:1",
            "Ada",
            Some("users"),
            Some(Duration::from_millis(25)),
            false,
        )
        .unwrap();
    assert!(set.stored);
    assert_eq!(set.version, 1);
    let hit = cache.get("users:1", false).unwrap();
    assert!(hit.hit);
    assert_eq!(hit.value.as_deref(), Some("Ada"));
    assert!(hit.ttl_remaining_ms > 0);
    thread::sleep(Duration::from_millis(35));
    assert!(!cache.get("users:1", false).unwrap().hit);
    assert_eq!(cache.metrics().expirations, 1);

    cache
        .set("users:2", "Grace", Some("users"), None, false)
        .unwrap();
    assert_eq!(
        cache
            .invalidate(Invalidation::Namespace("users".into()))
            .unwrap(),
        1
    );
    assert!(!cache.get("users:2", false).unwrap().hit);
    assert!(!cache.delete("users:2").unwrap().deleted);
}

#[test]
fn lru_and_lfu_eviction_are_selectable() {
    let lru = Cache::new(
        Config::new("node-a")
            .capacity_entries(2)
            .eviction_policy(EvictionPolicy::Lru),
    );
    lru.set("a", "1", None, None, false).unwrap();
    lru.set("b", "2", None, None, false).unwrap();
    lru.get("a", false).unwrap();
    lru.set("c", "3", None, None, false).unwrap();
    assert!(!lru.get("b", false).unwrap().hit);

    let lfu = Cache::new(
        Config::new("node-a")
            .capacity_entries(2)
            .eviction_policy(EvictionPolicy::Lfu),
    );
    lfu.set("a", "1", None, None, false).unwrap();
    lfu.set("b", "2", None, None, false).unwrap();
    lfu.get("a", false).unwrap();
    lfu.get("a", false).unwrap();
    lfu.set("c", "3", None, None, false).unwrap();
    assert!(!lfu.get("b", false).unwrap().hit);
    assert_eq!(lfu.metrics().evictions, 1);
}

#[test]
fn consistent_hashing_uses_virtual_nodes_and_bounded_remap() {
    let ring = HashRing::new(vec![Node::new("a"), Node::new("b"), Node::new("c")], 64);
    let before: Vec<_> = (0..500)
        .map(|i| (format!("key-{i}"), ring.owner(&format!("key-{i}")).id))
        .collect();
    ring.add(Node::new("d"));
    let remapped = before
        .iter()
        .filter(|(key, owner)| ring.owner(key).id != *owner)
        .count();
    assert!(remapped > 0 && remapped < 250, "remapped {remapped}");
    assert_eq!(ring.tokens_for("a").len(), 64);
}

#[test]
fn cache_aside_singleflight_write_through_and_capacity_errors() {
    let store = Arc::new(MemoryStore::new(
        [("hot".to_string(), "loaded".to_string())].into(),
    ));
    let loads = Arc::new(AtomicUsize::new(0));
    let cache = Arc::new(Cache::new(
        Config::new("node-a")
            .capacity_entries(5)
            .max_value_bytes(8)
            .loader({
                let store = store.clone();
                let loads = loads.clone();
                move |key| {
                    loads.fetch_add(1, Ordering::SeqCst);
                    thread::sleep(Duration::from_millis(20));
                    store.load(key)
                }
            })
            .writer({
                let store = store.clone();
                move |key, value| store.write(key, value)
            }),
    ));
    let mut handles = vec![];
    for _ in 0..8 {
        let cache = cache.clone();
        handles.push(thread::spawn(move || cache.get("hot", true).unwrap()));
    }
    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    assert_eq!(loads.load(Ordering::SeqCst), 1);
    assert!(results
        .iter()
        .all(|r| r.loaded && r.value.as_deref() == Some("loaded")));
    assert!(results.iter().any(|r| r.coalesced));
    assert_eq!(cache.metrics().loader_calls, 1);
    assert!(cache.metrics().singleflight_coalesces > 0);

    assert!(matches!(
        cache.set("too-big", "this is too large", None, None, false),
        Err(CacheError::ValueTooLarge)
    ));
    store.fail_writes(true);
    assert!(matches!(
        cache.set("w", "ok", None, None, true),
        Err(CacheError::BackingStore)
    ));
}

#[test]
fn http_health_metrics_and_shutdown() {
    let cache = Cache::new(
        Config::new("node-a")
            .capacity_entries(10)
            .max_value_bytes(64),
    );
    let app = HttpApp::new(cache.clone());
    let put = app.handle(
        "PUT",
        "/cache/hello",
        r#"{"value":"world","ttlMs":60000,"namespace":"demo"}"#,
    );
    assert_eq!(put.status, 201);
    let get = app.handle("GET", "/cache/hello", "");
    assert_eq!(get.status, 200);
    assert!(get.body.contains("\"hit\":true"));
    let health = app.handle("GET", "/health", "");
    assert_eq!(health.status, 200);
    assert!(health.body.contains("\"status\":\"ok\""));
    let metrics = app.handle("GET", "/metrics", "");
    assert_eq!(metrics.status, 200);
    assert!(metrics.body.contains("hits"));
    cache.shutdown();
    assert!(cache.is_shutdown());
}

#[test]
fn validation_ring_and_http_edges_are_handled() {
    let cache = Cache::new(
        Config::new("node-a")
            .capacity_entries(3)
            .max_value_bytes(4)
            .default_ttl(Duration::from_secs(60)),
    );
    assert!(matches!(
        cache.set("", "x", None, None, false),
        Err(CacheError::InvalidKey)
    ));
    assert!(matches!(cache.get("", false), Err(CacheError::InvalidKey)));
    cache.set("pref:1", "one", None, None, false).unwrap();
    cache.set("pref:2", "two", None, None, false).unwrap();
    assert_eq!(
        cache
            .invalidate(Invalidation::Prefix("pref:".into()))
            .unwrap(),
        2
    );

    let app = HttpApp::new(cache.clone());
    let ring = app.handle("GET", "/cluster/ring", "");
    assert_eq!(ring.status, 200);
    assert!(ring.body.contains("virtualNodes"));
    let invalidation = app.handle("POST", "/cache/invalidate", r#"{"prefix":"none:"}"#);
    assert_eq!(invalidation.status, 202);
    let bad_invalidation = app.handle("POST", "/cache/invalidate", "{}");
    assert_eq!(bad_invalidation.status, 400);
    let too_large = app.handle("PUT", "/cache/big", r#"{"value":"large"}"#);
    assert_eq!(too_large.status, 413);
    let bad_json = app.handle("PUT", "/cache/bad", "not-json");
    assert_eq!(bad_json.status, 400);
    let missing = app.handle("DELETE", "/cache/missing", "");
    assert_eq!(missing.status, 200);
    assert!(missing.body.contains("not_found"));
    let method = app.handle("PATCH", "/cache/missing", "");
    assert_eq!(method.status, 405);
    let not_found = app.handle("GET", "/not-cache", "");
    assert_eq!(not_found.status, 404);
}
