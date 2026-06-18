import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '../circuitBreaker';

describe('CircuitBreaker', () => {
  it('should start closed and allow requests', () => {
    const cb = new CircuitBreaker({
      windowMs: 10000,
      minimumRequests: 5,
      failureRateThreshold: 0.5,
      openCooldownMs: 100,
      halfOpenMaxProbes: 2,
      halfOpenSuccessesToClose: 2,
    });
    expect(cb.allow()).toBe(true);
  });

  it('should open after failure threshold', () => {
    const cb = new CircuitBreaker({
      windowMs: 10000,
      minimumRequests: 5,
      failureRateThreshold: 0.5,
      openCooldownMs: 100,
      halfOpenMaxProbes: 2,
      halfOpenSuccessesToClose: 2,
    });
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.allow()).toBe(false);
  });

  it('should transition to half-open after cooldown', async () => {
    const cb = new CircuitBreaker({
      windowMs: 10000,
      minimumRequests: 5,
      failureRateThreshold: 0.5,
      openCooldownMs: 50,
      halfOpenMaxProbes: 2,
      halfOpenSuccessesToClose: 2,
    });
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.allow()).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.allow()).toBe(true);
    cb.recordSuccess();
    expect(cb.allow()).toBe(true);
    cb.recordSuccess();
    expect(cb.allow()).toBe(true);
    expect(cb.snapshot().state).toBe('closed');
  });

  it('should reopen on half-open failure', async () => {
    const cb = new CircuitBreaker({
      windowMs: 10000,
      minimumRequests: 1,
      failureRateThreshold: 0.5,
      openCooldownMs: 50,
      halfOpenMaxProbes: 1,
      halfOpenSuccessesToClose: 1,
    });
    cb.recordFailure();
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.allow()).toBe(true);
    cb.recordFailure();
    expect(cb.allow()).toBe(false);
  });
});
