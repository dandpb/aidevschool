import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/server';
import { DomainError, ErrorCode, KeyValueStore } from '../src/store';

// Mutation-hardening suite. Each test pins an observable behavior that a
// surviving Stryker mutant would break (boundary conditions, exact limits,
// atomicity, HTTP validation envelopes). The goal is a real mutation-score
// lift for the U2 gate, not line coverage for its own sake.

describe('KeyValueStore mutation hardening', () => {
  it('enforces the maximum TTL boundary at exactly 2592000 seconds', () => {
    const store = new KeyValueStore();
    // At the documented max (30 * 24 * 60 * 60): allowed.
    expect(store.set('k', 'v', 2592000).expiresAt).toBeDefined();
    // One second over the max: rejected.
    expectDomainError(() => store.set('k2', 'v', 2592001), ErrorCode.InvalidTtl);
  });

  it('treats a key as expired at the exact expiry instant', () => {
    let now = 0n;
    const store = new KeyValueStore({}, () => now);
    store.set('k', 'v', 10); // expires at exactly 10_000_000_000n
    now = 10_000_000_000n; // land exactly on the deadline
    // expiresAtNanos <= now must classify the key as expired (lazy cleanup).
    expect(store.get('k')).toBeNull();
    expect(store.ttl('k').ttlSeconds).toBe(-2);
  });

  it('allows overwriting an existing key at the key limit but rejects a new key', () => {
    const store = new KeyValueStore({ maxKeys: 1 });
    store.set('a', 1);
    // Overwrite of an existing key must not trip the "store full" guard.
    expect(store.set('a', 2).stored).toBe(true);
    expect(store.get('a')?.value).toBe(2);
    // A brand-new key when at the limit is rejected.
    expectDomainError(() => store.set('b', 3), ErrorCode.StoreFull);
  });

  it('reclaims memory when overwriting a larger value with a smaller one', () => {
    const store = new KeyValueStore();
    store.set('k', 'x'.repeat(100));
    const big = store.health().approxMemoryBytes;
    store.set('k', 'x');
    const small = store.health().approxMemoryBytes;
    expect(small).toBeLessThan(big);
  });

  it('subtracts replaced bytes when checking the memory limit on overwrite', () => {
    const store = new KeyValueStore({ maxMemoryBytes: 120 });
    store.set('k', 'aaaaaaaaaa'); // approx 1 + 12 + 64 = 77 bytes
    // Fits only because the old 77 bytes are subtracted: 77 + 79 - 77 = 79 <= 120.
    expect(store.set('k', 'cccccccccccc').stored).toBe(true);
  });

  it('mset over existing keys does not count them toward the key limit', () => {
    const store = new KeyValueStore({ maxKeys: 2 });
    store.mset([{ key: 'a', value: 1 }, { key: 'b', value: 2 }]);
    // Re-writing both existing keys while at the limit must succeed.
    expect(store.mset([{ key: 'a', value: 10 }, { key: 'b', value: 20 }]).stored).toBe(2);
    expect(store.get('a')?.value).toBe(10);
  });

  it('mset rolls back entirely when the batch exceeds the memory limit', () => {
    const store = new KeyValueStore({ maxMemoryBytes: 150 });
    expectDomainError(
      () => store.mset([{ key: 'a', value: 'x'.repeat(50) }, { key: 'b', value: 'y'.repeat(50) }]),
      ErrorCode.MemoryLimitExceeded
    );
    // Atomicity: nothing from the rejected batch may be visible.
    expect(store.get('a')).toBeNull();
    expect(store.get('b')).toBeNull();
  });

  it('reports ttl -2 for missing, -1 for no-expiry, and a positive value for a live ttl', () => {
    const now = 0n;
    const store = new KeyValueStore({}, () => now);
    store.set('live', 'v', 100);
    store.set('perm', 'v');
    expect(store.ttl('missing').ttlSeconds).toBe(-2);
    expect(store.ttl('perm').ttlSeconds).toBe(-1);
    const live = store.ttl('live').ttlSeconds;
    expect(live).toBeGreaterThan(0);
    expect(live).toBeLessThanOrEqual(100);
  });

  it('persist returns updated:false for a key that has no expiry', () => {
    const store = new KeyValueStore();
    store.set('k', 'v'); // no ttl
    expect(store.persist('k').updated).toBe(false);
  });

  it('keys returns sorted results capped by the limit', () => {
    const store = new KeyValueStore();
    store.set('b', 1);
    store.set('a', 1);
    store.set('c', 1);
    expect(store.keys().keys).toEqual(['a', 'b', 'c']);
    expect(store.keys('', 2).keys).toEqual(['a', 'b']);
    expect(store.keys('', 2).count).toBe(2);
  });

  it('get and mget return copies so callers cannot mutate stored state', () => {
    const store = new KeyValueStore();
    store.set('k', { nested: { n: 1 } });
    const single = store.get('k');
    (single?.value as { nested: { n: number } }).nested.n = 42;
    expect((store.get('k')?.value as { nested: { n: number } }).nested.n).toBe(1);

    const item = store.mget(['k']).items[0];
    (item.value as { nested: { n: number } }).nested.n = 999;
    expect((store.get('k')?.value as { nested: { n: number } }).nested.n).toBe(1);
  });

  it('health reports keyCount, memory, and processed commands', () => {
    const store = new KeyValueStore();
    store.set('a', 1);
    store.set('b', 2);
    store.get('a');
    const health = store.health();
    expect(health.status).toBe('ok');
    expect(health.keyCount).toBe(2);
    expect(health.commandsProcessed).toBeGreaterThanOrEqual(3);
    expect(health.approxMemoryBytes).toBeGreaterThan(0);
  });
});

describe('HTTP API mutation hardening', () => {
  it('rejects a set body without a value field', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).put('/v1/kv/k').send({}).expect(400).expect(({ body }) => {
      expect(body.error.code).toBe('INVALID_JSON');
    });
  });

  it('rejects a top-level array body', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).put('/v1/kv/k').send([1, 2, 3]).expect(400).expect(({ body }) => {
      expect(body.error.code).toBe('INVALID_JSON');
    });
  });

  it('rejects non-integer ttlSeconds', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).put('/v1/kv/k').send({ value: 1, ttlSeconds: 'abc' }).expect(400);
    await request(app).put('/v1/kv/k').send({ value: 1, ttlSeconds: 1.5 }).expect(400);
  });

  it('validates mget keys is an array of strings', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).post('/v1/mget').send({ keys: 'not-an-array' }).expect(400);
    await request(app).post('/v1/mget').send({ keys: [1, 2] }).expect(400);
  });

  it('validates mset item shape', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).post('/v1/mset').send({ items: 'nope' }).expect(400);
    await request(app).post('/v1/mset').send({ items: [{ key: 5, value: 1 }] }).expect(400);
    await request(app).post('/v1/mset').send({ items: [{ value: 1 }] }).expect(400);
  });

  it('validates the keys limit range', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).get('/v1/keys?limit=-1').expect(400).expect(({ body }) => {
      expect(body.error.code).toBe('INVALID_LIMIT');
    });
    await request(app).get('/v1/keys?limit=10001').expect(400);
    await request(app).get('/v1/keys?limit=abc').expect(400);
    await request(app).get('/v1/keys?limit=0').expect(200);
  });

  it('rejects an over-long keys prefix', async () => {
    const app = buildApp(new KeyValueStore());
    const longPrefix = 'x'.repeat(513);
    await request(app).get(`/v1/keys?prefix=${longPrefix}`).expect(400).expect(({ body }) => {
      expect(body.error.code).toBe('KEY_TOO_LONG');
    });
  });

  it('maps domain errors to the correct HTTP statuses', async () => {
    const app = buildApp(new KeyValueStore({ maxKeys: 0, maxValueBytes: 4 }));
    await request(app).get('/v1/kv/missing').expect(404); // KeyNotFound
    await request(app).put('/v1/kv/k').send({ value: 'toolong' }).expect(413); // ValueTooLarge
    await request(app).put('/v1/kv/k').send({ value: 1 }).expect(507); // StoreFull
  });

  it('returns INVALID_COMMAND for unsupported routes', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).get('/nope').expect(400).expect(({ body }) => {
      expect(body.error.code).toBe('INVALID_COMMAND');
    });
  });

  it('exposes delete, ttl, and persist over HTTP', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).put('/v1/kv/k').send({ value: 1, ttlSeconds: 100 }).expect(200);
    await request(app).get('/v1/kv/k/ttl').expect(200).expect(({ body }) => {
      expect(body.data.ttlSeconds).toBeGreaterThan(0);
    });
    await request(app).post('/v1/kv/k/persist').expect(200).expect(({ body }) => {
      expect(body.data.updated).toBe(true);
    });
    await request(app).delete('/v1/kv/k').expect(200).expect(({ body }) => {
      expect(body.data.deleted).toBe(1);
    });
  });

  it('round-trips mset and mget over HTTP', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).post('/v1/mset').send({ items: [{ key: 'a', value: 1 }, { key: 'b', value: 2 }] }).expect(200);
    await request(app).post('/v1/mget').send({ keys: ['a', 'b'] }).expect(200).expect(({ body }) => {
      expect(body.data.items.map((item: { found: boolean }) => item.found)).toEqual([true, true]);
    });
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
