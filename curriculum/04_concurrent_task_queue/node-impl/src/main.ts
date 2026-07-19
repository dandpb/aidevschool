import { buildServer } from './server';
import { ManualClock, PoisonTaskError, TaskQueue } from './taskQueue';

const port = Number(process.env.PORT ?? 8085);
const clock = new ManualClock(Date.now());
const queue = new TaskQueue({ workerCount: Number(process.env.WORKER_COUNT ?? 4), capacity: Number(process.env.QUEUE_CAPACITY ?? 1000), maxRetries: Number(process.env.MAX_RETRIES ?? 3), baseBackoffMs: Number(process.env.BASE_BACKOFF_MS ?? 100), jitterMs: Number(process.env.JITTER_MS ?? 50) }, async (task) => {
  if (task.payload.poison === true) throw new PoisonTaskError('poison');
}, clock);
// ManualClock is designed for deterministic tests; in production it must be
// advanced from the wall clock or scheduled tasks and retry backoff never fire.
const ticker = setInterval(() => {
  clock.advance(Math.max(0, Date.now() - clock.now()));
}, 100);
ticker.unref();
queue.start();
const server = buildServer(queue).listen(port, () => console.info(JSON.stringify({ event: 'listening', port })));

const shutdown = () => {
  clearInterval(ticker);
  server.close(() => {
    void queue.shutdown(10_000).finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
