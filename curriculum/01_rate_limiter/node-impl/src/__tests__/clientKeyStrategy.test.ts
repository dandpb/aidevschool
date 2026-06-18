import { describe, it, expect } from 'vitest';
import type { Request } from 'express';

import { createExpressClientKeyStrategy } from '../clientKeyStrategy';

describe('ClientKeyStrategy', () => {
  function makeRequest(partial: {
    ip?: string;
    remoteAddress?: string;
  }): Request {
    return {
      ip: partial.ip,
      socket: { remoteAddress: partial.remoteAddress },
    } as unknown as Request;
  }

  describe('trustProxy = true', () => {
    const strategy = createExpressClientKeyStrategy(true);

    it('prefers req.ip when available', () => {
      const req = makeRequest({ ip: '198.51.100.7', remoteAddress: '10.0.0.1' });
      expect(strategy.resolve(req)).toBe('198.51.100.7');
    });

    it('falls back to socket.remoteAddress when req.ip is missing', () => {
      const req = makeRequest({ remoteAddress: '10.0.0.1' });
      expect(strategy.resolve(req)).toBe('10.0.0.1');
    });

    it('falls back to "unknown" when no address is available', () => {
      const req = makeRequest({});
      expect(strategy.resolve(req)).toBe('unknown');
    });

    it('strips brackets from IPv6 req.ip', () => {
      const req = makeRequest({ ip: '[::1]' });
      expect(strategy.resolve(req)).toBe('::1');
    });
  });

  describe('trustProxy = false', () => {
    const strategy = createExpressClientKeyStrategy(false);

    it('prefers the raw socket address', () => {
      const req = makeRequest({ ip: '198.51.100.7', remoteAddress: '10.0.0.1' });
      expect(strategy.resolve(req)).toBe('10.0.0.1');
    });

    it('falls back to req.ip when socket.remoteAddress is missing', () => {
      const req = makeRequest({ ip: '198.51.100.7' });
      expect(strategy.resolve(req)).toBe('198.51.100.7');
    });

    it('falls back to "unknown" when no address is available', () => {
      const req = makeRequest({});
      expect(strategy.resolve(req)).toBe('unknown');
    });

    it('normalizes IPv4-mapped IPv6 socket addresses to IPv4', () => {
      const req = makeRequest({ remoteAddress: '::ffff:10.0.0.7' });
      expect(strategy.resolve(req)).toBe('10.0.0.7');
    });

    it('passes plain IPv4 and IPv6 through unchanged', () => {
      const v4 = makeRequest({ remoteAddress: '203.0.113.42' });
      expect(strategy.resolve(v4)).toBe('203.0.113.42');

      const v6 = makeRequest({ remoteAddress: '2001:db8::1' });
      expect(strategy.resolve(v6)).toBe('2001:db8::1');
    });
  });
});
