# Event-Driven Order System — Go

Go implementation of Project 08. It uses `net/http`, structured `slog` JSON logs, an in-memory event store, an atomic in-memory outbox, channel-backed pub/sub, projections, saga orchestration, event replay, health reporting, and graceful shutdown.

> Spec note: `docs/spec.md` asks for durable storage, but this task explicitly requested an in-memory event store. The implementation keeps the event-store/outbox boundary explicit so a durable adapter can replace it later.

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

- `POST /orders`
- `POST /orders/{id}/authorize-payment`
- `POST /orders/{id}/reserve-inventory`
- `POST /orders/{id}/cancel`
- `POST /orders/{id}/ship`
- `POST /orders/{id}/deliver`
- `GET /orders/{id}`
- `GET /orders/{id}/events`
- `GET /customers/{customer_id}/orders`
- `POST /admin/projections/replay`
- `GET /health`

## Docker

```sh
docker build -t edo-go .
docker run --rm -p 8080:8080 edo-go
```
