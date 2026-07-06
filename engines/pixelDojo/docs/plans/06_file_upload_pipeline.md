# PLAN slice — `06_file_upload_pipeline` (Byte Stream Reactor: Bounded-Memory Streaming)

> PLAN slice for `/threejs-dojo 06_file_upload_pipeline`. The slug's catalog concept is
> "Streaming I/O, chunked processing, multipart upload, memory management, parallel processing,
> bounded memory" — the ONE concept this lab teaches is **streaming I/O with bounded memory**
> (chunked processing of a large file through a fixed-capacity buffer). The catalog's key question
> — "How do streaming vs buffering approaches compare for large file handling?" — is exactly the
> contrast the playable surface must embody.
>
> **Shape B (accepted)**: this slice is the canonical plan for a fresh standalone 3D sibling app
> under `engines/pixelDojo/games/06_file_upload_pipeline/`. It does NOT reuse any pixel-quest
> encounter kind (`sequence_flow` / `policy_gate` / `route_health` / `token_bucket`) — those are
> all "incoming entity → admit/reject" lanes and cannot represent a chunked stream flowing through
> a bounded buffer into a parallel pipeline. The 3D scene is built straight from this plan.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/06_file_upload_pipeline/`
- **One concept this game teaches:** **streaming I/O with bounded memory** — process a large file
  as a sequence of fixed-size chunks flowing through a small fixed-capacity buffer, never by
  loading the whole file. Pipeline stages (validate → hash → store) consume chunks as they pass;
  backpressure must be respected.
- **Slug:** `06_file_upload_pipeline`
- **Region id:** `game-06_file_upload_pipeline`
- **Unit id:** `06_file_upload_pipeline`
- **Sibling app path:** `engines/pixelDojo/games/06_file_upload_pipeline/`
- **Out of scope:** multipart parsing internals, Go/Rust/Node comparison, persistence/restart
  semantics, thumbnail generation, metadata extraction. The ONE concept is the
  streaming-with-bounded-memory pattern.

## 2. Player goal

You run a 3D **chunk-cannon** at the input dock of a streaming pipeline. Carve giant file blocks
into chunks, push them through the small memory buffer, and let the validator + hasher + storage
lanes process them — **never overflow the buffer, never try to swallow a whole file at once**.

## 3. Concept → mechanic mapping

| Concept element | Arcade mechanic | What "playing it right" proves |
| --- | --- | --- |
| Streaming I/O (chunked processing) — RF-003 | Player aims the chunk-cannon at the incoming file block and presses **SPACE** to slice off one fixed-size chunk and launch it into the memory buffer | Player decomposes a large transfer into incremental chunks rather than treating it as one payload |
| Bounded memory (RNF-002: <50 MB per upload) | Memory buffer = a 3D hopper with a hard capacity (e.g. 4 chunks); overflow → red alarm + fail. A live "memory peak" meter is the HUD hero element | Player paces pushes to the buffer's drain rate |
| Pipeline stages (validate → hash → store) | Buffer drains into 3 parallel lanes: **validator gate** (rejects wrong-MIME chunks), **SHA-256 hasher crystal** (hex fingerprint fills incrementally), **storage vault** (chunks re-stack as a miniature file) | Player sees chunks feed multiple downstream consumers without re-buffering |
| Backpressure (RNF-006) | When a downstream lane stalls (e.g. validator choking on a bad chunk), a red light flashes and buffer draining pauses; pushing more chunks overflows | Player reads the stall signal and throttles |
| "Buffer the whole file" anti-pattern | A tempting red **X** button grabs the next file whole into memory → instant overflow, guaranteed fail | Player learns why whole-file buffering violates the bounded-memory contract |
| Incremental SHA-256 (RF-005 / RF-006) | Hasher crystal accumulates chunk fingerprints into a hex string; final hash must match the target on the HUD | Player links streaming chunks to a verifiable end-to-end checksum |
| Cancellation (RF-010) | Press **C** to cancel: sweeps in-flight chunks away, clears the buffer, no storage write | Player exercises the cancellation path |
| 1 GiB max size, enforced incrementally (RNF-001) | A "1 GiB monolith" wave eventually arrives; once the size meter crosses the cap, the player must reject the next chunk with **V** (size-exceeded lane) instead of pushing it | Player enforces the size limit as bytes arrive, not after reading the whole request |

## 4. Main loop

1. A file block (variable size, always larger than the memory bound) spawns at the input dock and
   begins creeping toward the "swallow whole" trap zone.
2. Player aims the chunk-cannon (mouse or `←`/`→`) and presses **SPACE** to slice + launch one
   chunk into the memory buffer.
3. Buffer auto-drains chunks into the pipeline lanes (validator → hasher + storage); each chunk
   that completes a lap increments the hasher fingerprint and the storage progress.
4. Player keeps slicing until the file block is consumed; a new block spawns.
5. Wave ends after N files (e.g. 5) processed. The run **passes** only if the buffer never
   overflowed, the hasher matched, no bad-MIME chunk leaked past the validator, and no chunk
   crossed the 1 GiB cap unchecked.
6. Cycle length ≈ 20–30 s per file block.

## 5. Inputs & controls

- **Mouse / `←` `→`** — aim chunk-cannon along the input conveyor.
- **SPACE** — slice + push the next chunk through the memory buffer (1 chunk per press; hold to
  repeat at a fire-rate cap).
- **V** — reject chunk as size-exceeded (when the size meter shows the file has crossed the 1 GiB
  cap).
- **C** — cancel active upload (sweep in-flight chunks; clear buffer).
- **X** — TRAP button: "swallow whole file" (taught once, fails the run if used).
- ≤ 4 distinct actions, NES-pad + mouse friendly.

## 6. Win / fail states

- **Win a wave** when ALL of:
  - All file blocks fully chunked and stored.
  - Memory meter stayed below the red line (peak < capacity) for the whole wave.
  - Hasher crystal's final fingerprint matches the target SHA-256 on the HUD.
  - No bad-MIME chunk leaked past the validator (no `invalid_file_type`).
  - No file exceeded the 1 GiB cap (or any chunk past the cap was rejected with **V**).
- **Fail** when ANY of:
  - Memory buffer overflows (peak ≥ capacity) — most common failure, direct readout of unbounded
    push.
  - Player presses **X** (whole-file buffer trap) — instant overflow.
  - A bad-MIME chunk reaches storage — `invalid_file_type` leak.
  - Hasher mismatch at wave end — chunks were dropped or altered.
  - A chunk past the 1 GiB cap reaches storage without being rejected.

Both win and fail are **direct readouts of streaming-with-bounded-memory discipline**.

## 11. Learning-gate hooks

- **Active unit:** `06_file_upload_pipeline` (project `06_file_upload_pipeline`). The sibling app
  publishes evidence to an append-only `window.__byteStreamEvidence` channel that the Playwright
  smoke run captures and persists to
  `engines/pixelDojo/games/06_file_upload_pipeline/.logs/evidence.ndjson` — one JSON object per
  line, one line per completed wave attempt, regenerated on every smoke run (generated artifact,
  not committed).
- **Evidence contract:** new metrics kind `threejs-byte-stream` (sibling-app local type — added
  to the app's own `src/evidence/types.ts`, NOT to `pixel-quest/src/game/evidence/types.ts`).
  Discriminated by `metrics.kind`, validated at emission time; malformed records never written.
- **Evidence record fields:**
  ```json
  {
    "source": "threejs-dojo",
    "unit_id": "06_file_upload_pipeline",
    "project": "06_file_upload_pipeline",
    "encounter_id": "byte-stream-reactor-wave-1",
    "game": "Byte Stream Reactor",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "threejs-byte-stream",
      "files_completed": 5,
      "files_target": 5,
      "bytes_streamed": 5242880000,
      "buffer_capacity_chunks": 4,
      "buffer_peak_chunks": 3,
      "buffer_overflows": 0,
      "whole_file_trap_used": false,
      "invalid_chunks_leaked": 0,
      "size_cap_violations": 0,
      "hasher_match": true,
      "cancellations": 0,
      "throughput_mbps": 61.2
    },
    "curriculum_context": {
      "concept": "Streaming I/O with bounded memory for large file handling",
      "mechanic": "Byte Stream Reactor (chunk-cannon + bounded buffer + pipeline lanes)",
      "accepted_signal": "chunked streaming kept buffer peak < capacity, hasher matched",
      "rejected_trap": "whole-file buffering (X) overflows memory"
    },
    "review_context": {
      "scheduled_review": true,
      "streak_candidate": true,
      "scheduler_source": "learner-substrate",
      "verifier_required": true
    }
  }
  ```
- **Pass rule (gate):** `evidence.pass === true` AND
  `metrics.files_completed === metrics.files_target` AND
  `metrics.buffer_overflows === 0` AND
  `metrics.whole_file_trap_used === false` AND
  `metrics.invalid_chunks_leaked === 0` AND
  `metrics.size_cap_violations === 0` AND
  `metrics.hasher_match === true`. Anything else keeps the gate locked.
- **Side-effect contract:** the sibling app emits evidence only; it MUST NOT write to
  `learner/learning_state.yaml` or set `localStorage["learning_state" | "units_log" | "mastered"]`.
  The verifier (`engines/pixelDojo/verifier`, run from the ecosystem root) reads the NDJSON and
  decides the gate — producer ≠ verifier invariant.
- **Verifier handoff:** the fresh-context verifier subagent receives (this plan, the smoke spec,
  the `EVIDENCE` console record, the screenshot) and judges against the done-rule:
  **"the Byte Stream Reactor sibling app emits a valid `EVIDENCE {...}` with `pass: true` for
  project `06_file_upload_pipeline`, with all files chunked through the bounded buffer (peak <
  capacity, 0 overflows), no whole-file buffering, hasher match, and no invalid-MIME / size-cap
  leaks — all evidence-backed end-to-end under Playwright."**
