import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger.js';

describe('structured logger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('preserves immutable plugin bindings in child records', () => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    createLogger().child({ pluginId: 'plugin-a' }).info(
      { event: 'started', pluginId: 'spoofed' },
      'plugin lifecycle',
    );

    expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toMatchObject({
      level: 'info',
      msg: 'plugin lifecycle',
      event: 'started',
      pluginId: 'plugin-a',
    });
  });
});