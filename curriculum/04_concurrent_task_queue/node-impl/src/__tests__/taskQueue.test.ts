import { describe, expect, it } from 'vitest';
import { ManualClock, PoisonTaskError, TaskQueue, TransientTaskError } from '../taskQueue';

const eventually = async (check: () => boolean | Promise<boolean>) => {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('condition not met');
};

describe('TaskQueue', () => {
  it('enqueues by priority FIFO, deduplicates idempotency keys, and rejects over capacity', async () => {
    const clock = new ManualClock(1000);
    const queue = new TaskQueue({ workerCount: 0, capacity: 2, maxRetries: 1, baseBackoffMs: 100, jitterMs: 0 }, async () => undefined, clock);
    const low = await queue.enqueue({ payload: { name: 'low' }, priority: 0, idempotencyKey: 'same' });
    const duplicate = await queue.enqueue({ payload: { name: 'dup' }, priority: 9, idempotencyKey: 'same' });
    expect(duplicate.id).toBe(low.id);
    const high = await queue.enqueue({ payload: { name: 'high' }, priority: 2 });
    await expect(queue.enqueue({ payload: { name: 'overflow' } })).rejects.toThrow('queue_full');
    expect(queue.dequeueForTest()?.id).toBe(high.id);
    expect(queue.dequeueForTest()?.id).toBe(low.id);
  });

  it('retries transient failures with exponential backoff then dead-letters', async () => {
    const clock = new ManualClock(2000);
    const queue = new TaskQueue({ workerCount: 1, capacity: 5, maxRetries: 2, baseBackoffMs: 100, jitterMs: 0 }, async () => {
      throw new TransientTaskError('nope');
    }, clock);
    queue.start();
    const task = await queue.enqueue({ payload: { kind: 'retry' } });
    await eventually(() => queue.get(task.id).retries === 1);
    clock.advance(110);
    await eventually(() => queue.get(task.id).retries === 2);
    clock.advance(210);
    await eventually(() => queue.get(task.id).status === 'dead_lettered');
    expect(queue.stats().dead_letter_count).toBe(1);
    expect(queue.deadLetters()).toHaveLength(1);
    await queue.shutdown(1000);
  });

  it('respects worker limits, cancellation, scheduled tasks, poison messages, and shutdown', async () => {
    const clock = new ManualClock(3000);
    let running = 0;
    let maxRunning = 0;
    let release = false;
    const queue = new TaskQueue({ workerCount: 2, capacity: 8, maxRetries: 1, baseBackoffMs: 1, jitterMs: 0 }, async (task) => {
      if (task.payload.poison) throw new PoisonTaskError('poison');
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      while (!release) await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
    }, clock);
    queue.start();
    const scheduled = await queue.enqueue({ payload: { kind: 'scheduled' }, scheduledForMs: clock.now() + 10000 });
    const cancelled = await queue.enqueue({ payload: { kind: 'cancel' } });
    await queue.cancel(cancelled.id);
    const poison = await queue.enqueue({ payload: { poison: true }, priority: 5 });
    for (let i = 0; i < 3; i += 1) await queue.enqueue({ payload: { n: i } });
    await eventually(() => queue.stats().busy_worker_count === 2);
    expect(maxRunning).toBeLessThanOrEqual(2);
    release = true;
    clock.advance(11000);
    await eventually(() => queue.get(poison.id).status === 'dead_lettered');
    await queue.shutdown(1000);
    expect(queue.get(scheduled.id).status).toBe('succeeded');
    await expect(queue.enqueue({ payload: { late: true } })).rejects.toThrow('shutting_down');
  });
});
