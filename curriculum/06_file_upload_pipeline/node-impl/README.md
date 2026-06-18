# File Upload Pipeline — Node/TypeScript

Streaming Project 06 implementation using Express, Busboy, Node streams,
incremental `crypto.createHash('sha256')`, temp-file promotion, progress records,
and graceful shutdown.

## Run

```sh
npm install
npm run build
npm start
curl -F 'file=@README.md;type=text/plain' http://localhost:8088/upload
```

## API

- `POST /upload` multipart `file`, optional `expectedChecksum` and metadata fields.
- `GET /files`, `GET /files/:id`, `GET /files/:id/status`.
- `DELETE /files/:id` cancels active uploads or deletes stored artifacts.
- `GET /healthz`.

## Streaming and memory

Busboy parses multipart bodies as streams. `UploadService.processFile()` consumes
the file with `for await`, updates SHA-256 per chunk, writes the same chunk to a
temporary file with backpressure (`write()` + `drain`), records progress, and
enforces `MAX_UPLOAD_BYTES` as bytes arrive. The whole file is never buffered in
application memory.

Image uploads record a documented temp-file-backed thumbnail status; production
thumbnail workers can process the promoted artifact without loading the original
file into memory.

## Verify

```sh
npm run lint
npm run test:coverage
npm run build
```
