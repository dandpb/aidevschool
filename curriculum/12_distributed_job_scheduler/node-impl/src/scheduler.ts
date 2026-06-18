export enum Priority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
}

export enum JobStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum JobResult {
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export type JobRequest = {
  name: string;
  payload?: Record<string, string>;
  interval?: string;
  priority?: Priority;
  dependencies?: string[];
  maxAttempts?: number;
  initialBackoffMs?: number;
  runAfterMs?: number;
};

export type Job = {
  id: string;
  name: string;
  payload: Record<string, string>;
  status: JobStatus;
  priority: Priority;
  dependencies: string[];
  intervalMs: number | null;
  dueAtMs: number;
  createdAtMs: number;
  attempt: number;
  maxAttempts: number;
  initialBackoffMs: number;
  lastError: string | null;
  cancelReason: string | null;
};

export type Lock = {
  resourceId: string;
  ownerNodeId: string;
  ownerWorkerId: string;
  fencingToken: number;
  leaseExpiresAtMs: number;
};

export type Health = {
  nodeId: string;
  leaderId: string | null;
  queueDepth: number;
  runningJobs: number;
  expiredLocks: number;
};

type Now = () => number;

export class Election {
  private leaderId: string | null = null;
  private leaseExpiresAtMs = 0;

  constructor(
    private readonly now: Now,
    private readonly leaseMs: number,
  ) {}

  elect(processIds: readonly string[]): string | null {
    const leader = [...processIds].sort().at(-1) ?? null;
    this.leaderId = leader;
    this.leaseExpiresAtMs = this.now() + this.leaseMs;
    return leader;
  }

  isLeader(processId: string): boolean {
    return this.leaderId === processId && this.now() < this.leaseExpiresAtMs;
  }

  currentLeader(): string | null {
    return this.leaderId;
  }
}

export class LockManager {
  private readonly locks = new Map<string, Lock>();
  private readonly tokens = new Map<string, number>();

  constructor(private readonly now: Now) {}

  acquire(resourceId: string, ownerNodeId: string, ownerWorkerId: string, leaseMs: number): Lock {
    const current = this.locks.get(resourceId);
    if (current !== undefined && this.now() < current.leaseExpiresAtMs) {
      throw new Error(`resource ${resourceId} is locked`);
    }
    const fencingToken = (this.tokens.get(resourceId) ?? 0) + 1;
    this.tokens.set(resourceId, fencingToken);
    const lock: Lock = {
      resourceId,
      ownerNodeId,
      ownerWorkerId,
      fencingToken,
      leaseExpiresAtMs: this.now() + leaseMs,
    };
    this.locks.set(resourceId, lock);
    return lock;
  }

  validate(resourceId: string, fencingToken: number): void {
    const lock = this.locks.get(resourceId);
    if (lock === undefined) {
      throw new Error('lock not found');
    }
    if (this.now() > lock.leaseExpiresAtMs) {
      throw new Error('lock expired');
    }
    if (lock.fencingToken !== fencingToken) {
      throw new Error('stale fencing token');
    }
  }

  release(resourceId: string): void {
    this.locks.delete(resourceId);
  }

  expiredCount(): number {
    let count = 0;
    for (const lock of this.locks.values()) {
      if (this.now() > lock.leaseExpiresAtMs) {
        count += 1;
      }
    }
    return count;
  }
}

export class Scheduler {
  private readonly jobs = new Map<string, Job>();
  private readonly locks: LockManager;
  private election: Election;
  private sequence = 0;

  constructor(
    private readonly nodeId: string,
    private readonly now: Now = () => Date.now(),
  ) {
    this.locks = new LockManager(now);
    this.election = new Election(now, 5_000);
  }

  submit(request: JobRequest): Job {
    if (request.name.trim().length === 0) {
      throw new Error('job name is required');
    }
    const intervalMs = request.interval === undefined ? null : parseDurationMs(request.interval);
    const dependencies = [...(request.dependencies ?? [])];
    for (const dependency of dependencies) {
      if (!this.jobs.has(dependency)) {
        throw new Error(`dependency ${dependency} does not exist`);
      }
    }

    this.sequence += 1;
    const job: Job = {
      id: `job-${this.sequence.toString().padStart(6, '0')}`,
      name: request.name,
      payload: { ...(request.payload ?? {}) },
      status: JobStatus.Pending,
      priority: request.priority ?? Priority.Normal,
      dependencies,
      intervalMs,
      dueAtMs: this.now() + (request.runAfterMs ?? 0),
      createdAtMs: this.now(),
      attempt: 0,
      maxAttempts: Math.max(1, request.maxAttempts ?? 1),
      initialBackoffMs: Math.max(1, request.initialBackoffMs ?? 1_000),
      lastError: null,
      cancelReason: null,
    };
    this.jobs.set(job.id, job);
    logJson('job_submitted', { jobId: job.id, priority: job.priority, dependencies: dependencies.length });
    return cloneJob(job);
  }

  becomeLeader(peers: readonly string[], leaseMs: number): void {
    this.election = new Election(this.now, leaseMs);
    this.election.elect(peers);
  }

  dispatchNext(workerId: string, leaseMs: number): { job: Job; lock: Lock } {
    const candidates = [...this.jobs.values()]
      .filter((job) => job.status === JobStatus.Pending && this.dependenciesCompleted(job))
      .sort(compareJobs);

    for (const candidate of candidates) {
      try {
        return this.dispatchJob(candidate.id, workerId, leaseMs);
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }
      }
    }
    throw new Error('no dispatchable job');
  }

  dispatchJob(jobId: string, workerId: string, leaseMs: number): { job: Job; lock: Lock } {
    if (!this.election.isLeader(this.nodeId)) {
      throw new Error('not leader');
    }
    const job = this.requireJob(jobId);
    if (job.status !== JobStatus.Pending) {
      throw new Error(`job is ${job.status}`);
    }
    if (!this.dependenciesCompleted(job)) {
      throw new Error('dependencies not completed');
    }

    const lock = this.locks.acquire(job.id, this.nodeId, workerId, leaseMs);
    job.status = JobStatus.Running;
    job.attempt += 1;
    this.jobs.set(job.id, job);
    logJson('job_dispatched', { jobId: job.id, workerId, fencingToken: lock.fencingToken });
    return { job: cloneJob(job), lock: { ...lock } };
  }

  complete(jobId: string, fencingToken: number, result: JobResult, message: string | null = null): void {
    this.locks.validate(jobId, fencingToken);
    const job = this.requireJob(jobId);
    switch (result) {
      case JobResult.Completed:
        job.status = JobStatus.Completed;
        break;
      case JobResult.Cancelled:
        job.status = JobStatus.Cancelled;
        break;
      case JobResult.Failed:
        job.lastError = message;
        if (job.attempt < job.maxAttempts) {
          job.status = JobStatus.Pending;
          job.dueAtMs = this.now() + retryBackoffMs(job.initialBackoffMs, job.attempt);
        } else {
          job.status = JobStatus.Failed;
        }
        break;
    }
    this.jobs.set(job.id, job);
    this.locks.release(job.id);
    logJson('job_completed', { jobId: job.id, status: job.status, attempt: job.attempt });
  }

  cancel(jobId: string, reason: string): void {
    const job = this.requireJob(jobId);
    if ([JobStatus.Completed, JobStatus.Failed, JobStatus.Cancelled].includes(job.status)) {
      throw new Error(`terminal job state ${job.status}`);
    }
    job.status = JobStatus.Cancelled;
    job.cancelReason = reason;
    this.jobs.set(job.id, job);
    this.locks.release(job.id);
    logJson('job_cancelled', { jobId: job.id, reason });
  }

  getJob(jobId: string): Job {
    return cloneJob(this.requireJob(jobId));
  }

  health(): Health {
    const jobs = [...this.jobs.values()];
    return {
      nodeId: this.nodeId,
      leaderId: this.election.currentLeader(),
      queueDepth: jobs.filter((job) => job.status === JobStatus.Pending && this.dependenciesCompleted(job)).length,
      runningJobs: jobs.filter((job) => job.status === JobStatus.Running).length,
      expiredLocks: this.locks.expiredCount(),
    };
  }

  private requireJob(jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (job === undefined) {
      throw new Error('job not found');
    }
    return { ...job, dependencies: [...job.dependencies], payload: { ...job.payload } };
  }

  private dependenciesCompleted(job: Job): boolean {
    return job.dependencies.every((parentId) => this.jobs.get(parentId)?.status === JobStatus.Completed);
  }
}

function parseDurationMs(input: string): number {
  if (input.endsWith('s')) {
    return parsePositiveInteger(input.slice(0, -1), input) * 1_000;
  }
  if (input.endsWith('m')) {
    return parsePositiveInteger(input.slice(0, -1), input) * 60_000;
  }
  throw new Error(`invalid interval ${input}`);
}

function parsePositiveInteger(raw: string, original: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`invalid interval ${original}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`invalid interval ${original}`);
  }
  return value;
}

function compareJobs(left: Job, right: Job): number {
  const priorityDelta = priorityRank(right.priority) - priorityRank(left.priority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  const dueDelta = left.dueAtMs - right.dueAtMs;
  if (dueDelta !== 0) {
    return dueDelta;
  }
  return left.createdAtMs - right.createdAtMs;
}

function priorityRank(priority: Priority): number {
  switch (priority) {
    case Priority.High:
      return 3;
    case Priority.Normal:
      return 2;
    case Priority.Low:
      return 1;
  }
}

function retryBackoffMs(initialBackoffMs: number, attempt: number): number {
  return initialBackoffMs * 2 ** Math.max(0, attempt - 1);
}

function cloneJob(job: Job): Job {
  return {
    ...job,
    dependencies: [...job.dependencies],
    payload: { ...job.payload },
  };
}

export function logJson(event: string, fields: Record<string, string | number | boolean>): void {
  console.log(JSON.stringify({ event, ...fields, timestamp: new Date().toISOString() }));
}
