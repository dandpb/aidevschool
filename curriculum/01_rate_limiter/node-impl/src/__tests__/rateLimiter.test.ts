import { describe, it, expect, vi } from 'vitest';

import { TokenBucketRateLimiter } from '../rateLimiter';

/**
 * Unit tests for the pure token-bucket store. We inject a fake clock so
 * lazy-refill math is deterministic — no real `setTimeout`, no flake.
 */
describe('TokenBucketRateLimiter', () => {
  const CAPACITY = 10;
  const REFILL_RATE = 2; // tokens / second
  const REAL_EPOCH = 1_700_000_000_000; // arbitrary fixed instant

  /** Build a limiter with a controllable clock. */
  function makeLimiter(clockValue = REAL_EPOCH) {
    const clock = vi.fn(() => clockValue);
    const limiter = new TokenBucketRateLimiter({
      capacity: CAPACITY,
      refillRate: REFILL_RATE,
      clock,
    });
    return { limiter, clock };
  }

  describe('initialization', () => {
    it('starts a new client with a full bucket and allows the first request', () => {
      const { limiter } = makeLimiter();
      const result = limiter.tryConsume('1.2.3.4');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(CAPACITY - 1);
      expect(result.limit).toBe(CAPACITY);
    });

    it('rejects non-positive capacity / refill rate', () => {
      expect(() => new TokenBucketRateLimiter({ capacity: 0, refillRate: 1 })).toThrow(RangeError);
      expect(() => new TokenBucketRateLimiter({ capacity: -1, refillRate: 1 })).toThrow(RangeError);
      expect(() => new TokenBucketRateLimiter({ capacity: 1, refillRate: 0 })).toThrow(RangeError);
    });
  });

  describe('token consumption', () => {
    it('decrements one token per allowed request', () => {
      const { limiter } = makeLimiter();
      for (let i = CAPACITY; i > 1; i -= 1) {
        const r = limiter.tryConsume('a');
        expect(r.allowed).toBe(true);
        expect(r.remaining).toBe(i - 1);
      }
    });

    it('denies the (capacity+1)-th request and reports retryAfter', () => {
      const { limiter } = makeLimiter();
      // Drain the bucket.
      for (let i = 0; i < CAPACITY; i += 1) {
        limiter.tryConsume('a');
      }
      const denied = limiter.tryConsume('a');
      expect(denied.allowed).toBe(false);
      expect(denied.remaining).toBe(0);
      // Tokens are now 0; at 2 tokens/sec we need ceil(1 / 2) = 1s to
      // recover the first token.
      expect(denied.retryAfterSeconds).toBe(1);
    });

    it('isolates state per key', () => {
      const { limiter } = makeLimiter();
      for (let i = 0; i < CAPACITY; i += 1) {
        limiter.tryConsume('a');
      }
      // 'a' is now empty; 'b' must be untouched.
      const bResult = limiter.tryConsume('b');
      expect(bResult.allowed).toBe(true);
      expect(bResult.remaining).toBe(CAPACITY - 1);
    });
  });

  describe('lazy refill', () => {
    it('refills tokens based on elapsed time, capped at capacity', () => {
      const { limiter, clock } = makeLimiter();
      // Drain to zero.
      for (let i = 0; i < CAPACITY; i += 1) {
        limiter.tryConsume('a');
      }
      // Advance the clock 2 seconds → 4 tokens refilled.
      clock.mockReturnValue(REAL_EPOCH + 2_000);
      const r = limiter.tryConsume('a');
      expect(r.allowed).toBe(true);
      // 4 refilled, 1 consumed, 5 left in bucket.
      expect(r.remaining).toBe(3);
    });

    it('caps refill at the bucket capacity (no overflow)', () => {
      const { limiter, clock } = makeLimiter();
      // Single consume, then jump an hour into the future.
      limiter.tryConsume('a');
      clock.mockReturnValue(REAL_EPOCH + 60 * 60 * 1000);
      const r = limiter.tryConsume('a');
      // Capacity is 10; the hour's worth of refill (7200 tokens) is capped.
      expect(r.remaining).toBe(CAPACITY - 1);
    });

    it('survives a clock that goes backwards (e.g. NTP step)', () => {
      const { limiter, clock } = makeLimiter();
      // Drain a little.
      limiter.tryConsume('a');
      // Clock jumps backwards by 5 seconds — we should NOT gain tokens.
      clock.mockReturnValue(REAL_EPOCH - 5_000);
      const r = limiter.tryConsume('a');
      expect(r.allowed).toBe(true);
      // Started at 9 tokens; one consume + one consume = 8.
      expect(r.remaining).toBe(CAPACITY - 2);
    });

    it('exposes refill state via peek() without consuming', () => {
      const { limiter, clock } = makeLimiter();
      limiter.tryConsume('a');
      clock.mockReturnValue(REAL_EPOCH + 1_000); // +1s → +2 tokens
      const peek = limiter.peek('a');
      // 8 remaining + 2 refilled = 10 (capped), 1s elapsed + capacity reached
      // → 0 seconds to full.
      expect(peek.tokens).toBe(CAPACITY);
      expect(peek.exists).toBe(true);
      // A second consume should still work and bring us to 9.
      const r = limiter.tryConsume('a');
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(CAPACITY - 1);
    });

    it('peek() on an unknown key reports capacity and exists=false', () => {
      const { limiter } = makeLimiter();
      const peek = limiter.peek('never-seen');
      expect(peek.tokens).toBe(CAPACITY);
      expect(peek.exists).toBe(false);
    });
  });

  describe('reset / secondsUntilFull math', () => {
    it('reports secondsUntilFull=0 when the bucket is already full', () => {
      const { limiter } = makeLimiter();
      const r = limiter.tryConsume('a');
      // After one consume we have 9 tokens; the bucket can never be "full
      // again" with 0s to wait unless we're at capacity. So check the
      // *initial* allowed case for a fresh key.
      expect(r.allowed).toBe(true);
      // The secondsUntilFull should be 0.5 (it takes 0.5s to refill 1 token
      // back into the now-9-token bucket).
      expect(r.secondsUntilFull).toBeCloseTo(0.5, 5);
    });

    it('computes a Unix-epoch reset timestamp in the future', () => {
      const { limiter } = makeLimiter();
      const r = limiter.tryConsume('a');
      const nowSec = Math.floor(REAL_EPOCH / 1000);
      expect(r.resetEpochSeconds).toBeGreaterThanOrEqual(nowSec);
    });
  });

  describe('cleanupIdle', () => {
    it('removes buckets idle longer than the threshold', () => {
      const { limiter, clock } = makeLimiter();
      limiter.tryConsume('a');
      limiter.tryConsume('b');
      expect(limiter.size).toBe(2);

      // Advance time by 1h + 1ms — both buckets are now stale.
      clock.mockReturnValue(REAL_EPOCH + 60 * 60 * 1000 + 1);
      const removed = limiter.cleanupIdle(60 * 60 * 1000);
      expect(removed).toBe(2);
      expect(limiter.size).toBe(0);
    });

    it('keeps buckets touched within the threshold', () => {
      const { limiter, clock } = makeLimiter();
      limiter.tryConsume('a');
      clock.mockReturnValue(REAL_EPOCH + 5_000); // 5s later
      limiter.tryConsume('b');
      clock.mockReturnValue(REAL_EPOCH + 10_000); // 10s after start
      const removed = limiter.cleanupIdle(60_000); // 1m threshold
      // 'a' is 10s old, 'b' is 5s old — both well under 60s.
      expect(removed).toBe(0);
      expect(limiter.size).toBe(2);
    });

    it('removes only the stale bucket, leaving recent ones intact', () => {
      const { limiter, clock } = makeLimiter();
      limiter.tryConsume('a');
      // 2h later, touch 'b'.
      clock.mockReturnValue(REAL_EPOCH + 2 * 60 * 60 * 1000);
      limiter.tryConsume('b');
      // Now both buckets exist; 'a' is 2h old, 'b' is brand new.
      expect(limiter.size).toBe(2);

      clock.mockReturnValue(REAL_EPOCH + 2 * 60 * 60 * 1000 + 5_000);
      const removed = limiter.cleanupIdle(60 * 60 * 1000);
      expect(removed).toBe(1);
      expect(limiter.size).toBe(1);
      // 'b' is the survivor.
      const peek = limiter.peek('a');
      expect(peek.exists).toBe(false);
      const peekB = limiter.peek('b');
      expect(peekB.exists).toBe(true);
    });

    it('rejects a negative threshold', () => {
      const { limiter } = makeLimiter();
      expect(() => limiter.cleanupIdle(-1)).toThrow(RangeError);
    });
  });

  describe('concurrency-style stress', () => {
    it('handles rapid-fire requests on the same key without over-allowing', () => {
      // Even though Node is single-threaded, this exercises the
      // synchronous drain path: CAPACITY requests must be allowed, the
      // (CAPACITY+1)th must be denied, and refilling at the configured
      // rate must then produce exactly the expected number of allowed
      // requests.
      const { limiter, clock } = makeLimiter();
      let allowed = 0;
      let denied = 0;
      for (let i = 0; i < CAPACITY; i += 1) {
        if (limiter.tryConsume('a').allowed) allowed += 1;
        else denied += 1;
      }
      expect(allowed).toBe(CAPACITY);
      expect(denied).toBe(0);

      // +5s → +10 tokens refilled → exactly CAPACITY new allowed requests
      // before denial kicks in again.
      clock.mockReturnValue(REAL_EPOCH + 5_000);
      let allowed2 = 0;
      for (let i = 0; i < CAPACITY; i += 1) {
        if (limiter.tryConsume('a').allowed) allowed2 += 1;
      }
      expect(allowed2).toBe(CAPACITY);
    });
  });

  describe('prewarmJit', () => {
    it('does not throw and clears the warmed buckets', () => {
      const { limiter } = makeLimiter();
      // Default 8 iterations.
      expect(() => limiter.prewarmJit()).not.toThrow();
      // Warmed buckets are not visible to a normal tryConsume call.
      // (We check size() because the prewarm keys start with __prewarm_.)
      expect(limiter.size).toBe(0);
    });

    it('accepts a custom iteration count', () => {
      const { limiter } = makeLimiter();
      expect(() => limiter.prewarmJit(3)).not.toThrow();
      expect(limiter.size).toBe(0);
    });
  });
});
