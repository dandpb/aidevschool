# Key-Value Store — Go

Idiomatic Go implementation of AI DevSchool Project 02. It uses `map[string]StoredEntry` protected by `sync.RWMutex`, stdlib `net/http`, and JSON logs through `log/slog`.

## How to run

```sh
go run ./cmd/kvstore
curl -s http://localhost:8080/health
```

The service listens on `:8080` by default. Override with `PORT=9000`.

## How to test

```sh
gofmt -w ./cmd ./internal
go test -race -cover ./...
go build ./cmd/kvstore
golangci-lint run ./... # when installed
```

## API

Implements the shared HTTP JSON API from `../docs/spec.md`: `SET`, `GET`, `DEL`, `EXPIRE`, `TTL`, `PERSIST`, `KEYS`, `FLUSHDB`, `MGET`, `MSET`, and `GET /health`.

## Docker

```sh
docker build -t kvstore-go .
docker run --rm -p 8080:8080 kvstore-go
```

The multi-stage image compiles a stripped binary in `golang:1.21-alpine` and copies it into `alpine:3.19`, keeping the final image well under 300 MB.
