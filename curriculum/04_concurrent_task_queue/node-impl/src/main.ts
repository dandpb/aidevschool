import { buildServer } from './server';
import { ManualClock, PoisonTaskError, TaskQueue } from './taskQueue';

const port = Number(process.env.PORT ?? 8085);
const queue = new TaskQueue({ workerCount: Number(process.env.WORKER_COUNT ?? 4), capacity: Number(process.env.QUEUE_CAPACITY ?? 1000), maxRetries: Number(process.env.MAX_RETRIES ?? 3), baseBackoffMs: Number(process.env.BASE_BACKOFF_MS ?? 100), jitterMs: Number(process.env.JITTER_MS ?? 50) }, async (task) => {
  if (task.payload.poison === true) throw new PoisonTaskError('poison');
}, new ManualClock(Date.now()));
queue.start();
const server = buildServer(queue).listen(port, () => console.info(JSON.stringify({ event: 'listening', port })));

const shutdown = () => {
  server.close(() => {
    void queue.shutdown(10_000).finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
