# Plugin System — Go

Go implementation of Project 09. The host uses a manifest-first registry, explicit lifecycle transitions, capability grants, priority-ordered hooks, scoped structured logging with `slog`, and `recover()` around plugin calls so a plugin panic becomes plugin state instead of a host crash.

Isolation tradeoff: this teaching implementation uses an in-process interface plus panic recovery. The manifest and sandbox descriptor make the boundary explicit; production-grade untrusted plugins should move the same `PluginRuntime` contract behind a subprocess, WASM, or RPC boundary for memory/process isolation.

## Run

```sh
go run .
curl -s http://127.0.0.1:8080/health
```

## Verify

```sh
go test -race -cover ./...
```

## Endpoints

- `POST /plugins`
- `GET /plugins`
- `GET /plugins/{pluginId}`
- `POST /plugins/{pluginId}/lifecycle/{load|init|start|stop|unload}`
- `POST /hooks/{hookName}/dispatch`
- `GET /health`

## Docker

```sh
docker build -t plugin-system-go .
docker run --rm -p 8080:8080 plugin-system-go
```
