use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Condvar, Mutex, RwLock};
use std::time::{Duration, Instant};

type LoaderFn = dyn Fn(&str) -> Result<String, CacheError> + Send + Sync;
type WriterFn = dyn Fn(&str, &str) -> Result<(), CacheError> + Send + Sync;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Node {
    pub id: String,
    pub address: String,
}

impl Node {
    pub fn new(id: &str) -> Self {
        Self {
            id: id.into(),
            address: String::new(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EvictionPolicy {
    Lru,
    Lfu,
}

#[derive(Clone)]
pub struct Config {
    pub node_id: String,
    pub shards: Vec<Node>,
    pub capacity_entries: usize,
    pub max_value_bytes: usize,
    pub eviction_policy: EvictionPolicy,
    pub virtual_nodes: usize,
    pub default_ttl: Option<Duration>,
    pub loader: Option<Arc<LoaderFn>>,
    pub writer: Option<Arc<WriterFn>>,
}

impl Config {
    pub fn new(node_id: &str) -> Self {
        Self {
            node_id: node_id.into(),
            shards: vec![Node::new(node_id)],
            capacity_entries: 128,
            max_value_bytes: 1024 * 1024,
            eviction_policy: EvictionPolicy::Lru,
            virtual_nodes: 32,
            default_ttl: None,
            loader: None,
            writer: None,
        }
    }
    pub fn capacity_entries(mut self, v: usize) -> Self {
        self.capacity_entries = v;
        self
    }
    pub fn max_value_bytes(mut self, v: usize) -> Self {
        self.max_value_bytes = v;
        self
    }
    pub fn eviction_policy(mut self, v: EvictionPolicy) -> Self {
        self.eviction_policy = v;
        self
    }
    pub fn default_ttl(mut self, v: Duration) -> Self {
        self.default_ttl = Some(v);
        self
    }
    pub fn loader<F>(mut self, f: F) -> Self
    where
        F: Fn(&str) -> Result<String, CacheError> + Send + Sync + 'static,
    {
        self.loader = Some(Arc::new(f));
        self
    }
    pub fn writer<F>(mut self, f: F) -> Self
    where
        F: Fn(&str, &str) -> Result<(), CacheError> + Send + Sync + 'static,
    {
        self.writer = Some(Arc::new(f));
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CacheError {
    InvalidKey,
    ValueTooLarge,
    BackingStore,
    Invalidation,
}

#[derive(Clone)]
pub struct Cache {
    inner: Arc<CacheInner>,
}

struct CacheInner {
    state: Mutex<State>,
    cfg: Config,
    ring: HashRing,
    flights: Mutex<HashMap<String, Arc<Flight>>>,
}

struct State {
    entries: HashMap<String, Entry>,
    metrics: Metrics,
    shutdown: bool,
}

#[derive(Clone)]
struct Entry {
    key: String,
    namespace: Option<String>,
    value: String,
    created_at: Instant,
    accessed_at: Instant,
    expires_at: Option<Instant>,
    access_count: u64,
    version: u64,
}

#[derive(Clone, Default, Debug, Serialize)]
pub struct Metrics {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub expirations: u64,
    pub invalidations: u64,
    pub loader_calls: u64,
    pub singleflight_coalesces: u64,
    pub membership_changes: u64,
}

#[derive(Debug, Serialize)]
pub struct GetResult {
    pub key: String,
    pub value: Option<String>,
    pub hit: bool,
    pub loaded: bool,
    pub coalesced: bool,
    #[serde(rename = "ttlRemainingMs")]
    pub ttl_remaining_ms: u128,
    #[serde(rename = "shardId")]
    pub shard_id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
    pub version: u64,
}

#[derive(Debug, Serialize)]
pub struct SetResult {
    pub key: String,
    pub stored: bool,
    pub version: u64,
    pub evicted: Vec<String>,
    #[serde(rename = "shardId")]
    pub shard_id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
}
#[derive(Debug, Serialize)]
pub struct DeleteResult {
    pub key: String,
    pub deleted: bool,
    pub reason: Option<String>,
    #[serde(rename = "shardId")]
    pub shard_id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
}

pub enum Invalidation {
    Key(String),
    Namespace(String),
    Prefix(String),
}

struct Flight {
    result: Mutex<Option<Result<String, CacheError>>>,
    done: Condvar,
}

impl Cache {
    pub fn new(cfg: Config) -> Self {
        let ring = HashRing::new(cfg.shards.clone(), cfg.virtual_nodes);
        Self {
            inner: Arc::new(CacheInner {
                state: Mutex::new(State {
                    entries: HashMap::new(),
                    metrics: Metrics::default(),
                    shutdown: false,
                }),
                cfg,
                ring,
                flights: Mutex::new(HashMap::new()),
            }),
        }
    }

    pub fn set(
        &self,
        key: &str,
        value: &str,
        namespace: Option<&str>,
        ttl: Option<Duration>,
        write_through: bool,
    ) -> Result<SetResult, CacheError> {
        self.validate(key, value)?;
        if write_through {
            if let Some(writer) = &self.inner.cfg.writer {
                writer(key, value)?;
            }
        }
        let now = Instant::now();
        let expires_at = ttl.or(self.inner.cfg.default_ttl).map(|d| now + d);
        let mut state = self.inner.state.lock().unwrap();
        let version = state.entries.get(key).map_or(1, |e| e.version + 1);
        state.entries.insert(
            key.into(),
            Entry {
                key: key.into(),
                namespace: namespace.map(str::to_string),
                value: value.into(),
                created_at: now,
                accessed_at: now,
                expires_at,
                access_count: 1,
                version,
            },
        );
        let evicted = self.evict_locked(&mut state, key);
        let node = self.inner.ring.owner(key);
        println!("level=info msg=cache_set key={key} node={}", node.id);
        Ok(SetResult {
            key: key.into(),
            stored: true,
            version,
            evicted,
            shard_id: node.id.clone(),
            node_id: node.id,
        })
    }

    pub fn get(&self, key: &str, load_on_miss: bool) -> Result<GetResult, CacheError> {
        if key.is_empty() || key.len() > 512 {
            return Err(CacheError::InvalidKey);
        }
        if let Some(result) = self.get_local(key) {
            return Ok(result);
        }
        if !load_on_miss {
            return Ok(GetResult::miss(key));
        }
        self.load_singleflight(key)
    }

    fn get_local(&self, key: &str) -> Option<GetResult> {
        let mut state = self.inner.state.lock().unwrap();
        let now = Instant::now();
        let expired = state
            .entries
            .get(key)
            .and_then(|e| e.expires_at)
            .is_some_and(|t| now >= t);
        if expired {
            state.entries.remove(key);
            state.metrics.expirations += 1;
            state.metrics.misses += 1;
            return None;
        }
        let entry = state.entries.get_mut(key)?;
        entry.accessed_at = now;
        entry.access_count += 1;
        let ttl_remaining_ms = entry
            .expires_at
            .map_or(0, |t| t.saturating_duration_since(now).as_millis());
        let value = entry.value.clone();
        let version = entry.version;
        state.metrics.hits += 1;
        let node = self.inner.ring.owner(key);
        Some(GetResult {
            key: key.into(),
            value: Some(value),
            hit: true,
            loaded: false,
            coalesced: false,
            ttl_remaining_ms,
            shard_id: node.id.clone(),
            node_id: node.id,
            version,
        })
    }

    fn load_singleflight(&self, key: &str) -> Result<GetResult, CacheError> {
        let (flight, coalesced) = {
            let mut flights = self.inner.flights.lock().unwrap();
            if let Some(existing) = flights.get(key) {
                self.inner
                    .state
                    .lock()
                    .unwrap()
                    .metrics
                    .singleflight_coalesces += 1;
                (existing.clone(), true)
            } else {
                let flight = Arc::new(Flight {
                    result: Mutex::new(None),
                    done: Condvar::new(),
                });
                flights.insert(key.into(), flight.clone());
                self.inner.state.lock().unwrap().metrics.loader_calls += 1;
                (flight, false)
            }
        };
        if coalesced {
            let mut guard = flight.result.lock().unwrap();
            while guard.is_none() {
                guard = flight.done.wait(guard).unwrap();
            }
            return self.loaded_result(key, guard.clone().unwrap(), true);
        }
        let loaded = self
            .inner
            .cfg
            .loader
            .as_ref()
            .ok_or(CacheError::BackingStore)?(key);
        if let Ok(value) = &loaded {
            self.set(key, value, None, self.inner.cfg.default_ttl, false)?;
        }
        *flight.result.lock().unwrap() = Some(loaded.clone());
        flight.done.notify_all();
        self.inner.flights.lock().unwrap().remove(key);
        self.loaded_result(key, loaded, false)
    }

    fn loaded_result(
        &self,
        key: &str,
        loaded: Result<String, CacheError>,
        coalesced: bool,
    ) -> Result<GetResult, CacheError> {
        let value = loaded?;
        let node = self.inner.ring.owner(key);
        Ok(GetResult {
            key: key.into(),
            value: Some(value),
            hit: false,
            loaded: true,
            coalesced,
            ttl_remaining_ms: self.inner.cfg.default_ttl.map_or(0, |d| d.as_millis()),
            shard_id: node.id.clone(),
            node_id: node.id,
            version: 1,
        })
    }

    pub fn delete(&self, key: &str) -> Result<DeleteResult, CacheError> {
        if key.is_empty() {
            return Err(CacheError::InvalidKey);
        }
        let mut state = self.inner.state.lock().unwrap();
        let deleted = state.entries.remove(key).is_some();
        if deleted {
            state.metrics.invalidations += 1;
        }
        let node = self.inner.ring.owner(key);
        Ok(DeleteResult {
            key: key.into(),
            deleted,
            reason: (!deleted).then(|| "not_found".into()),
            shard_id: node.id.clone(),
            node_id: node.id,
        })
    }

    pub fn invalidate(&self, scope: Invalidation) -> Result<usize, CacheError> {
        let mut state = self.inner.state.lock().unwrap();
        let keys: Vec<_> = state
            .entries
            .iter()
            .filter_map(|(key, e)| match &scope {
                Invalidation::Key(wanted) if key == wanted => Some(key.clone()),
                Invalidation::Namespace(ns) if e.namespace.as_ref() == Some(ns) => {
                    Some(key.clone())
                }
                Invalidation::Prefix(prefix) if key.starts_with(prefix) => Some(key.clone()),
                _ => None,
            })
            .collect();
        for key in &keys {
            state.entries.remove(key);
        }
        state.metrics.invalidations += keys.len() as u64;
        Ok(keys.len())
    }

    pub fn metrics(&self) -> Metrics {
        self.inner.state.lock().unwrap().metrics.clone()
    }
    pub fn shutdown(&self) {
        self.inner.state.lock().unwrap().shutdown = true;
        println!("level=info msg=shutdown");
    }
    pub fn is_shutdown(&self) -> bool {
        self.inner.state.lock().unwrap().shutdown
    }

    fn validate(&self, key: &str, value: &str) -> Result<(), CacheError> {
        if key.is_empty() || key.len() > 512 {
            return Err(CacheError::InvalidKey);
        }
        if value.len() > self.inner.cfg.max_value_bytes {
            return Err(CacheError::ValueTooLarge);
        }
        Ok(())
    }

    fn evict_locked(&self, state: &mut State, protected: &str) -> Vec<String> {
        let mut evicted = vec![];
        while state.entries.len() > self.inner.cfg.capacity_entries {
            let victim = state
                .entries
                .iter()
                .filter(|(k, _)| k.as_str() != protected)
                .min_by(|a, b| compare_for_eviction(self.inner.cfg.eviction_policy, a.1, b.1))
                .map(|(k, _)| k.clone());
            if let Some(key) = victim {
                state.entries.remove(&key);
                state.metrics.evictions += 1;
                evicted.push(key);
            } else {
                break;
            }
        }
        evicted
    }
}

impl GetResult {
    fn miss(key: &str) -> Self {
        Self {
            key: key.into(),
            value: None,
            hit: false,
            loaded: false,
            coalesced: false,
            ttl_remaining_ms: 0,
            shard_id: String::new(),
            node_id: String::new(),
            version: 0,
        }
    }
}

fn compare_for_eviction(policy: EvictionPolicy, a: &Entry, b: &Entry) -> std::cmp::Ordering {
    match policy {
        EvictionPolicy::Lfu => a
            .access_count
            .cmp(&b.access_count)
            .then(a.accessed_at.cmp(&b.accessed_at))
            .then(a.key.cmp(&b.key)),
        EvictionPolicy::Lru => a
            .accessed_at
            .cmp(&b.accessed_at)
            .then(a.created_at.cmp(&b.created_at))
            .then(a.key.cmp(&b.key)),
    }
}

#[derive(Clone)]
pub struct HashRing {
    inner: Arc<RwLock<HashRingState>>,
}
struct HashRingState {
    replicas: usize,
    tokens: BTreeMap<u64, Node>,
    ring_version: u64,
}

impl HashRing {
    pub fn new(nodes: Vec<Node>, replicas: usize) -> Self {
        let ring = Self {
            inner: Arc::new(RwLock::new(HashRingState {
                replicas,
                tokens: BTreeMap::new(),
                ring_version: 0,
            })),
        };
        for node in nodes {
            ring.add(node);
        }
        ring
    }
    pub fn add(&self, node: Node) {
        let mut state = self.inner.write().unwrap();
        for i in 0..state.replicas {
            state
                .tokens
                .insert(hash64(&format!("{}-{i}", node.id)), node.clone());
        }
        state.ring_version += 1;
    }
    pub fn owner(&self, key: &str) -> Node {
        let state = self.inner.read().unwrap();
        let token = hash64(key);
        state
            .tokens
            .range(token..)
            .next()
            .or_else(|| state.tokens.iter().next())
            .map(|(_, n)| n.clone())
            .unwrap_or_else(|| Node::new("unavailable"))
    }
    pub fn tokens_for(&self, node_id: &str) -> Vec<u64> {
        self.inner
            .read()
            .unwrap()
            .tokens
            .iter()
            .filter_map(|(t, n)| (n.id == node_id).then_some(*t))
            .collect()
    }
    pub fn version(&self) -> u64 {
        self.inner.read().unwrap().ring_version
    }
}

fn hash64(value: &str) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    value.hash(&mut hasher);
    hasher.finish()
}

#[derive(Clone)]
pub struct MemoryStore {
    inner: Arc<Mutex<StoreState>>,
}
struct StoreState {
    data: HashMap<String, String>,
    fail_writes: bool,
}
impl MemoryStore {
    pub fn new(data: HashMap<String, String>) -> Self {
        Self {
            inner: Arc::new(Mutex::new(StoreState {
                data,
                fail_writes: false,
            })),
        }
    }
    pub fn load(&self, key: &str) -> Result<String, CacheError> {
        self.inner
            .lock()
            .unwrap()
            .data
            .get(key)
            .cloned()
            .ok_or(CacheError::BackingStore)
    }
    pub fn write(&self, key: &str, value: &str) -> Result<(), CacheError> {
        let mut state = self.inner.lock().unwrap();
        if state.fail_writes {
            return Err(CacheError::BackingStore);
        }
        state.data.insert(key.into(), value.into());
        Ok(())
    }
    pub fn fail_writes(&self, value: bool) {
        self.inner.lock().unwrap().fail_writes = value;
    }
}

#[derive(Clone)]
pub struct HttpApp {
    cache: Cache,
}
#[derive(Debug)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
}

impl HttpApp {
    pub fn new(cache: Cache) -> Self {
        Self { cache }
    }
    pub fn handle(&self, method: &str, path: &str, body: &str) -> HttpResponse {
        if path == "/health" {
            return response(200, serde_json::json!({"status":"ok"}));
        }
        if path == "/metrics" {
            return response(200, self.cache.metrics());
        }
        if path == "/cluster/ring" {
            return response(
                200,
                serde_json::json!({"ringVersion": self.cache.inner.ring.version(), "virtualNodes": self.cache.inner.cfg.virtual_nodes, "nodes": self.cache.inner.cfg.shards}),
            );
        }
        if path == "/cache/invalidate" && method == "POST" {
            let parsed: serde_json::Value = serde_json::from_str(body).unwrap_or_default();
            let scope = parsed
                .get("key")
                .and_then(|v| v.as_str())
                .map(|v| Invalidation::Key(v.into()))
                .or_else(|| {
                    parsed
                        .get("namespace")
                        .and_then(|v| v.as_str())
                        .map(|v| Invalidation::Namespace(v.into()))
                })
                .or_else(|| {
                    parsed
                        .get("prefix")
                        .and_then(|v| v.as_str())
                        .map(|v| Invalidation::Prefix(v.into()))
                });
            return match scope {
                Some(scope) => response(
                    202,
                    serde_json::json!({"accepted": true, "matchedApprox": self.cache.invalidate(scope).unwrap_or(0)}),
                ),
                None => response(400, serde_json::json!({"code":"INVALIDATION"})),
            };
        }
        if let Some(key) = path.strip_prefix("/cache/") {
            return match method {
                "GET" => match self.cache.get(key, path.contains("loadOnMiss=true")) {
                    Ok(r) if r.hit || r.loaded => response(200, r),
                    Ok(r) => response(404, r),
                    Err(_) => response(400, serde_json::json!({"code":"ERROR"})),
                },
                "PUT" => {
                    #[derive(Deserialize)]
                    struct PutBody {
                        value: String,
                        #[serde(rename = "ttlMs")]
                        ttl_ms: Option<u64>,
                        namespace: Option<String>,
                        #[serde(rename = "writeThrough")]
                        write_through: Option<bool>,
                    }
                    let parsed: Result<PutBody, _> = serde_json::from_str(body);
                    match parsed.and_then(|p| {
                        serde_json::to_value((p.value, p.ttl_ms, p.namespace, p.write_through))
                    }) {
                        Ok(v) => {
                            let arr = v.as_array().unwrap();
                            let value = arr[0].as_str().unwrap();
                            let ttl = arr[1].as_u64().map(Duration::from_millis);
                            let ns = arr[2].as_str();
                            let wt = arr[3].as_bool().unwrap_or(false);
                            match self.cache.set(key, value, ns, ttl, wt) {
                                Ok(r) => response(if r.version == 1 { 201 } else { 200 }, r),
                                Err(CacheError::ValueTooLarge) => {
                                    response(413, serde_json::json!({"code":"VALUE_TOO_LARGE"}))
                                }
                                Err(_) => response(400, serde_json::json!({"code":"ERROR"})),
                            }
                        }
                        Err(_) => response(400, serde_json::json!({"code":"BAD_JSON"})),
                    }
                }
                "DELETE" => match self.cache.delete(key) {
                    Ok(r) => response(200, r),
                    Err(_) => response(400, serde_json::json!({"code":"ERROR"})),
                },
                _ => HttpResponse {
                    status: 405,
                    body: String::new(),
                },
            };
        }
        HttpResponse {
            status: 404,
            body: String::new(),
        }
    }
}

fn response<T: Serialize>(status: u16, value: T) -> HttpResponse {
    HttpResponse {
        status,
        body: serde_json::to_string(&value).unwrap(),
    }
}
