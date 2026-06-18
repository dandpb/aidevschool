import { describe, it, expect } from 'vitest';

import { createResponseComposer } from '../responseComposer';
import type { ConsumeResult } from '../rateLimiter';

describe('ResponseComposer', () => {
  const composer = createResponseComposer();

  function allowedDecision(overrides: Partial<ConsumeResult> = {}): ConsumeResult {
    return {
      allowed: true,
      remaining: 9,
      limit: 10,
      secondsUntilFull: 0.5,
      retryAfterSeconds: 0,
      resetEpochSeconds: 1_700_000_001,
      ...overrides,
    };
  }

  function deniedDecision(overrides: Partial<ConsumeResult> = {}): ConsumeResult {
    return {
      allowed: false,
      remaining: 0,
      limit: 10,
      secondsUntilFull: 5,
      retryAfterSeconds: 3,
      resetEpochSeconds: 1_700_000_005,
      ...overrides,
    };
  }

  it('composes a 200 welcome response with rate-limit headers', () => {
    const decision = allowedDecision();
    const response = composer.compose(decision);

    expect(response.status).toBe(200);
    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '9',
      'X-RateLimit-Reset': '1700000001',
    });
    expect(response.body).toBe('{"message":"Welcome to the rate-limited endpoint!"}');
  });

  it('composes a 429 response with error body, Retry-After and rate-limit headers', () => {
    const decision = deniedDecision();
    const response = composer.compose(decision);

    expect(response.status).toBe(429);
    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1700000005',
      'Retry-After': '3',
    });
    expect(response.body).toBe(
      '{"error":"Too Many Requests","retry_after_seconds":3}',
    );
  });

  it('does not allocate a new JSON object on the 429 hot path', () => {
    // The implementation concatenates pre-allocated string segments, so the
    // body should be a string concatenation rather than JSON.stringify output.
    const decision = deniedDecision({ retryAfterSeconds: 7 });
    const response = composer.compose(decision);
    expect(response.body).toBe(
      '{"error":"Too Many Requests","retry_after_seconds":7}',
    );
  });

  it('exposes the same interface through a fresh composer instance', () => {
    const fresh = createResponseComposer();
    const response = fresh.compose(allowedDecision({ remaining: 7 }));
    expect(response.status).toBe(200);
    expect(response.headers['X-RateLimit-Remaining']).toBe('7');
  });
});
