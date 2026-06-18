# REST API with Auth — Go

Project 07 implementation using `net/http`, `slog`, `github.com/golang-jwt/jwt/v5`, in-memory repositories, interfaces for clock/config boundaries, refresh-token rotation, RBAC middleware, audit logging, and graceful shutdown.

## Run

```sh
go run ./cmd/server
curl http://localhost:8080/healthz
```

## API

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/users` — admin role required
- `PUT /v1/users/:id` — admin or self-service `display_name`
- `GET /healthz`

## Verify

```sh
go test -race -cover ./...
golangci-lint run ./...
```
