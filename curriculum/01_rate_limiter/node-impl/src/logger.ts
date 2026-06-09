import pino from 'pino';

/**
 * Single shared pino instance. The level is controlled via the `LOG_LEVEL`
 * env var (validated by `loadConfig`).
 *
 * Why pino:
 *  - structured JSON out of the box (log shippers love it)
 *  - very low overhead, suitable for a hot-path middleware
 *  - no global config — easier to test with child loggers
 */
export function createLogger(level: string): pino.Logger {
  return pino({
    level,
    base: { service: 'rate-limiter-node' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      // Trim noisy default fields; we already set `service` in `base`.
      level: (label) => ({ level: label }),
    },
  });
}
