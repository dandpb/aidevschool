# Decision — 06_file_upload_pipeline

- **Slug**: `06_file_upload_pipeline`
- **Shape**: **B** — full sibling 3D app at `engines/pixelDojo/games/06_file_upload_pipeline/`
- **Concept (catalog)**: Streaming I/O, chunked processing, multipart upload, memory management, bounded memory
- **Key question (catalog)**: How do streaming vs buffering approaches compare for large file handling?
- **Rationale (≤ 6 lines)**:
  1. Bounded-memory streaming needs a chunk-cannon + fixed-capacity memory hopper + 3 parallel pipeline lanes (validator / SHA-256 hasher / storage) — geometry pixel-quest's token-meter / sequence / route / policy shells cannot express (all are "incoming entity → admit/reject" lanes).
  2. The "buffer-whole-file" anti-pattern and backpressure stall signals need their own 3D world to make failure visible (memory-overflow alarm, lane stall lights, hasher-crystal fingerprint build).
  3. Distinct from `01_rate_limiter` (Shape A in pixel-quest) and the other sibling Shape B apps already planned (`02_key_value_store`, `16_mini_message_queue`); no overlap with KV-decay / log-partition geometry.
  4. SKILL.md's canonical "floating blocks that decay / ring of nodes" family — bounded buffer draining into a parallel pipeline is the same species of 3D concept embodiment.
  5. Multi-agent build fit: Vite/three.js scaffold + scene/camera + content/packValidator + evidence schema + Playwright smoke parallelize cleanly across 4 workers.
- **Done-rule (catalog, one line)**: The Byte Stream Reactor sibling app emits a valid `EVIDENCE {...}` with `pass: true` for project `06_file_upload_pipeline`, proving the learner streamed every file through the bounded buffer (peak < capacity, 0 overflows, no whole-file buffering, hasher match, no invalid-MIME / size-cap leaks) end-to-end under Playwright.
