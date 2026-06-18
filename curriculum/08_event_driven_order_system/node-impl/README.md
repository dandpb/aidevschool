# Event-Driven Order System — Node/TypeScript

Node/TypeScript implementation of Project 08 using Express, an in-memory event store/outbox, `EventEmitter` pub/sub, projections, saga orchestration, event replay, health reporting, pino structured logging, and graceful shutdown.

> Spec note: `docs/spec.md` asks for durable storage, but this task explicitly requested an in-memory event store. The store/outbox boundary is explicit so a durable adapter can replace it later.

## Run

```sh
npm install
npm run build
npm start
curl -s http://127.0.0.1:8081/health
```

## Verify

```sh
npm run lint
npm run test
npm run test:coverage
npm run build
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
docker build -t edo-node .
docker run --rm -p 8081:8081 edo-node
```
