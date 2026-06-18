# WebSocket Chat Server — Node.js / TypeScript

Project 05 implementation using `ws`, TypeScript, `Map`-backed room state, and a pure `ChatHub` core.

## Features

- `WS /ws?name=display` accepts JSON text events and sends `connected` with heartbeat policy.
- Join/leave rooms, room broadcast, private messages, presence updates, typing indicators, bounded history, heartbeat ping/stale cleanup, structured errors, `/healthz`, `/metrics`, and pino JSON logs.
- Core state is in-memory and intentionally single-process for this teaching project.

## Commands

```bash
npm install
npm run lint
npm run test
npm run test:coverage
npm run build
npm start
```

Default port: `8085`. Configuration env vars: `PORT`, `HOST`, `HEARTBEAT_INTERVAL_MS`, `HEARTBEAT_TIMEOUT_MS`, `ROOM_CAPACITY`, `MESSAGE_SIZE_LIMIT`, `HISTORY_SIZE`, `OUTBOUND_QUEUE_LIMIT`, `LOG_LEVEL`.

## Docker

```bash
docker build -t websocket-chat-node .
docker run --rm -p 8085:8085 websocket-chat-node
```

## Layout

- `src/chatHub.ts` — deterministic core logic for rooms, messages, presence, history, heartbeat and metrics.
- `src/server.ts` — `http` + `ws` gateway, health and metrics endpoints.
- `tests/*.test.ts` — behavior tests through public API with coverage threshold ≥80% for core logic.
