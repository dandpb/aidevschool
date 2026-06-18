import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/server';
import { KeyValueStore } from '../src/store';

describe('HTTP API', () => {
  it('supports set, get, mget, keys, and health envelopes', async () => {
    const app = buildApp(new KeyValueStore());

    await request(app).put('/v1/kv/name').send({ value: { ok: true }, ttlSeconds: 5 }).expect(200).expect(({ body }) => {
      expect(body.ok).toBe(true);
      expect(body.data.stored).toBe(true);
    });

    await request(app).get('/v1/kv/name').expect(200).expect(({ body }) => {
      expect(body.data.value).toEqual({ ok: true });
    });

    await request(app).post('/v1/mget').send({ keys: ['name', 'missing', 'name'] }).expect(200).expect(({ body }) => {
      expect(body.data.items.map((item: { found: boolean }) => item.found)).toEqual([true, false, true]);
    });

    await request(app).get('/v1/keys?prefix=na').expect(200).expect(({ body }) => {
      expect(body.data.keys).toEqual(['name']);
    });

    await request(app).get('/health').expect(200).expect(({ body }) => {
      expect(body.data.status).toBe('ok');
      expect(body.data.keyCount).toBe(1);
    });
  });

  it('returns deterministic error envelopes', async () => {
    const app = buildApp(new KeyValueStore());
    await request(app).get('/v1/kv/missing').expect(404).expect(({ body }) => {
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('KEY_NOT_FOUND');
    });
    await request(app).put('/v1/kv/name').send('{').set('Content-Type', 'application/json').expect(400).expect(({ body }) => {
      expect(body.error.code).toBe('INVALID_JSON');
    });
  });
});
