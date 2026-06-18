import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Cache, CacheError, Config, EvictionPolicy, HashRing, HttpApp, Invalidation, MemoryStore, NodeInfo } from './cache.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('distributed cache node implementation', () => {
  it('sets, gets, deletes, expires, and invalidates entries', async () => {
    const cache = new Cache(new Config('node-a').withCapacityEntries(10).withMaxValueBytes(64).withDefaultTtlMs(60_000));
    const set = await cache.set('users:1', 'Ada', { namespace: 'users', ttlMs: 25 });
    assert.equal(set.stored, true);
    assert.equal(set.version, 1);
    const hit = await cache.get('users:1');
    assert.equal(hit.hit, true);
    assert.equal(hit.value, 'Ada');
    assert.ok(hit.ttlRemainingMs > 0);
    await sleep(35);
    assert.equal((await cache.get('users:1')).hit, false);
    assert.equal(cache.metrics().expirations, 1);

    await cache.set('users:2', 'Grace', { namespace: 'users' });
    assert.equal(await cache.invalidate(Invalidation.namespace('users')), 1);
    assert.equal((await cache.get('users:2')).hit, false);
    assert.equal((await cache.delete('users:2')).deleted, false);
  });

  it('supports LRU and LFU eviction policies', async () => {
    const lru = new Cache(new Config('node-a').withCapacityEntries(2).withEvictionPolicy(EvictionPolicy.Lru));
    await lru.set('a', '1');
    await lru.set('b', '2');
    await lru.get('a');
    await lru.set('c', '3');
    assert.equal((await lru.get('b')).hit, false);

    const lfu = new Cache(new Config('node-a').withCapacityEntries(2).withEvictionPolicy(EvictionPolicy.Lfu));
    await lfu.set('a', '1');
    await lfu.set('b', '2');
    await lfu.get('a');
    await lfu.get('a');
    await lfu.set('c', '3');
    assert.equal((await lfu.get('b')).hit, false);
    assert.equal(lfu.metrics().evictions, 1);
  });

  it('uses consistent hashing with virtual nodes and bounded remapping', () => {
    const ring = new HashRing([new NodeInfo('a'), new NodeInfo('b'), new NodeInfo('c')], 64);
    const before = new Map(Array.from({ length: 500 }, (_, i) => [`key-${i}`, ring.owner(`key-${i}`).id]));
    ring.add(new NodeInfo('d'));
    const remapped = [...before].filter(([key, owner]) => ring.owner(key).id !== owner).length;
    assert.ok(remapped > 0 && remapped < 250, `remapped ${remapped}`);
    assert.equal(ring.tokensFor('a').length, 64);
  });

  it('coalesces cache-aside loads and handles write-through failures', async () => {
    const store = new MemoryStore(new Map([['hot', 'loaded']]));
    let loads = 0;
    const cache = new Cache(
      new Config('node-a')
        .withCapacityEntries(5)
        .withMaxValueBytes(8)
        .withLoader(async (key) => {
          loads += 1;
          await sleep(20);
          return store.load(key);
        })
        .withWriter((key, value) => store.write(key, value)),
    );
    const results = await Promise.all(Array.from({ length: 8 }, () => cache.get('hot', { loadOnMiss: true })));
    assert.equal(loads, 1);
    assert.ok(results.every((result) => result.loaded && result.value === 'loaded'));
    assert.ok(results.some((result) => result.coalesced));
    assert.equal(cache.metrics().loaderCalls, 1);
    assert.ok(cache.metrics().singleflightCoalesces > 0);

    await assert.rejects(cache.set('too-big', 'this is too large'), CacheError);
    store.failWrites(true);
    await assert.rejects(cache.set('w', 'ok', { writeThrough: true }), CacheError);
  });

  it('serves HTTP health, metrics, cache routes, and shutdown', async () => {
    const cache = new Cache(new Config('node-a').withCapacityEntries(10).withMaxValueBytes(64));
    const app = new HttpApp(cache);
    const put = await app.handle('PUT', '/cache/hello', JSON.stringify({ value: 'world', ttlMs: 60_000, namespace: 'demo' }));
    assert.equal(put.status, 201);
    const get = await app.handle('GET', '/cache/hello');
    assert.equal(get.status, 200);
    assert.match(get.body, /"hit":true/);
    assert.match((await app.handle('GET', '/health')).body, /"status":"ok"/);
    assert.match((await app.handle('GET', '/metrics')).body, /hits/);
    await cache.shutdown();
    assert.equal(cache.isShutdown(), true);
  });
});

after(() => undefined);
