import express from 'express';
import { QueueError, TaskQueue } from './taskQueue';

// ponytail: hand-check enqueue body
function parseEnqueue(body: unknown): {
  payload: Record<string, unknown>
  priority?: number
  idempotencyKey?: string
  scheduledForMs?: number
  maxRetries?: number
  timeoutMs?: number
} | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (!b.payload || typeof b.payload !== "object" || Array.isArray(b.payload)) return null
  const optInt = (v: unknown) => (v === undefined ? undefined : (typeof v === "number" && Number.isInteger(v) ? v : null))
  const priority = optInt(b.priority)
  const scheduledForMs = optInt(b.scheduled_for_ms)
  const maxRetries = optInt(b.max_retries)
  const timeoutMs = optInt(b.timeout_ms)
  if (priority === null || scheduledForMs === null || maxRetries === null || timeoutMs === null) return null
  if (maxRetries !== undefined && maxRetries < 0) return null
  if (timeoutMs !== undefined && timeoutMs <= 0) return null
  if (b.idempotency_key !== undefined && typeof b.idempotency_key !== "string") return null
  return {
    payload: b.payload as Record<string, unknown>,
    priority,
    idempotencyKey: b.idempotency_key as string | undefined,
    scheduledForMs,
    maxRetries,
    timeoutMs,
  }
}

export const buildServer = (queue: TaskQueue) => {
  const app = express();
  app.use(express.json());
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/stats', (_req, res) => res.json(queue.stats()));
  app.post('/tasks', async (req, res) => {
    const parsed = parseEnqueue(req.body);
    if (!parsed) { res.status(400).json({ error: 'invalid_payload' }); return; }
    try {
      const task = await queue.enqueue(parsed);
      res.status(201).json(task);
    } catch (error) { writeQueueError(res, error); }
  });
  app.get('/tasks/:id', (req, res) => { try { res.json(queue.get(req.params.id)); } catch (error) { writeQueueError(res, error); } });
  app.delete('/tasks/:id', async (req, res) => { try { res.json(await queue.cancel(req.params.id)); } catch (error) { writeQueueError(res, error); } });
  return app;
};

const writeQueueError = (res: express.Response, error: unknown) => {
  const message = error instanceof QueueError ? error.message : 'internal_error';
  const status = message === 'invalid_payload' ? 400 : message === 'queue_full' ? 429 : message === 'shutting_down' ? 503 : message === 'task_not_found' ? 404 : message === 'task_terminal' ? 409 : 500;
  res.status(status).json({ error: message });
};
