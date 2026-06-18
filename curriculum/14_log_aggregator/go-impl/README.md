# Log Aggregator — Go

Structured log aggregation service in Go implementing JSON log ingestion, filtering, full-text search, retention, and trace lookup.

## Quick start

```sh
go run .
```

## Build

```sh
go build -o log-aggregator-go .
```

## Test

```sh
go test -race -cover ./...
```

## Docker

```sh
docker build -t log-aggregator-go .
docker run --rm -p 8080:8080 log-aggregator-go
```
