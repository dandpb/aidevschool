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
