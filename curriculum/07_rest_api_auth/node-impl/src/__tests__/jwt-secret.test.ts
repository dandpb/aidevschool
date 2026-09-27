import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('JWT secret configuration (AID-3048)', () => {
  it('refuses to build without an explicit jwtSecret (no hardcoded fallback)', () => {
    expect(() => buildApp({ config: { passwordIterations: 100 } })).toThrow(/jwtSecret is required/);
  });

  it('refuses an empty jwtSecret', () => {
    expect(() => buildApp({ config: { jwtSecret: '' } })).toThrow(/jwtSecret is required/);
  });
});
