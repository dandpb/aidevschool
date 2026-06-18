# File Upload Pipeline — Go

Streaming implementation of Project 06 using `net/http`, `MultipartReader`, fixed
32 KiB read buffers, incremental `crypto/sha256`, temporary-file promotion, and an
in-memory progress registry.

## Run

```sh
go run .
curl -F 'file=@README.md;type=text/plain' http://localhost:8086/upload
```

## API

- `POST /upload` multipart field `file`, optional `expectedChecksum`.
- `GET /files?status=&limit=&cursor=` list records.
- `GET /files/:id` fetch metadata.
- `GET /files/:id/status` fetch progress.
- `DELETE /files/:id` cancels active uploads or deletes stored artifacts.
- `GET /healthz` liveness.

## Streaming and memory

The upload path never buffers a complete file in memory. It reads each multipart
part into a reusable 32 KiB slice, updates the SHA-256 hash, writes the same chunk
to a temp file, records chunk progress, and enforces `MAX_UPLOAD_BYTES` as bytes
arrive. Completed files are promoted into `UPLOAD_STORAGE_DIR/files`.

Thumbnail generation is documented as temp-file-backed metadata (`thumbnailStatus`)
for image uploads; the original file is never loaded fully into application memory.

## Verify

```sh
go test -race -cover ./...
```
