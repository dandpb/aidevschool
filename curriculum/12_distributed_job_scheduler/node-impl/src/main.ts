import { createServer } from 'node:http';
import { Scheduler, logJson } from './scheduler.js';

const scheduler = new Scheduler('node-ts');
scheduler.becomeLeader(['node-ts'], 30_000);
const port = Number(process.env.PORT ?? '8080');

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    const body = JSON.stringify(scheduler.health());
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(body);
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: { code: 'not_found', message: 'route not found' } }));
});

server.listen(port, () => {
  logJson('scheduler_started', { port });
});

const shutdown = (signal: NodeJS.Signals): void => {
  logJson('scheduler_stopping', { signal });
  server.close((error) => {
    if (error !== undefined) {
      logJson('scheduler_shutdown_failed', { message: error.message });
      process.exitCode = 1;
      return;
    }
    process.exitCode = 0;
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
