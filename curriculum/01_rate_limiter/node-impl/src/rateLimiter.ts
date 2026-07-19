import type { Logger } from './logger';

/**
 * A monotonic clock in milliseconds. We accept a function rather than a
 * `Date` getter because:
 *  - tests can inject a fake clock to drive lazy-refill math deterministically
 *    without resorting to real `setTimeout` waits;
 *  - the production clock (`Date.now`) is already a function, so the cost
 *    of the wrapper is zero.
 */
export type Clock = () => number;

/** State we keep per client. */
export interface ClientBucket {
  /** Current token count (fractional allowed — refill is continuous). */
  tokens: number;
  /** Wall-clock millisecond timestamp of the last refill calculation. */
  lastRefillMs: number;
}

export interface RateLimiterOptions {
  /** Bucket capacity (max tokens). Must be > 0. */
  readonly capacity: number;
  /** Tokens added per second. Must be > 0. */
  readonly refillRate: number;
  /** Wall-clock millisecond provider. Defaults to `Date.now`. */
  readonly clock?: Clock;
  /** Logger for diagnostics. Optional so unit tests can stay silent. */
  readonly logger?: Logger;
}

/** Public, pure-TS surface — no Express, no I/O. */
export interface ConsumeResult {
  /** True iff the caller may proceed. */
  readonly allowed: boolean;
  /** Integer tokens remaining after the refill (and possible decrement). */
  readonly remaining: number;
  /** `X-RateLimit-Limit` value (the capacity). */
  readonly limit: number;
  /** Seconds until the bucket is completely full (float). */
  readonly secondsUntilFull: number;
  /** Seconds the caller must wait before another token is available (float). */
  readonly retryAfterSeconds: number;
  /** Unix epoch seconds at which the bucket will be full. */
  readonly resetEpochSeconds: number;
}

/** Peek the bucket for a key without consuming a token. */
export interface PeekResult {
  readonly key: string;
  readonly tokens: number;
  readonly exists: boolean;
}

/**
 * In-memory token-bucket rate limiter.
 *
 * This class is intentionally framework-agnostic: it knows nothing about
 * HTTP, Express, or sockets. That makes it cheap to unit-test and easy to
 * reuse from, e.g., a WebSocket layer.
 *
 * Concurrency: Node.js executes JavaScript on a single thread, so a plain
 * `Map` is safe to read/write without locks as long as the operations are
 * synchronous. All methods on this class are synchronous.
 */
export class TokenBucketRateLimiter {
  readonly #capacity: number;
  readonly #refillRate: number;
  readonly #clock: Clock;
  readonly #buckets = new Map<string, ClientBucket>();
  readonly #logger: Logger | undefined;

  constructor(opts: RateLimiterOptions) {
    if (!(opts.capacity > 0)) {
      throw new RangeError('capacity must be a positive number');
    }
    if (!(opts.refillRate > 0)) {
      throw new RangeError('refillRate must be a positive number');
    }
    this.#capacity = opts.capacity;
    this.#refillRate = opts.refillRate;
    this.#clock = opts.clock ?? Date.now;
    this.#logger = opts.logger;
  }

  /** Configuration getters — useful for `/status`. */
  get capacity(): number {
    return this.#capacity;
  }

  get refillRate(): number {
    return this.#refillRate;
  }

  /** Number of tracked clients. Mostly useful for tests and diagnostics. */
  get size(): number {
    return this.#buckets.size;
  }

  /**
   * Attempt to consume one token for the given key.
   *
   * Performs the lazy refill inline: the bucket's `lastRefillMs` is
   * advanced to "now" and the token count is bumped by `elapsed * rate`,
   * capped at `capacity`. The caller is then either allowed (token
   * decremented) or denied.
   */
  tryConsume(key: string): ConsumeResult {
    const now = this.#clock();
    let bucket = this.#buckets.get(key);

    if (bucket === undefined) {
      // First request from this client: start with a full bucket.
      bucket = { tokens: this.#capacity, lastRefillMs: now };
      this.#buckets.set(key, bucket);
    } else {
      const elapsedMs = Math.max(0, now - bucket.lastRefillMs);
      const refilled = (elapsedMs / 1000) * this.#refillRate;
      // `Math.min` so we never overflow the bucket; `Math.max(0, …)` defends
      // against a non-monotonic clock that goes backwards.
      const next = Math.min(this.#capacity, Math.max(0, bucket.tokens + refilled));
      bucket.tokens = next;
      bucket.lastRefillMs = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return this.#resultFor(bucket, now, true);
    }
    return this.#resultFor(bucket, now, false);
  }

  /**
   * Read the current (refilled) token count for a key without consuming.
   * Used by `/status`.
   */
  peek(key: string): PeekResult {
    const now = this.#clock();
    const bucket = this.#buckets.get(key);
    if (bucket === undefined) {
      return { key, tokens: this.#capacity, exists: false };
    }
    const elapsedMs = Math.max(0, now - bucket.lastRefillMs);
    const refilled = (elapsedMs / 1000) * this.#refillRate;
    const tokens = Math.min(this.#capacity, Math.max(0, bucket.tokens + refilled));
    return { key, tokens, exists: true };
  }

  /**
   * Remove buckets that have not been touched in `maxIdleMs`.
   * Returns the number of buckets evicted. Safe to call on a schedule.
   */
  cleanupIdle(maxIdleMs: number, now: number = this.#clock()): number {
    if (!(maxIdleMs >= 0)) {
      throw new RangeError('maxIdleMs must be >= 0');
    }
    let removed = 0;
    for (const [key, bucket] of this.#buckets) {
      if (now - bucket.lastRefillMs > maxIdleMs) {
        this.#buckets.delete(key);
        removed += 1;
      }
    }
    if (removed > 0) {
      this.#logger?.info({ removed, remaining: this.#buckets.size }, 'evicted idle buckets');
    }
    return removed;
  }

  /** Test-only: drop all state. */
  reset(): void {
    this.#buckets.clear();
  }

  /**
   * Warm V8's JIT for the `tryConsume` hot path by running N dummy calls
   * against a throwaway key. Cheap (no I/O, no allocations past the first
   * call) and runs synchronously before `app.listen()`. Without this, the
   * first 5–20 real requests under spike load trigger repeated JIT
   * recompilations of `tryConsume`, which is the leading hypothesis for
   * the Node spike p99 being 2× Go/Rust.
   *
   * Idempotent: clears the warmed bucket before returning.
   */
  prewarmJit(iterations: number = 8): void {
    for (let i = 0; i < iterations; i += 1) {
      this.tryConsume(`__prewarm_${i}__`);
    }
    for (let i = 0; i < iterations; i += 1) {
      this.#buckets.delete(`__prewarm_${i}__`);
    }
  }

  #resultFor(bucket: ClientBucket, now: number, allowed: boolean): ConsumeResult {
    const remainingFloat = Math.max(0, bucket.tokens);
    const remaining = Math.floor(remainingFloat);
    const secondsUntilFull =
      bucket.tokens >= this.#capacity ? 0 : (this.#capacity - bucket.tokens) / this.#refillRate;
    const resetEpochSeconds = Math.ceil(now / 1000 + secondsUntilFull);

    // Retry-After is the time until at least one token is available.
    // We round up so the client never retries one tick too early.
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(1, Math.ceil((1 - bucket.tokens) / this.#refillRate));

    return {
      allowed,
      remaining,
      limit: this.#capacity,
      secondsUntilFull,
      retryAfterSeconds,
      resetEpochSeconds,
    };
  }
}
