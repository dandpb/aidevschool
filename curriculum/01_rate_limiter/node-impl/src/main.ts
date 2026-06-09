import { loadConfig } from './config';
import { createLogger } from './logger';
import { startServer, type StartedServer } from './index';

/**
 * Process entry point. Splits the bootstrap (signal handlers, config,
 * lifecycle) from the testable server builder in `./index`.
 *
 * Kept out of `src/index.ts` so unit tests can `import { buildServer }`
 * without triggering process-wide side effects, and so coverage tools
 * don't have to ignore a `require.main === module` branch.
 */

const logger = createLogger(process.env.LOG_LEVEL ?? 'info');

// Surface bugs in async code before they become silent log noise.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandledRejection — exiting');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException — exiting');
  // After an uncaughtException the process state is undefined; exit fast.
  process.exit(1);
});

let serverHandle: StartedServer | undefined;

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info({ signal }, 'shutdown signal received');
  if (!serverHandle) {
    process.exit(0);
  }
  try {
    // server.close() stops accepting new connections, then waits for
    // in-flight handlers to drain. The cleanup interval is cleared by
    // `close()`.
    await serverHandle.close();
    logger.info('server closed cleanly');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

const config = loadConfig();
const leveledLogger = createLogger(config.logLevel);
startServer(config, leveledLogger)
  .then((handle) => {
    serverHandle = handle;
  })
  .catch((err) => {
    // Use the original logger so we still get the log-level env var
    // even if config parsing itself was the failure.
    logger.fatal({ err }, 'failed to start server');
    process.exit(1);
  });
