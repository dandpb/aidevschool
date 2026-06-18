# File Upload Pipeline — Rust

Streaming Project 06 implementation using `axum` multipart, async `tokio::fs`
writes, fixed-size streaming chunks supplied by the multipart extractor, and
incremental `sha2::Sha256` hashing.

## Run

```sh
cargo run
curl -F 'file=@README.md;type=text/plain' http://localhost:8087/upload
```

## API

- `POST /upload` multipart `file`, optional `expectedChecksum` and metadata fields.
- `GET /files`, `GET /files/:id`, `GET /files/:id/status`.
- `DELETE /files/:id` cancels active uploads or removes stored artifacts.
- `GET /healthz`.

## Streaming and memory

The server consumes `Multipart::next_field()` and `Field::chunk()` in a loop. Each
chunk updates SHA-256, writes to a temporary file, updates progress, and checks the
configured `MAX_UPLOAD_BYTES` limit before final promotion. It does not buffer the
whole file in application memory.

Image uploads record a documented temp-file-backed thumbnail status; production
thumbnail processors can consume the promoted temp-backed artifact without loading
the original into memory.

## Verify

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```
