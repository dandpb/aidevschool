# URL Shortener — Go

Go implementation of AI DevSchool Project 03. It uses `net/http`, an in-memory `sync.RWMutex` store, base62 generated codes, custom aliases, asynchronous click analytics, `slog` JSON logging, and graceful shutdown.

## Run

```sh
go run ./cmd/server
curl -s -X POST http://localhost:8080/shorten -H 'content-type: application/json' -d '{"url":"https://example.com","custom_alias":"abc"}'
curl -i http://localhost:8080/abc
curl -s http://localhost:8080/abc/stats
```

`PORT` defaults to `8080`.

## Test and lint

```sh
go test -race -cover ./...
gofmt -w ./cmd ./internal
golangci-lint run ./...
```

The implementation is in-memory as requested, so mappings do not survive process restarts. Analytics are queued in a buffered channel; if the queue is full, redirects still return `301` and the dropped analytics event is logged.

## Docker

```sh
docker build -t url-shortener-go .
docker run --rm -p 8080:8080 url-shortener-go
```
