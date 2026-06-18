import pino from 'pino';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

const config = loadConfig();
const logger = pino({ level: config.logLevel });
const app = buildServer(config, logger);

app.server.listen(config.port, config.host, () => {
  logger.info({ host: config.host, port: config.port }, 'websocket chat server listening');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down');
    app.close().then(() => process.exit(0)).catch((error: unknown) => {
      logger.error({ error }, 'shutdown failed');
      process.exit(1);
    });
  });
}
