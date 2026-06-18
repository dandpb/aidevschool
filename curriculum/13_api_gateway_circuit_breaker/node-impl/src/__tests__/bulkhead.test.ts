import { describe, it, expect } from 'vitest';
import { Bulkhead } from '../bulkhead';

describe('Bulkhead', () => {
  it('should acquire and release', () => {
    const bh = new Bulkhead(2);
    expect(bh.acquire()).toBe(true);
    expect(bh.acquire()).toBe(true);
    expect(bh.acquire()).toBe(false);
    bh.release();
    expect(bh.acquire()).toBe(true);
  });
});
