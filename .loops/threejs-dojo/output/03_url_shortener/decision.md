# Decision — 03_url_shortener

**shape: B**

## Rationale

1. The primary concept (per `lesson.md`) is **unique short-code generation with base62/hash-based encodings and explicit collision handling** — its mechanic is encode + detect-collision + retry, which has no analogue in pixel-quest's four encounter kinds (token_bucket / sequence_flow / route_health / policy_gate are all "incoming entity → admit/reject", none represents a code space with collisions).
2. The concept's mental model is **spatial**: a base62 code space of docks, long-URL crates, and the bounce of a physical collision — exactly what a fresh three.js arena embodies and what a 2D lane shell cannot.
3. Teaching the strategy trade-off (auto-increment vs hash-truncation vs snowflake) requires three parallel code-generation paths the player switches between — too much state for a pixel-quest reskin; needs its own 3D world with a hash cannon + dock sphere.
4. SKILL.md lists `url-shortener as a launcher mapping slugs to targets` as the canonical Shape B example; this run adopts that exact framing as `Slug Launcher`.
5. Bounded scope: one arena, one cannon, ≤ 4 inputs, 3 strategies, one collision-retry loop — the spec's RF-011 retry budget (≥5 attempts) maps cleanly to the retry counter; no backend needed (in-process deterministic seed).
6. Distinct from sibling Shape B apps: `02_key_value_store` (K/V buckets + TTL) and `16_mini_message_queue` (log partitions + offsets) — no overlap in scene geometry or evidence `metrics.kind`.
