/**
 * Custom error classes for the rate-limiter service.
 *
 * Each error has a stable `code` so it can be matched in logs, by error
 * reporters (e.g. Sentry), or by upstream error-handling middleware without
 * relying on the human-readable message.
 */

/** Base class — every rate-limiter error extends this. */
export class RateLimiterError extends Error {
  public readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    // Keep the prototype chain intact for `instanceof` to work after transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when environment variables fail validation at startup. */
export class ConfigError extends RateLimiterError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFIG_ERROR', message, options);
  }
}

/** Thrown when the underlying HTTP server fails to bind or close cleanly. */
export class ServerError extends RateLimiterError {
  constructor(message: string, options?: ErrorOptions) {
    super('SERVER_ERROR', message, options);
  }
}
