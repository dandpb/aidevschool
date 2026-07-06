# Decision — `/threejs-dojo 02_key_value_store`

- **Slug:** `02_key_value_store`
- **Shape:** **B** (fresh standalone 3D world)
- **Mode:** Training Mode ON
- **Path chosen:** B — sibling 3D app; concept gets its own world.

## Rationale (≤ 6 lines)

1. K/V CRUD with TTL needs **persistent hash-addressed buckets + a decay clock running in
   parallel with new writes** — pixel-quest's four encounter kinds (sequence_flow / policy_gate /
   route_health / token_bucket) all model "incoming sprite → admit/reject" and have no spatial
   bucket, no collision chain, and no per-key TTL ring; the concept cannot fit that shell.
2. The 3D mechanic is a **KV Warehouse**: a circular ring of `N` numbered hash-bucket shelves
   around the floor; a conveyor spawns key-crates; the player-forklift routes each crate to shelf
   `hash(key) % N` to PUT, flies back to the hashed shelf to GET (or to MISS an expired slot),
   watches TTL glow rings drain, and chains collisions when two keys hash to the same shelf.
3. Collision chains + lazy TTL sweep + concurrent in-flight crates each need 3D space **and** a
   visible clock; flattening them to 2D would erase exactly the invariants the spec encodes
   (RF-002, RF-005, RF-011, RNF-003).
4. SKILL.md names `KV-with-TTL as floating blocks that decay over time` and the
   `ROUTING_MANIFEST.md` row for this slug both prescribe Shape B; this run conforms.
5. The arena is bounded (one ring, ≤ 16 buckets, ≤ ~10 crates/wave), so Shape B's cost is finite
   and a single Vite + three + Vitest + Playwright app delivers it.
6. Distinct from `01_rate_limiter` (Shape A in pixel-quest), `10_distributed_cache` (hash-ring
   pilot, different concept: consistent hashing + rebalancing), and `16_mini_message_queue`
   (Shape B, append-only log + consumer groups) — no overlap.
