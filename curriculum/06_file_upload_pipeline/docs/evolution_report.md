# Evolution Report — Project 06 · File Upload/Processing Pipeline

> Phase: **cycle-complete**
> Focus: one bottleneck and one optimization suggestion per implementation language.

## Go

- **Bottleneck:** Upload metadata is held in an in-memory registry, and list pagination iterates an unsorted map. Under restart, records disappear; under pagination, cursor order can drift.
- **Optimization suggestion:** Introduce a small durable metadata repository. A JSONL append log is enough for the next learning step; SQLite is better if pagination/filtering becomes central. Sort IDs or use created-at ordering before cursor slicing.

## Rust

- **Bottleneck:** Cancellation is represented by an `AtomicBool` checked between chunks. It is simple and testable, but cancellation latency depends on when the next chunk boundary is reached.
- **Optimization suggestion:** Replace the flag with a cancellation token and structure stream processing around cancellation-aware awaits. Keep the enum-based terminal states, but make cancellation participate in the async control flow rather than being polled opportunistically.

## Node/TypeScript

- **Bottleneck:** Oversize uploads continue reading after the limit is exceeded because the failure is deferred until the stream ends.
- **Optimization suggestion:** Abort the file stream as soon as `maxUploadBytes` is crossed, destroy/unpipe the parser where safe, and mark the upload failed immediately. This better matches the spec and saves bandwidth/CPU during abusive uploads.

## Cross-Language Evolution Theme

The next evolution should focus on the difference between **streaming correctness** and **pipeline operability**. The current code streams bytes correctly; the next version should prove cancellation, restart persistence, progress cadence, and cleanup under load.
