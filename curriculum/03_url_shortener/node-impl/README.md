# URL Shortener — Node/TypeScript

Node.js TypeScript implementation of AI DevSchool Project 03 using Express, strict TypeScript, in-memory `Map` storage, base62 generated codes, custom aliases, asynchronous click analytics, pino structured logging, and graceful shutdown.

## Run

```sh
npm install
npm run build
npm start
curl -s -X POST http://localhost:8081/shorten -H 'content-type: application/json' -d '{"url":"https://example.com","custom_alias":"abc"}'
curl -i http://localhost:8081/abc
curl -s http://localhost:8081/abc/stats
```

`PORT` defaults to `8081`.

## Test and lint

```sh
npm run lint
npm run test:coverage
npm run build
```

The implementation is in-memory as requested, so mappings do not survive process restarts. Analytics are queued with `setImmediate`; redirects return `301` before stats are drained, and the queue can be drained directly in tests.

## Docker

```sh
docker build -t url-shortener-node .
docker run --rm -p 8081:8081 url-shortener-node
```
