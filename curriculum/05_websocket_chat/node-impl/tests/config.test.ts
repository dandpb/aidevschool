import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads defaults and numeric overrides', () => {
    process.env.PORT = '9090';
    process.env.ROOM_CAPACITY = '5';
    expect(loadConfig()).toMatchObject({ port: 9090, roomCapacity: 5, host: '0.0.0.0' });
  });

  it('rejects invalid numeric configuration', () => {
    process.env.HISTORY_SIZE = '0';
    expect(() => loadConfig()).toThrow('HISTORY_SIZE');
  });
});
