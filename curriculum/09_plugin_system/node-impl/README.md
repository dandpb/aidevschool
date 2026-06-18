# Plugin System — Node/TypeScript

Node/TypeScript implementation of Project 09. The host uses runtime-validated manifests, dynamic `import()` for entrypoints, try/catch around lifecycle and hook calls, scoped structured logging with pino, and a sandbox descriptor that records Worker Threads availability for stronger future isolation.

Isolation tradeoff: dynamic import plus try/catch isolates exceptions but not malicious process access. The same `PluginRuntime` contract can be moved to Worker Threads, child processes, `vm`, or WASM for production untrusted plugins.

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

- `POST /plugins`
- `GET /plugins`
- `GET /plugins/:pluginId`
- `PATCH /plugins/:pluginId`
- `POST /plugins/:pluginId/lifecycle/:transition`
- `POST /hooks/:hookName/dispatch`
- `GET /health`

## Docker

```sh
docker build -t plugin-system-node .
docker run --rm -p 8081:8081 plugin-system-node
```
