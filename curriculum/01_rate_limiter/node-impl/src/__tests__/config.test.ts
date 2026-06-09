import { describe, it, expect } from 'vitest';

import { loadConfig } from '../config';
import { ConfigError } from '../errors';

describe('loadConfig', () => {
  it('returns defaults when no env vars are set', () => {
    const cfg = loadConfig({});
    expect(cfg.port).toBe(8081);
    expect(cfg.capacity).toBe(10);
    expect(cfg.refillRate).toBe(2);
    expect(cfg.idleTimeoutMs).toBe(60 * 60 * 1000);
    expect(cfg.cleanupIntervalMs).toBe(60 * 1000);
    expect(cfg.trustProxy).toBe(false);
    expect(cfg.logLevel).toBe('info');
  });

  it('parses valid overrides', () => {
    const cfg = loadConfig({
      PORT: '9000',
      CAPACITY: '50',
      REFILL_RATE: '5.5',
      TRUST_PROXY: 'true',
      LOG_LEVEL: 'DEBUG',
    });
    expect(cfg.port).toBe(9000);
    expect(cfg.capacity).toBe(50);
    expect(cfg.refillRate).toBe(5.5);
    expect(cfg.trustProxy).toBe(true);
    expect(cfg.logLevel).toBe('debug');
  });

  it('rejects non-integer PORT', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: '0' })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: '-1' })).toThrow(ConfigError);
  });

  it('rejects non-positive REFILL_RATE', () => {
    expect(() => loadConfig({ REFILL_RATE: '0' })).toThrow(ConfigError);
    expect(() => loadConfig({ REFILL_RATE: '-2' })).toThrow(ConfigError);
  });

  it('rejects unknown trust-proxy values', () => {
    expect(() => loadConfig({ TRUST_PROXY: 'maybe' })).toThrow(ConfigError);
  });

  it('treats empty strings as "use the default"', () => {
    const cfg = loadConfig({ PORT: '', CAPACITY: '' });
    expect(cfg.port).toBe(8081);
    expect(cfg.capacity).toBe(10);
  });
});
