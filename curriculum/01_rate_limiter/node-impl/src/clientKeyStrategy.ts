import type { Request } from 'express';

/**
 * Resolve a stable, normalized client key from an incoming request.
 *
 * This seam isolates the trust-boundary logic (which header/socket field to
 * trust, how to normalize IPv4-mapped IPv6, what fallback to use) from the
 * rate-limiter and the HTTP framework.
 */
export interface ClientKeyStrategy {
  resolve(req: Request): string;
}

/**
 * Default strategy for Express requests.
 *
 * - When `trustProxy` is on, Express has already parsed `X-Forwarded-For`
 *   into `req.ip`, so we prefer that.
 * - When `trustProxy` is off, we use the raw socket address.
 * - IPv4-mapped IPv6 (`::ffff:127.0.0.1`) is normalized to IPv4, and
 *   bracketed IPv6 (`[::1]`) is unwrapped so the same physical client gets
 *   one bucket regardless of socket family.
 */
export function createExpressClientKeyStrategy(trustProxy: boolean): ClientKeyStrategy {
  return {
    resolve(req: Request): string {
      const raw = trustProxy
        ? (req.ip ?? req.socket.remoteAddress ?? 'unknown')
        : (req.socket.remoteAddress ?? req.ip ?? 'unknown');
      return normalizeIp(raw);
    },
  };
}

function normalizeIp(raw: string): string {
  // Express returns the bracketed IPv6 `[::1]` from `req.ip`; strip the
  // brackets so the Map key is consistent with raw socket addresses.
  let ip = raw;
  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }
  // IPv4-mapped IPv6 (`::ffff:127.0.0.1`) → `127.0.0.1`
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) {
    return mapped[1]!;
  }
  return ip;
}
