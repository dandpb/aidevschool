# Decision — 10_distributed_cache

**shape: B**

## Rationale

1. The primary concept (per `lesson.md`) is **consistent hashing** — keys map to the next node clockwise on a hash ring, and the killer property is minimal key remapping on node add/remove. None of pixel-quest's four encounter kinds (token_bucket / sequence_flow / route_health / policy_gate, all "incoming sprite → admit/reject") represents a membership ring with clockwise ownership and remap-under-churn — they have no ring topology and no membership-change dimension.
2. The concept's mental model is **topological and dynamic**: a circular key space, nodes sitting at hash positions, keys flying clockwise to their owner, and arcs splitting/merging when nodes join/leave. That is exactly what a fresh three.js world embodies and what a 2D lane shell cannot — it needs a real 3D ring and a real "next clockwise" traversal.
3. Teaching the strategy contrast (consistent hashing vs naive `hash % N`) requires two parallel key→node rules the player switches between, with visually different remap storms on churn — too much state for a pixel-quest reskin; needs its own 3D world with a ring, shard towers, and a reticle.
4. The catalog's key question ("How do eviction policies and sharding strategies interact under skewed access patterns?") is answered by the **sharding-strategy** half: a hot key piling onto one node, balanced by adding a node just clockwise to split the arc — only playable in a ring world.
5. Bounded scope: one ring, ≤5 inputs, one routing verb + node add/remove + strategy toggle, one churn-recovery loop; no backend needed (in-process deterministic hash + membership).
6. Distinct from sibling Shape B apps: `02_key_value_store` (Warehouse) owns single-node `hash % N` shelves + TTL decay — this game owns the **distributed** facet (many shard nodes on a membership ring, next-clockwise assignment, surviving node churn with minimal remap); TTL is out of scope. Evidence `metrics.kind: "threejs-ring-keeper"` is unique.
