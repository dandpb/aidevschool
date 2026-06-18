# Metrics Collector — Node.js/TypeScript

Metrics collection service in Node.js/TypeScript with Express implementing counters, gauges, histograms, timers, aggregation, Prometheus export, and alert rules.

## Quick start

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Test

```sh
npm test
npm run test:coverage
```

## Docker

```sh
docker build -t metrics-collector-node .
docker run --rm -p 8080:8080 metrics-collector-node
```
