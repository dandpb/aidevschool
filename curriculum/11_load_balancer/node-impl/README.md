# Load Balancer — Node/TypeScript

Project 11 implementation using Node `http`, `http-proxy`, health-aware backend pool state, round-robin and least-connections routing, weighted distribution, active `/health` probes, passive failure updates, per-backend circuit breakers, structured JSON logs, admin endpoints, and graceful shutdown.

## Run

```sh
npm install
npm run build
BACKENDS=http://127.0.0.1:9001,http://127.0.0.1:9002 npm start
```

## Verify

```sh
npm run lint
npm run test:coverage
npm run build
```

## Admin endpoints

- `GET /__lb/health`
- `GET /__lb/backends`
- `GET /__lb/metrics`

## Docker

```sh
docker build -t load-balancer-node .
docker run --rm -p 8080:8080 -e BACKENDS=http://host.docker.internal:9001,http://host.docker.internal:9002 load-balancer-node
```
