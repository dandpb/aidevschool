import http from 'node:http';
import pino from 'pino';
import { buildApp } from './server';
import { KeyValueStore } from './store';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const port = Number(process.env.PORT ?? 8081);
const server = http.createServer(buildApp(new KeyValueStore(), logger));

server.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'server_starting');
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'server_stopping');
  const timer = setTimeout(() => {
    logger.error('server_shutdown_timeout');
    process.exit(1);
  }, 5000);
  timer.unref();
  server.close((error?: Error) => {
    if (error !== undefined) {
      logger.error({ error }, 'server_shutdown_failed');
      process.exit(1);
    }
    logger.info('server_stopped');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
