import pino from 'pino';
import { buildApp, shutdown } from './server';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const port = Number(process.env.PORT ?? 8081);
const { app } = buildApp();
const server = app.listen(port, '127.0.0.1', () => logger.info({ port }, 'event-driven order system listening'));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'graceful shutdown requested');
    shutdown(server).then(() => process.exit(0)).catch((error) => {
      logger.error({ error }, 'shutdown failed');
      process.exit(1);
    });
  });
}
