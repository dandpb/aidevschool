/** Canonical evidence identity per voxelDojo game package. */
export const GAME_EVIDENCE_META = {
  "game-02-warehouse": {
    project: "02_key_value_store",
    game: "KV WAREHOUSE",
    scenarioSlug: "kv-warehouse",
    curriculum: { concept: "hash-map-backed CRUD with TTL expiration", mechanic: "warehouse shelves + decaying crates" },
  },
  "game-03-wormhole": {
    project: "03_url_shortener",
    game: "WORMHOLE",
    scenarioSlug: "wormhole",
    curriculum: { concept: "short-code generation + collision handling", mechanic: "wormhole code-gates between planets" },
  },
  "game-05-relay-station": {
    project: "05_websocket_chat",
    game: "RELAY STATION",
    scenarioSlug: "relay-station",
    curriculum: { concept: "persistent conns + fan-out + heartbeat", mechanic: "orbiting relay stations, laser links" },
  },
  "game-06-pipeline-plant": {
    project: "06_file_upload_pipeline",
    game: "PIPELINE PLANT",
    scenarioSlug: "pipeline-plant",
    curriculum: { concept: "streaming vs buffering + bounded memory", mechanic: "fluid tank + pipe + chunked slugs" },
  },
  "game-07-checkpoint-city": {
    project: "07_rest_api_auth",
    game: "CHECKPOINT CITY",
    scenarioSlug: "checkpoint-city",
    curriculum: { concept: "middleware layers + JWT verification", mechanic: "concentric city walls, badge gates" },
  },
  "game-08-timeline-tower": {
    project: "08_event_driven_order_system",
    game: "TIMELINE TOWER",
    scenarioSlug: "timeline-tower",
    curriculum: { concept: "append-only log + projection replay", mechanic: "tower of stacked event floors" },
  },
  "game-09-docking-bay": {
    project: "09_plugin_system",
    game: "DOCKING BAY",
    scenarioSlug: "docking-bay",
    curriculum: { concept: "sandboxing + interface contracts", mechanic: "docking pods, force-field sandbox" },
  },
  "game-10-hash-ring": {
    project: "10_distributed_cache",
    game: "HASH RING",
    scenarioSlug: "hash-ring",
    curriculum: { concept: "consistent hashing", mechanic: "orbital hash ring" },
  },
  "game-11-air-traffic": {
    project: "11_load_balancer",
    game: "AIR TRAFFIC",
    scenarioSlug: "air-traffic",
    curriculum: { concept: "load-balancer routing + health checks", mechanic: "air traffic to landing pads" },
  },
  "game-12-mission-control": {
    project: "12_distributed_job_scheduler",
    game: "MISSION CONTROL",
    scenarioSlug: "mission-control",
    curriculum: { concept: "leader election + DAG scheduling", mechanic: "station constellation + job DAG" },
  },
  "game-13-breaker-grid": {
    project: "13_api_gateway_circuit_breaker",
    game: "BREAKER GRID",
    scenarioSlug: "breaker-grid",
    curriculum: { concept: "circuit breaker + bulkhead", mechanic: "3D power grid of tripping breakers" },
  },
  "game-14-river-delta": {
    project: "14_log_aggregator",
    game: "RIVER DELTA",
    scenarioSlug: "river-delta",
    curriculum: { concept: "log pipelines + correlation IDs", mechanic: "converging log tributaries, dye trace" },
  },
  "game-15-observatory": {
    project: "15_metrics_collector",
    game: "OBSERVATORY",
    scenarioSlug: "observatory",
    curriculum: { concept: "histograms + percentiles + alerting", mechanic: "histogram terrain + alert plane" },
  },
  "game-16-freight-yard": {
    project: "16_mini_message_queue",
    game: "FREIGHT YARD",
    scenarioSlug: "freight-yard",
    curriculum: { concept: "partitioned log + consumer-group offsets", mechanic: "freight yard of track lanes" },
  },
  "game-17-lighthouse-network": {
    project: "17_distributed_config_service",
    game: "LIGHTHOUSE NETWORK",
    scenarioSlug: "lighthouse-network",
    curriculum: { concept: "consensus quorum + watch/notify", mechanic: "lighthouse quorum re-aiming beams" },
  },
  "game-18-stacks": {
    project: "18_search_engine",
    game: "STACKS",
    scenarioSlug: "stacks",
    curriculum: { concept: "inverted index + ranking", mechanic: "3D library, word-card catalog" },
  },
} as const

export type VoxelGameId = keyof typeof GAME_EVIDENCE_META

