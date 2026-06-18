# Code Review — Project 06 · File Upload/Processing Pipeline

> Inputs: `docs/spec.md`, `go-impl/`, `rust-impl/`, `node-impl/` source and tests.
> Posture: pedagogical review — reward stream-first thinking, then sharpen the operational edges.

## Executive Summary

All three implementations demonstrate the core learning objective: upload bytes are processed incrementally, hashed with SHA-256 while streaming, written through temporary artifacts, and promoted only after validation succeeds. The implementations are intentionally compact and useful for comparing runtime ergonomics: Go uses `MultipartReader` and fixed buffers, Rust uses Axum multipart fields and async file writes, and Node uses Busboy plus stream iteration and backpressure-aware writes.

The largest shared gap is persistence. The spec requires enough terminal upload state to survive process restart; all three registries are in-memory only. The second shared gap is thumbnail generation: all three document a temp-file-backed thumbnail strategy but do not generate thumbnail artifacts or dimensions. These are acceptable learning-cycle caveats, but they should be explicit before anyone claims full spec completion.

## Severity Summary

| Implementation | Critical | Major | Minor | Educational | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Go | 0 | 3 | 3 | 1 | 7 |
| Rust | 0 | 3 | 2 | 2 | 7 |
| Node/TS | 0 | 3 | 3 | 1 | 7 |
| Cross-language | 0 | 2 | 1 | 1 | 4 |
| **Total** | **0** | **11** | **9** | **5** | **25** |

## Seven-Category Coverage

| Category | Representative findings |
| --- | --- |
| Security | filename sanitization, MIME/extension allowlist, checksum handling |
| Performance | streaming buffers good; chunk vectors can grow without summary compaction |
| Readability | clear pipeline flow; some large handler functions |
| Maintainability | in-memory registry limits restart behavior |
| Idiomaticity | Go `io.Reader`, Rust async chunks, Node streams are idiomatic |
| Error Handling | stable errors mostly present; client disconnect semantics vary |
| Testing | good integration tests; missing restart/concurrency/load evidence |

## Go Findings

### [GO-MAJOR-001] Terminal upload state is in-memory only

- **Category:** Maintainability · Testing
- **Evidence:** `Registry` stores records in `map[string]*Upload`; no disk-backed record store is written.
- **Impact:** RNF-008 is not satisfied. Completed/failed/cancelled statuses disappear after restart, even though stored files may still exist.
- **Pedagogical fix:** Add a small JSONL or SQLite metadata repository; keep the in-memory map as a cache, not the source of truth.

### [GO-MAJOR-002] Thumbnail generation and image dimensions are documented, not implemented

- **Category:** Maintainability · Testing
- **Evidence:** `thumbnailStatus()` returns a string; no thumbnail file or dimensions are produced.
- **Impact:** RF-007 and the image-dimensions part of RF-008 are only represented as a caveat.
- **Pedagogical fix:** Either implement a bounded image probe plus thumbnail worker, or mark thumbnail support as deferred in status and tests.

### [GO-MAJOR-003] `Registry.list` iterates an unsorted map, making pagination unstable

- **Category:** Error Handling · Testing
- **Evidence:** IDs are collected from `map` iteration and not sorted before cursor handling.
- **Impact:** `GET /files` can return inconsistent order and cursors across calls, especially after concurrent inserts.
- **Pedagogical fix:** Sort IDs before applying cursor/limit, matching the Node/Rust implementations.

### [GO-MINOR-001] `DELETE /files/:id` marks completed uploads as cancelled

- **Category:** Readability · Error Handling
- **Evidence:** `fileByID` removes stored file and sets `StatusCancelled` for any existing upload.
- **Impact:** The API allows `204` for completed delete or `409` for non-cancellable state. Returning cancelled for a completed artifact deletion blurs lifecycle semantics.
- **Pedagogical fix:** Distinguish cancellation of active uploads from deletion of completed artifacts.

### [GO-MINOR-002] Client metadata fields are read with `io.ReadAll` capped to 4 KiB but silently truncated

- **Category:** Security · Error Handling
- **Evidence:** non-file fields use `io.ReadAll(io.LimitReader(part, 4096))`.
- **Impact:** Safe from unbounded memory, but clients are not told their metadata was truncated.
- **Pedagogical fix:** Reject metadata fields above the cap with a validation error.

### [GO-MINOR-003] Memory test builds a 2 MiB multipart body in memory

- **Category:** Testing · Performance
- **Evidence:** `bytes.Repeat` and `bytes.Buffer` in `TestMalformedMissingAndMemoryBounded`.
- **Impact:** The test proves server-side growth is modest for 2 MiB, but it does not simulate a true streaming client.
- **Pedagogical fix:** Add an `io.Pipe` or chunked test body for more realistic streaming/backpressure evidence.

### [GO-EDU-001] Fixed 32 KiB buffer is the right first teaching choice

- **Category:** Idiomaticity
- **Lesson:** A reusable buffer in a `part.Read` loop is easy to reason about and makes memory bounds visible. Later benchmarks can tune buffer size; first-cycle code should favor clarity.

## Rust Findings

### [RUST-MAJOR-001] Terminal upload state is not persisted across restart

- **Category:** Maintainability · Testing
- **Evidence:** `Registry` is an `RwLock<HashMap<String, Upload>>`.
- **Impact:** RNF-008 is not met. The filesystem may keep files, but status/detail endpoints cannot reconstruct upload records after restart.
- **Pedagogical fix:** Persist upload metadata to disk or SQLite on each terminal transition; load it during `build_state`.

### [RUST-MAJOR-002] Thumbnail generation and dimensions are placeholders

- **Category:** Maintainability
- **Evidence:** `thumbnail_status` is set to `documented: temp-file-backed thumbnail processor`; no `thumbnail_path`, width, or height is produced.
- **Impact:** RF-007 is pedagogically acknowledged but not implemented.
- **Pedagogical fix:** Add an image-metadata stage using bounded probing, then decide whether thumbnail generation is synchronous or asynchronous.

### [RUST-MAJOR-003] Cancellation is flag-based and only checked between received chunks

- **Category:** Error Handling · Performance
- **Evidence:** `AtomicBool` is checked inside the `while let Some(chunk)` loop.
- **Impact:** A pending large chunk read/write is not interrupted immediately by `DELETE`; cancellation latency depends on multipart chunking and disk write completion.
- **Pedagogical fix:** Use cancellation tokens/select-style coordination around chunk reads and file writes where the framework permits it.

### [RUST-MINOR-001] `read_buffer_bytes` exists in config but is not used by Axum's multipart chunking

- **Category:** Readability · Maintainability
- **Evidence:** `Config.read_buffer_bytes` is defined and passed in tests, but `Field::chunk()` controls chunk size.
- **Impact:** The config suggests a tuning knob that currently has no effect.
- **Pedagogical fix:** Remove it or use a lower-level body stream where buffer size is actually controlled.

### [RUST-MINOR-002] `now_secs()` gives second-level progress timestamps

- **Category:** Performance · Testing
- **Evidence:** timestamps are `u64` seconds since epoch.
- **Impact:** Progress updates within the same second are indistinguishable, which weakens RNF-005 evidence.
- **Pedagogical fix:** Use RFC3339 strings or millisecond epoch values for progress/chunk timestamps.

### [RUST-EDU-001] Enum-backed upload status is a model answer

- **Category:** Idiomaticity
- **Lesson:** `UploadStatus` makes terminal states explicit and serializable. This is stronger than stringly typed status values and teaches exhaustiveness well.

### [RUST-EDU-002] Async file writes are clear, but backpressure still deserves measurement

- **Category:** Performance
- **Lesson:** `file.write_all(&chunk).await` naturally awaits the downstream sink. That is a good shape; benchmark memory and throughput to prove it stays bounded at 25 concurrent 100 MB uploads.

## Node/TypeScript Findings

### [NODE-MAJOR-001] Terminal upload state is in-memory only

- **Category:** Maintainability · Testing
- **Evidence:** `UploadRegistry` stores uploads in a `Map` and uses `structuredClone` for copies.
- **Impact:** RNF-008 is not satisfied after process restart.
- **Pedagogical fix:** Add a file-backed metadata repository or SQLite adapter behind the registry interface.

### [NODE-MAJOR-002] Oversize uploads keep reading after size is exceeded

- **Category:** Performance · Error Handling
- **Evidence:** `processFile` sets `deferredFailure` when size exceeds the limit and then continues iterating the stream.
- **Impact:** This enforces correctness eventually, but violates the spec's "stop reading as soon as safely possible" intent and wastes bandwidth/disk-parser work.
- **Pedagogical fix:** Destroy/unpipe the file stream and fail immediately once the byte limit is crossed.

### [NODE-MAJOR-003] Thumbnail generation is documented, not implemented

- **Category:** Maintainability
- **Evidence:** `thumbnailStatus` is a descriptive string; no artifact or dimensions are generated.
- **Impact:** RF-007/RF-008 are partial.
- **Pedagogical fix:** Add a bounded image metadata/thumbnail stage after temp-file promotion, or explicitly defer in the project status.

### [NODE-MINOR-001] Pagination `nextCursor` can be wrong when filtering by status

- **Category:** Error Handling
- **Evidence:** `nextCursor` uses `start + items.length < ids.length`, but `items.length` counts only matching records, not scanned records.
- **Impact:** With filters, the cursor can imply more results even after all matching records are exhausted.
- **Pedagogical fix:** Track the last scanned index separately from returned item count.

### [NODE-MINOR-002] Config parser silently falls back on invalid numeric env values

- **Category:** Error Handling · Maintainability
- **Evidence:** `parsePositiveInt` returns fallback for invalid input.
- **Impact:** Misconfigured max upload size or port can go unnoticed.
- **Pedagogical fix:** Fail fast on invalid environment values, as this is safer for resource limits.

### [NODE-MINOR-003] Request cancellation depends on explicit DELETE, not client disconnect

- **Category:** Error Handling
- **Evidence:** `AbortController` is only aborted via registry cancellation.
- **Impact:** A dropped client may continue processing unless Busboy/file stream errors propagate.
- **Pedagogical fix:** Wire `req.on('aborted')` / `req.on('close')` to abort in-progress uploads and mark `network_interruption`.

### [NODE-EDU-001] Busboy plus `for await` is the right stream-first teaching pattern

- **Category:** Idiomaticity · Performance
- **Lesson:** The implementation avoids buffering middleware and demonstrates incremental hash/write/progress. That is the key Project 06 concept.

## Cross-Language Comparison

| Concern | Go | Rust | Node/TS | Teaching takeaway |
| --- | --- | --- | --- | --- |
| Streaming primitive | `multipart.Part.Read` | `Field::chunk().await` | Busboy file stream | All three avoid whole-file buffering in server code. |
| Hashing | `crypto/sha256` | `sha2::Sha256` | `crypto.createHash` | Same incremental checksum concept, different ergonomics. |
| Backpressure | blocking file write | async `write_all` | `write()` + `drain` | Node makes backpressure most explicit; Go makes it implicit; Rust awaits it. |
| Registry | mutex map | async RwLock map | Map | All need durable metadata for RNF-008. |
| Thumbnail | placeholder | placeholder | placeholder | Shared scope deferral should be documented as such. |

### Cross-language findings

- **[CROSS-MAJOR-001] Restart persistence is absent everywhere.** This is the clearest shared spec gap.
- **[CROSS-MAJOR-002] Thumbnail generation is not implemented in any language.** The docs are honest, but acceptance criteria should not count it as complete.
- **[CROSS-MINOR-001] Chunk history can grow large.** Recording every chunk for 1 GiB uploads may become a memory overhead; a summary ring or periodic progress records would scale better.
- **[CROSS-EDU-001] The implementations correctly teach streaming before optimization.** That is the right order for this project.

## Priority Recommendations

1. Add durable metadata persistence before claiming full RNF-008 compliance.
2. Decide whether thumbnails are in scope now; either implement them or mark them explicitly deferred.
3. Add large streaming/chunked tests that do not prebuild the whole request body in memory.
4. Add concurrency/load evidence for 25 simultaneous 100 MB uploads.
