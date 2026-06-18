import http from 'node:http';
import pino from 'pino';
import { loadConfig } from './config';
import { buildApp } from './server';

async function main(): Promise<void> {
  const cfg = loadConfig();
  const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
  const app = await buildApp(cfg, logger);
  const server = http.createServer(app);
  server.listen(cfg.port, () => logger.info({ port: cfg.port }, 'listening'));
  const shutdown = (): void => {
    logger.info('shutdown signal received');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
