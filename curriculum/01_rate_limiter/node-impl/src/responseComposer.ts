import type { ConsumeResult } from './rateLimiter';

/**
 * A plain, framework-agnostic HTTP response. The seam intentionally does
 * not depend on Express so the composer is cheap to unit-test and can be
 * reused from other transports.
 */
export interface ComposedHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

/**
 * Compose the HTTP response for a rate-limit decision.
 *
 * This is a deep module: callers hand it a `ConsumeResult` and get back a
 * complete response (status, headers, body). All rate-limit header names,
 * JSON body shapes, and the pre-allocated 429 string optimization live here.
 */
export interface ResponseComposer {
  compose(decision: ConsumeResult): ComposedHttpResponse;
}

/**
 * Default composer for the rate-limited `GET /` endpoint.
 *
 * Pre-allocates the constant parts of the 429 JSON body so the hot path
 * (96% of requests at 200 RPS oversubscribe) does no per-request object
 * allocation or JSON.stringify. Only the retry_after integer changes;
 * we concatenate from pre-allocated string segments.
 */
export function createResponseComposer(): ResponseComposer {
  const TOO_MANY_REQUESTS_BODY_PREFIX =
    '{"error":"Too Many Requests","retry_after_seconds":';
  const TOO_MANY_REQUESTS_BODY_SUFFIX = '}';
  const WELCOME_BODY = '{"message":"Welcome to the rate-limited endpoint!"}';

  return {
    compose(decision: ConsumeResult): ComposedHttpResponse {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(decision.limit),
        'X-RateLimit-Remaining': String(decision.remaining),
        'X-RateLimit-Reset': String(decision.resetEpochSeconds),
      };

      if (decision.allowed) {
        return { status: 200, headers, body: WELCOME_BODY };
      }

      headers['Retry-After'] = String(decision.retryAfterSeconds);
      return {
        status: 429,
        headers,
        body:
          TOO_MANY_REQUESTS_BODY_PREFIX +
          String(decision.retryAfterSeconds) +
          TOO_MANY_REQUESTS_BODY_SUFFIX,
      };
    },
  };
}
