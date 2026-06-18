import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export type TaskStatus = 'scheduled' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelling' | 'cancelled' | 'dead_lettered';

export interface Config { workerCount: number; capacity: number; maxRetries: number; baseBackoffMs: number; jitterMs: number }
export interface EnqueueRequest { payload: Record<string, unknown>; priority?: number; idempotencyKey?: string; scheduledForMs?: number; maxRetries?: number; timeoutMs?: number }
export interface Task { id: string; payload: Record<string, unknown>; status: TaskStatus; retries: number; maxRetries: number; priority: number; idempotencyKey?: string; scheduledForMs?: number; nextAttemptAtMs?: number; timeoutMs?: number; createdAtMs: number; updatedAtMs: number; startedAtMs?: number; completedAtMs?: number; cancelledAtMs?: number; lastError?: string; deadLetter: boolean }
export interface QueueStats { queue_depth: number; scheduled_count: number; running_count: number; completed_count: number; failed_count: number; cancelled_count: number; dead_letter_count: number; worker_count: number; busy_worker_count: number; backpressure: 'open' | 'limited' | 'full' | 'shutting_down' }
export type TaskHandler = (task: Task, signal: AbortSignal) => Promise<void>;

interface QueuedItem { id: string; priority: number; dueMs: number; seq: number }

export class QueueError extends Error { constructor(message: string) { super(message); this.name = 'QueueError'; } }
export class TransientTaskError extends Error { constructor(message: string) { super(message); this.name = 'TransientTaskError'; } }
export class PoisonTaskError extends Error { constructor(message: string) { super(message); this.name = 'PoisonTaskError'; } }

export class ManualClock {
  private currentMs: number;
  private readonly emitter = new EventEmitter();
  constructor(nowMs: number) { this.currentMs = nowMs; }
  now(): number { return this.currentMs; }
  advance(deltaMs: number): void { this.currentMs += deltaMs; this.emitter.emit('tick'); }
  onTick(listener: () => void): void { this.emitter.on('tick', listener); }
}

export class TaskQueue {
  private readonly tasks = new Map<string, Task>();
  private readonly idempotency = new Map<string, string>();
  private readonly queue: QueuedItem[] = [];
  private readonly dlq: Task[] = [];
  private seq = 0;
  private running = 0;
  private started = false;
  private shuttingDown = false;
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(private readonly config: Config, private readonly handler: TaskHandler, private readonly clock: ManualClock = new ManualClock(Date.now())) { this.clock.onTick(() => this.pump()); }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.pump();
  }

  async enqueue(request: EnqueueRequest): Promise<Task> {
    if (this.shuttingDown) throw new QueueError('shutting_down');
    if (!request.payload || typeof request.payload !== 'object') throw new QueueError('invalid_payload');
    if (request.idempotencyKey && this.idempotency.has(request.idempotencyKey)) return this.clone(this.tasks.get(this.idempotency.get(request.idempotencyKey)!)!);
    if (this.activeCount() >= this.config.capacity) throw new QueueError('queue_full');
    const now = this.clock.now();
    const status: TaskStatus = request.scheduledForMs !== undefined && request.scheduledForMs > now ? 'scheduled' : 'queued';
    const task: Task = { id: randomUUID(), payload: { ...request.payload }, status, retries: 0, maxRetries: request.maxRetries ?? this.config.maxRetries, priority: request.priority ?? 0, idempotencyKey: request.idempotencyKey, scheduledForMs: request.scheduledForMs, timeoutMs: request.timeoutMs, createdAtMs: now, updatedAtMs: now, deadLetter: false };
    this.tasks.set(task.id, task);
    if (task.idempotencyKey) this.idempotency.set(task.idempotencyKey, task.id);
    this.push(task.id, task.priority, task.scheduledForMs ?? now);
    this.logTransition(undefined, task.status, task);
    this.pump();
    return this.clone(task);
  }

  get(id: string): Task { const task = this.tasks.get(id); if (!task) throw new QueueError('task_not_found'); return this.clone(task); }

  async cancel(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new QueueError('task_not_found');
    const now = this.clock.now();
    if (task.status === 'queued' || task.status === 'scheduled') { const prev = task.status; task.status = 'cancelled'; task.cancelledAtMs = now; task.updatedAtMs = now; this.logTransition(prev, task.status, task); return this.clone(task); }
    if (task.status === 'running') { const prev = task.status; task.status = 'cancelling'; task.updatedAtMs = now; this.logTransition(prev, task.status, task); return this.clone(task); }
    throw new QueueError('task_terminal');
  }

  stats(): QueueStats {
    const stats: QueueStats = { queue_depth: 0, scheduled_count: 0, running_count: 0, completed_count: 0, failed_count: 0, cancelled_count: 0, dead_letter_count: 0, worker_count: this.config.workerCount, busy_worker_count: this.running, backpressure: 'open' };
    for (const task of this.tasks.values()) {
      if (task.status === 'queued') stats.queue_depth += 1;
      else if (task.status === 'scheduled') stats.scheduled_count += 1;
      else if (task.status === 'running' || task.status === 'cancelling') stats.running_count += 1;
      else if (task.status === 'succeeded') stats.completed_count += 1;
      else if (task.status === 'failed') stats.failed_count += 1;
      else if (task.status === 'cancelled') stats.cancelled_count += 1;
      else if (task.status === 'dead_lettered') { stats.dead_letter_count += 1; stats.failed_count += 1; }
    }
    if (this.shuttingDown) stats.backpressure = 'shutting_down';
    else if (this.activeCount() >= this.config.capacity) stats.backpressure = 'full';
    else if (this.activeCount() / this.config.capacity >= 0.8) stats.backpressure = 'limited';
    return stats;
  }

  deadLetters(): Task[] { return this.dlq.map((task) => this.clone(task)); }
  dequeueForTest(): Task | undefined { return this.dequeueReady(); }

  async shutdown(timeoutMs: number): Promise<void> {
    this.shuttingDown = true;
    this.pump();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.activeCount() === 0 && this.running === 0) { this.clearTimers(); return; }
      await new Promise((resolve) => setTimeout(resolve, 5));
      this.pump();
    }
    this.clearTimers();
    throw new QueueError('shutting_down');
  }

  private pump(): void {
    if (!this.started || this.config.workerCount === 0) return;
    while (this.running < this.config.workerCount) {
      const task = this.dequeueReady();
      if (!task) return;
      this.run(task);
    }
  }

  private dequeueReady(): Task | undefined {
    this.sortQueue();
    const now = this.clock.now();
    while (this.queue.length > 0) {
      const item = this.queue[0];
      if (item.dueMs > now) return undefined;
      this.queue.shift();
      const task = this.tasks.get(item.id);
      if (!task || task.status === 'cancelled') continue;
      if (task.status !== 'queued' && task.status !== 'scheduled') continue;
      const due = task.nextAttemptAtMs ?? task.scheduledForMs ?? now;
      if (due > now) { this.push(task.id, task.priority, due); return undefined; }
      const prev = task.status;
      task.status = 'running';
      task.startedAtMs = now;
      task.updatedAtMs = now;
      this.logTransition(prev, task.status, task);
      return this.clone(task);
    }
    return undefined;
  }

  private run(task: Task): void {
    this.running += 1;
    const controller = new AbortController();
    let timeout: NodeJS.Timeout | undefined;
    if (task.timeoutMs) { timeout = setTimeout(() => controller.abort(), task.timeoutMs); this.timers.add(timeout); }
    void this.handler(task, controller.signal).then(() => this.finish(task.id)).catch((error: unknown) => this.finish(task.id, error)).finally(() => { if (timeout) { clearTimeout(timeout); this.timers.delete(timeout); } });
  }

  private finish(id: string, error?: unknown): void {
    this.running -= 1;
    const task = this.tasks.get(id);
    if (!task) return;
    const now = this.clock.now();
    if (task.status === 'cancelling') { const prev = task.status; task.status = 'cancelled'; task.cancelledAtMs = now; task.updatedAtMs = now; this.logTransition(prev, task.status, task); this.pump(); return; }
    if (!error) { const prev = task.status; task.status = 'succeeded'; task.completedAtMs = now; task.updatedAtMs = now; this.logTransition(prev, task.status, task); this.pump(); return; }
    task.lastError = error instanceof Error ? error.message : String(error);
    if (error instanceof PoisonTaskError || task.retries >= task.maxRetries) { const prev = task.status; task.status = 'dead_lettered'; task.deadLetter = true; task.completedAtMs = now; task.updatedAtMs = now; this.dlq.push(this.clone(task)); this.logTransition(prev, task.status, task); this.pump(); return; }
    task.retries += 1;
    const due = now + this.config.baseBackoffMs * 2 ** (task.retries - 1) + this.jitter();
    const prev = task.status;
    task.status = 'scheduled';
    task.nextAttemptAtMs = due;
    task.updatedAtMs = now;
    this.push(task.id, task.priority, due);
    this.logTransition(prev, task.status, task);
    this.pump();
  }

  private push(id: string, priority: number, dueMs: number): void { this.seq += 1; this.queue.push({ id, priority, dueMs, seq: this.seq }); }
  private sortQueue(): void { this.queue.sort((a, b) => a.dueMs - b.dueMs || b.priority - a.priority || a.seq - b.seq); }
  private activeCount(): number { return [...this.tasks.values()].filter((task) => task.status === 'queued' || task.status === 'scheduled' || task.status === 'running' || task.status === 'cancelling').length; }
  private jitter(): number { return this.config.jitterMs > 0 ? Math.floor(Math.random() * this.config.jitterMs) : 0; }
  private clearTimers(): void { for (const timer of this.timers) clearTimeout(timer); this.timers.clear(); }
  private clone(task: Task): Task { return { ...task, payload: { ...task.payload } }; }
  private logTransition(previous: TaskStatus | undefined, next: TaskStatus, task: Task): void { console.info(JSON.stringify({ event: 'task_transition', task_id: task.id, previous_status: previous, next_status: next, retries: task.retries })); }
}
