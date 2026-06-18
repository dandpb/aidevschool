import { describe, expect, it } from 'vitest';
import { AnalyticsQueue, AppError, CreationRateLimiter, UrlStore, base62, clickEvent, headerValue, validateAlias, validateUrl } from '../core';

describe('core URL shortener behavior', () => {
  it('validates URLs and aliases deterministically', () => {
    expect(() => validateUrl('https://example.com/a')).not.toThrow();
    expect(() => validateUrl('http://example.com')).not.toThrow();
    expect(() => validateUrl('')).toThrow(AppError);
    expect(() => validateUrl('ftp://example.com')).toThrow(AppError);
    expect(() => validateUrl(`https://example.com/${'a'.repeat(2050)}`)).toThrow(AppError);
    expect(() => validateAlias('abc123')).not.toThrow();
    expect(() => validateAlias('ab')).toThrow(AppError);
    expect(() => validateAlias('has-dash')).toThrow(AppError);
    expect(() => validateAlias('shorten')).toThrow(AppError);
    expect(base62(0n)).toBe('0');
  });

  it('creates, resolves, lists, deletes, and rejects alias reuse', () => {
    const now = new Date('2026-06-17T12:00:00Z');
    const store = new UrlStore(() => now);
    const record = store.create({ url: 'https://example.com/a', custom_alias: 'abc' }, 'http://localhost:8081');
    expect(record.code).toBe('abc');
    expect(record.short_url).toBe('http://localhost:8081/abc');
    expect(store.resolve('abc').original_url).toBe('https://example.com/a');
    expect(() => store.create({ url: 'https://example.com/b', custom_alias: 'abc' }, 'http://localhost:8081')).toThrow(AppError);
    expect(store.list(1, undefined).items).toHaveLength(1);
    expect(() => store.list(0, undefined)).toThrow(AppError);
    expect(() => store.list(10, 'bad')).toThrow(AppError);
    store.delete('abc');
    expect(() => store.resolve('abc')).toThrow(AppError);
    expect(() => store.delete('abc')).toThrow(AppError);
    expect(() => store.delete('missing')).toThrow(AppError);
  });

  it('generates unique codes, handles expiry, and records analytics through the queue', () => {
    let now = new Date('2026-06-17T12:00:00Z');
    const store = new UrlStore(() => now);
    const first = store.create({ url: 'https://example.com/one' }, 'http://localhost:8081');
    const second = store.create({ url: 'https://example.com/two' }, 'http://localhost:8081');
    expect(first.code).not.toBe(second.code);
    const queue = new AnalyticsQueue(store);
    queue.enqueue(first.code, { clicked_at: now.toISOString(), referrer: 'https://ref.example' });
    queue.drain();
    expect(store.stats(first.code).total_clicks).toBe(1);
    const expired = store.create({ url: 'https://example.com/old', custom_alias: 'old', expires_at: '2026-06-17T12:30:00Z' }, 'http://localhost:8081');
    now = new Date('2026-06-17T12:31:00Z');
    expect(() => store.resolve(expired.code)).toThrow(AppError);
  });

  it('rate limits creation requests and derives click metadata', () => {
    let current = 1000;
    const limiter = new CreationRateLimiter(1, 60_000, () => current);
    expect(() => limiter.allow('client')).not.toThrow();
    expect(() => limiter.allow('client')).toThrow(AppError);
    current += 60_001;
    expect(() => limiter.allow('client')).not.toThrow();
    expect(headerValue(['first', 'second'])).toBe('first');
    const event = clickEvent({ referer: 'https://ref.example', 'user-agent': 'agent' }, '203.0.113.1', new Date('2026-06-17T12:00:00Z'));
    expect(event.clicked_at).toBe('2026-06-17T12:00:00.000Z');
    expect(event.client_ip_hash).toHaveLength(16);
  });
});
