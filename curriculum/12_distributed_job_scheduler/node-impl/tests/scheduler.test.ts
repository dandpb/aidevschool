import { describe, expect, it } from 'vitest';
import {
  Election,
  JobResult,
  JobStatus,
  LockManager,
  Priority,
  Scheduler,
} from '../src/scheduler.js';

describe('distributed job scheduler core', () => {
  it('validates duration intervals and tracks submitted status', () => {
    const scheduler = new Scheduler('node-a', () => 0);
    const job = scheduler.submit({ name: 'digest', interval: '5s', priority: Priority.Normal });
    const minuteJob = scheduler.submit({ name: 'minute', interval: '1m', priority: Priority.Low });

    expect(job.status).toBe(JobStatus.Pending);
    expect(job.intervalMs).toBe(5_000);
    expect(minuteJob.intervalMs).toBe(60_000);
    expect(() => scheduler.submit({ name: 'bad', interval: 'cron * * *', priority: Priority.Low })).toThrow(/invalid interval/i);
    expect(() => scheduler.submit({ name: 'zero', interval: '0s', priority: Priority.Low })).toThrow(/invalid interval/i);
    expect(() => scheduler.submit({ name: 'missing-parent', dependencies: ['missing'] })).toThrow(/dependency missing/i);
  });

  it('elects the highest process id leader with a lease', () => {
    let now = 0;
    const election = new Election(() => now, 2_000);

    expect(election.elect(['pid-2', 'pid-9', 'pid-3'])).toBe('pid-9');
    expect(election.isLeader('pid-9')).toBe(true);
    now += 3_000;
    expect(election.isLeader('pid-9')).toBe(false);
  });

  it('dispatches by priority, due time, and creation order', () => {
    const scheduler = new Scheduler('node-a', () => 0);
    scheduler.becomeLeader(['node-a'], 60_000);
    const low = scheduler.submit({ name: 'low', priority: Priority.Low });
    const highLate = scheduler.submit({ name: 'high-late', priority: Priority.High, runAfterMs: 2_000 });
    const highEarly = scheduler.submit({ name: 'high-early', priority: Priority.High });

    expect(scheduler.dispatchNext('worker-1', 1_000).job.id).toBe(highEarly.id);
    expect(scheduler.dispatchNext('worker-1', 1_000).job.id).toBe(highLate.id);
    expect(scheduler.dispatchNext('worker-1', 1_000).job.id).toBe(low.id);
  });

  it('rejects concurrent locks and stale fencing tokens', () => {
    let now = 0;
    const locks = new LockManager(() => now);
    const lock = locks.acquire('job-1', 'leader-a', 'worker-a', 1_000);

    expect(() => locks.acquire('job-1', 'leader-b', 'worker-b', 1_000)).toThrow(/locked/i);
    expect(() => locks.validate('job-1', lock.fencingToken - 1)).toThrow(/stale/i);
    now += 2_000;
    expect(locks.acquire('job-1', 'leader-b', 'worker-b', 1_000).fencingToken).toBeGreaterThan(lock.fencingToken);
  });

  it('rejects stale leadership and expired lock completion', () => {
    let now = 0;
    const scheduler = new Scheduler('node-a', () => now);
    const job = scheduler.submit({ name: 'lease-sensitive' });

    expect(() => scheduler.dispatchJob(job.id, 'worker-1', 1_000)).toThrow(/not leader/i);

    scheduler.becomeLeader(['node-a'], 5_000);
    const dispatched = scheduler.dispatchJob(job.id, 'worker-1', 1_000);
    now += 2_000;
    expect(() => scheduler.complete(job.id, dispatched.lock.fencingToken, JobResult.Completed)).toThrow(/expired/i);
  });

  it('handles DAG dependencies, retry backoff, and cancellation', () => {
    const scheduler = new Scheduler('node-a', () => 0);
    scheduler.becomeLeader(['node-a'], 60_000);
    const parent = scheduler.submit({ name: 'parent', maxAttempts: 1 });
    const child = scheduler.submit({ name: 'child', priority: Priority.High, dependencies: [parent.id], maxAttempts: 1 });

    const dispatchedParent = scheduler.dispatchNext('worker-1', 1_000);
    expect(dispatchedParent.job.id).toBe(parent.id);
    scheduler.complete(parent.id, dispatchedParent.lock.fencingToken, JobResult.Completed);
    expect(scheduler.dispatchNext('worker-1', 1_000).job.id).toBe(child.id);

    const retry = scheduler.submit({ name: 'retry', maxAttempts: 3, initialBackoffMs: 1_000 });
    const dispatchedRetry = scheduler.dispatchJob(retry.id, 'worker-2', 1_000);
    scheduler.complete(retry.id, dispatchedRetry.lock.fencingToken, JobResult.Failed, 'temporary');
    expect(scheduler.getJob(retry.id).status).toBe(JobStatus.Pending);
    expect(scheduler.getJob(retry.id).dueAtMs).toBe(1_000);

    const permanentFailure = scheduler.submit({ name: 'fail', maxAttempts: 1 });
    const dispatchedFailure = scheduler.dispatchJob(permanentFailure.id, 'worker-3', 1_000);
    scheduler.complete(permanentFailure.id, dispatchedFailure.lock.fencingToken, JobResult.Failed, 'permanent');
    expect(scheduler.getJob(permanentFailure.id).status).toBe(JobStatus.Failed);

    const cancelled = scheduler.submit({ name: 'cancel-me' });
    scheduler.cancel(cancelled.id, 'client request');
    expect(scheduler.getJob(cancelled.id).status).toBe(JobStatus.Cancelled);
    expect(() => scheduler.cancel(cancelled.id, 'again')).toThrow(/terminal/i);
  });

  it('reports leader, queue, running jobs, and lock health', () => {
    const scheduler = new Scheduler('node-a', () => 0);
    scheduler.becomeLeader(['node-a'], 60_000);
    scheduler.submit({ name: 'queued' });
    scheduler.dispatchNext('worker-1', 1_000);

    expect(scheduler.health()).toMatchObject({
      nodeId: 'node-a',
      leaderId: 'node-a',
      runningJobs: 1,
      queueDepth: 0,
    });
  });
});
