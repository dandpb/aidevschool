import { createServer } from 'node:http';
import { Cache, Config, HttpApp } from './cache.js';

const cache = new Cache(new Config('node-ts-a').withCapacityEntries(1024).withMaxValueBytes(1024 * 1024).withDefaultTtlMs(60_000));
const app = new HttpApp(cache);

const server = createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on('data', (chunk: Buffer) => chunks.push(chunk));
  request.on('end', () => {
    void app.handle(request.method ?? 'GET', request.url ?? '/', Buffer.concat(chunks).toString('utf8')).then((result) => {
      response.writeHead(result.status, { 'content-type': 'application/json' });
      response.end(result.body);
    });
  });
});

server.listen(8080, () => console.log(JSON.stringify({ level: 'info', event: 'server_started', port: 8080 })));

process.on('SIGINT', () => {
  void cache.shutdown().then(() => server.close(() => process.exit(0)));
});
