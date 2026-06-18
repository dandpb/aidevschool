# Log Aggregator — Node.js/TypeScript

Structured log aggregation service in Node.js/TypeScript with Express implementing JSON log ingestion, filtering, full-text search, retention, and trace lookup.

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
docker build -t log-aggregator-node .
docker run --rm -p 8080:8080 log-aggregator-node
```
