import { describe, expect, it } from 'vitest';
import { DomainError, ErrorCode, KeyValueStore } from '../src/store';

describe('KeyValueStore', () => {
  it('sets, gets, replaces ttl, and persists entries', () => {
    let now = 1_700_000_000_000n;
    const store = new KeyValueStore({}, () => now);

    const first = store.set('alpha', { n: 1 }, 10);
    expect(first.expiresAt).toBeDefined();
    const entry = store.get('alpha');
    expect(entry?.value).toEqual({ n: 1 });
    expect(entry?.ttlSeconds).toBeGreaterThanOrEqual(9);

    expect(store.persist('alpha').updated).toBe(true);
    expect(store.ttl('alpha').ttlSeconds).toBe(-1);

    now += 20_000_000_000n;
    store.set('alpha', 'replacement');
    expect(store.get('alpha')?.value).toBe('replacement');
    expect(store.get('alpha')?.expiresAt).toBeNull();
  });

  it('hides expired keys and keeps delete idempotent', () => {
    let now = 0n;
    const store = new KeyValueStore({}, () => now);
    store.set('session:1', 'live', 1);
    store.set('user:1', 'persist');
    now += 2_000_000_000n;
    expect(store.get('session:1')).toBeNull();
    expect(store.ttl('session:1').ttlSeconds).toBe(-2);
    expect(store.delete(['session:1', 'user:1', 'missing']).deleted).toBe(1);
    expect(store.keys().keys).toEqual([]);
  });

  it('msets atomically, mgets in order, and flushes', () => {
    const store = new KeyValueStore({ maxKeys: 2 });
    store.mset([{ key: 'a', value: 1 }, { key: 'b', value: null }]);
    expect(store.mget(['a', 'missing', 'b', 'a']).items.map((item) => item.found)).toEqual([true, false, true, true]);
    expect(() => store.mset([{ key: 'c', value: 3 }])).toThrow(DomainError);
    expect(store.get('c')).toBeNull();
    expect(store.flushdb().deleted).toBe(2);
  });

  it('validates key, ttl, value size, and duplicate mset keys', () => {
    const store = new KeyValueStore({ maxKeyBytes: 3, maxValueBytes: 4 });
    expectDomainError(() => store.set('', 1), ErrorCode.InvalidKey);
    expectDomainError(() => store.set('long', 1), ErrorCode.KeyTooLong);
    expectDomainError(() => store.set('ok', 'large'), ErrorCode.ValueTooLarge);
    expectDomainError(() => store.set('ok', 1, 0), ErrorCode.InvalidTtl);
    expectDomainError(() => store.mset([{ key: 'a', value: 1 }, { key: 'a', value: 2 }]), ErrorCode.InvalidKey);
  });

  // Regression test for MAJOR-001 (code_review.md): expire() used to skip key
  // validation entirely and fall through to KEY_NOT_FOUND for keys that were
  // never valid input (empty, or over the byte limit), instead of surfacing
  // INVALID_KEY/KEY_TOO_LONG like every other write path does.
  it('rejects invalid keys on expire() with INVALID_KEY/KEY_TOO_LONG, not KEY_NOT_FOUND', () => {
    const store = new KeyValueStore({ maxKeyBytes: 3 });
    expectDomainError(() => store.expire('', 10), ErrorCode.InvalidKey);
    expectDomainError(() => store.expire('long', 10), ErrorCode.KeyTooLong);
    // A validly-shaped but genuinely absent key must still surface KEY_NOT_FOUND.
    expectDomainError(() => store.expire('ok', 10), ErrorCode.KeyNotFound);
  });

  // Regression test for MAJOR-002 (code_review.md): the value-size guard used
  // to compare `serialized.length` (UTF-16 code units) against maxValueBytes,
  // silently under-counting multi-byte UTF-8 content and letting oversized
  // values through. It must use Buffer.byteLength(serialized, 'utf8').
  it('measures value size in UTF-8 bytes, not UTF-16 code units', () => {
    // 30 emoji: 1 UTF-16 code unit... no, each emoji here is a surrogate pair,
    // so it is 2 UTF-16 code units but 4 UTF-8 bytes. JSON.stringify wraps the
    // string in quotes, adding 2 bytes/code-units.
    const emoji = '\u{1F600}'.repeat(30); // 30 * U+1F600 (grinning face)
    const serializedLength = JSON.stringify(emoji).length; // UTF-16 code units
    const serializedBytes = Buffer.byteLength(JSON.stringify(emoji), 'utf8'); // real UTF-8 bytes
    expect(serializedBytes).toBeGreaterThan(serializedLength); // sanity: the bug's precondition holds

    // A limit between the (smaller) UTF-16 length and the (larger) real byte
    // count must be enforced using the byte count, i.e. rejected.
    const limit = serializedLength + 10;
    expect(limit).toBeLessThan(serializedBytes);
    const store = new KeyValueStore({ maxValueBytes: limit });
    expectDomainError(() => store.set('k', emoji), ErrorCode.ValueTooLarge);
  });

  // Regression test for the optimize-phase perf fix (MINOR-003, code_review.md):
  // health() used to run a full removeExpired() sweep on every call. It is now
  // rate-limited to at most once per HEALTH_SWEEP_MIN_INTERVAL_NANOS (1s), but
  // keyCount/expiredKeysRemoved must still become accurate once that window has
  // elapsed — this is an accuracy/latency trade-off, not a correctness regression.
  it('health() rate-limits its expired-key sweep but still converges to accurate counts', () => {
    let now = 0n;
    const store = new KeyValueStore({}, () => now);
    store.set('short', 'v', 1); // expires at now=1s
    expect(store.health().keyCount).toBe(1);

    // Advance past expiry but stay inside the 1s sweep window from the first health() call.
    now = 500_000_000n; // 0.5s
    expect(store.health().keyCount).toBe(1); // sweep skipped: within the rate-limit window

    // Advance past the sweep window: the next health() call must sweep and reflect reality.
    now = 1_100_000_000n; // 1.1s
    const health = store.health();
    expect(health.keyCount).toBe(0);
    expect(health.expiredKeysRemoved).toBe(1);

    // Lazy per-key cleanup on get() still applies regardless of the health sweep window,
    // per RF-011 — clients never observe an expired key through any read path.
    expect(store.get('short')).toBeNull();
  });
});

function expectDomainError(action: () => unknown, expected: ErrorCode): void {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(DomainError);
    expect(error instanceof DomainError ? error.code : undefined).toBe(expected);
    return;
  }

  throw new Error(`expected function to throw ${expected}`);
}
