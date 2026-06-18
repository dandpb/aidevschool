import { describe, it, expect } from 'vitest';
import { TenantLimiter } from '../rateLimiter';

describe('TenantLimiter', () => {
  it('should allow up to capacity', () => {
    const tl = new TenantLimiter(2, 1);
    expect(tl.allow('t1')).toBe(true);
    expect(tl.allow('t1')).toBe(true);
    expect(tl.allow('t1')).toBe(false);
    expect(tl.allow('t2')).toBe(true);
  });
});
