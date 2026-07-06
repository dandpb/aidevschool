# Decision — 18_search_engine

**shape: B** (sibling 3D app under `engines/voxelDojo/games/18_search_engine/`, port 5218)

**Rationale**

1. The primary concept is **building an inverted index then evaluating a parsed boolean query to top-k BM25** — three spatial data structures in one flow: per-term postings pillars (height = `df`, halo = `idf`, card glow = `tf`), a query laser that threads AND/OR/NOT through those pillars as live set operations, and per-candidate BM25 relevance beams whose height encodes `idf · tf-saturation · length-norm` all at once. None of pixel-quest's `sequence_flow / policy_gate / route_health / token_bucket` encounters can express per-term pillar geometry, intersect/union/exclusion threading, or ranked top-k rising order — they are all "incoming sprite → admit/reject".
2. The catalog's key question is literally **"How do inverted index build times and query latencies compare for different corpus sizes?"** — the done-rule forces the player to feel BOTH timings as separate in-world clocks (the index build phase vs the live query-latency budget) and read them off the HUD side by side.
3. 3D is load-bearing: a card-catalog atrium of term-pillars (postings geometry), a tokenizer arch separating raw text from normalized terms (FR-002/003), a precedence rail where query operators snap into NOT>AND>OR order (FR-009), and a floor save-crystal that materializes the index so it can outlive the tomes (FR-016, NFR-006 corruption beat). ROUTING_MANIFEST.md lists `3D library, word-card catalog` as this module's hero.
