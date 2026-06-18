# Metrics Collector — Go

Metrics collection service in Go implementing counters, gauges, histograms, timers, aggregation, Prometheus export, and alert rules.

## Quick start

```sh
go run main.go
```

## Test

```sh
go test -race -coverprofile=coverage.out ./metrics/...
go tool cover -func=coverage.out
```

## Docker

```sh
docker build -t metrics-collector-go .
docker run --rm -p 8080:8080 metrics-collector-go
```
