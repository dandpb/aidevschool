import http from 'node:http';
import { buildApp } from './server';

export function listenPort(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.PORT ?? '8081';
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }
  return port;
}

export function startServer(port = listenPort()): http.Server {
  const { app, logger } = buildApp({ baseUrl: `http://localhost:${port}` });
  const server = app.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'server_listening');
  });
  const shutdown = () => {
    server.close((error) => {
      if (error !== undefined) {
        logger.error({ error }, 'shutdown_failed');
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  startServer();
}
