# Decision — 14_log_aggregator

- **Slug**: `14_log_aggregator`
- **Shape**: **B** — fresh standalone 3D app at `engines/voxelDojo/game-14-river-delta/` (port 5214)
- **Concept (catalog)**: Structured logging (JSON), log levels, aggregation pipelines, compression, indexing, retention, distributed tracing (OpenTelemetry), correlation IDs
- **Key question (catalog)**: How does ingestion throughput compare for JSON vs protobuf log formats?
- **Done-rule (one line)**: A 3D river-delta world demonstrates a high-throughput structured-log pipeline — bursts batched past a bounded weir with zero backpressure, every accepted log indexed and queryable inside the freshness budget, retention held long enough to query, cold segments compressed ≥ 3:1, and at least one cross-service trace rebuilt from its correlation dye in timestamp + span-parent order — measurable on a deterministic seed.

## Rationale (≤ 6 lines)

1. Log aggregation's primary mechanic is **a multi-stage pipeline (ingest → bounded buffer → indexer → hot/warm/cold segment store → retention/compression) plus cross-service trace reconstruction via correlation IDs** — geometry pixel-quest's encounter shell cannot express (its kinds are all variants of "incoming sprite → admit/reject", with no notion of pipeline stages, indexed bins, hot/cold tiers, or trace assembly across multiple source tributaries).
2. SKILL.md's canonical Shape B examples ("KV-with-TTL as floating blocks that decay", "consistent hashing as a ring") point exactly at this kind of concept-as-geometry mapping; logs-as-droplets in a tiered delta with a dye-trace is the faithful analogue.
3. The defining visuals — N upstream service tributaries converging into a reservoir, droplet color = level, dye streak = correlation_id, a slotted weir = bounded buffer, indexed sort channels, cold-zone ice blocks squashing 3:1, and a Trace Tower stacked from correlation-matched droplets across services — need a real 3D scene graph with depth, volumetric tiering, and a dye path that traverses all stages; flat arcade lanes cannot show tiering or cross-service span trees.
4. The 3D depth axis earns its keep: tributaries flow on Z into the reservoir, indexer channels array on X/Y, hot/warm/cold zones layer volumetrically, and the dye-trace follows one request's path through all of them — none of this reads in pixel-quest's flat overworld.
5. Distinct from `01_rate_limiter`, `02_key_value_store`, `05_websocket_chat`, `06_file_upload_pipeline`, `08_event_driven_order_system`, `09_plugin_system`, and `16_mini_message_queue` (all Shape B) — no encounter kind reuses `voxeldojo-river-delta`.
6. Catalog's primary learning objective ("high-throughput structured log ingestion with queryable indexes and bounded retention") is **only** legible when the player physically paces ingestion to avoid backpressure, watches indexing lag, queries by structured field, and reconstructs a trace from correlation dye across services — a fresh world is mandatory, not optional.
