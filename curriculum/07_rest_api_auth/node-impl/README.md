# REST API with Auth — Node/TypeScript

Project 07 implementation using Fastify, strict TypeScript, `jsonwebtoken`, in-memory repositories, constructor-injected services, request-ID middleware, structured Pino logging, refresh-token rotation, RBAC, audit logging, and graceful shutdown.

## Run

```sh
npm install
npm run build
npm start
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
npm run lint
npm run test:coverage
npm run build
```
