import express from 'express';
import { z } from 'zod';
import { QueueError, TaskQueue } from './taskQueue';

const enqueueSchema = z.object({
  payload: z.record(z.unknown()),
  priority: z.number().int().optional(),
  idempotency_key: z.string().optional(),
  scheduled_for_ms: z.number().int().optional(),
  max_retries: z.number().int().min(0).optional(),
  timeout_ms: z.number().int().positive().optional()
});

export const buildServer = (queue: TaskQueue) => {
  const app = express();
  app.use(express.json());
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/stats', (_req, res) => res.json(queue.stats()));
  app.post('/tasks', async (req, res) => {
    const parsed = enqueueSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'invalid_payload' }); return; }
    try {
      const task = await queue.enqueue({ payload: parsed.data.payload, priority: parsed.data.priority, idempotencyKey: parsed.data.idempotency_key, scheduledForMs: parsed.data.scheduled_for_ms, maxRetries: parsed.data.max_retries, timeoutMs: parsed.data.timeout_ms });
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
