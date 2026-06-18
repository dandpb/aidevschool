# WebSocket Chat Server — Go

Project 05 implementation using `net/http`, `github.com/gorilla/websocket`, goroutine-friendly core state, and structured `slog` JSON logs.

## Features

- `WS /ws?name=display` JSON events with `connected` acknowledgement.
- Join/leave rooms, room broadcast, private messages, presence, typing indicators, bounded message history, heartbeat helpers, graceful cleanup, `/healthz`, and `/metrics`.
- `chat.Hub` is a deterministic core tested without sockets; `chat.Server` adapts it to Gorilla WebSocket.

## Commands

```bash
go mod tidy
go test -race -cover ./...
go vet ./...
go build ./...
go run .
```

Default listen address: `:8085`.

## Docker

```bash
docker build -t websocket-chat-go .
docker run --rm -p 8085:8085 websocket-chat-go
```
