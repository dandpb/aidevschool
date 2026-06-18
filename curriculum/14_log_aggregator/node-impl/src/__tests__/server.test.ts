import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Server } from '../server';

describe('Server', () => {
  it('should ingest and query', async () => {
    const server = new Server();
    const app = server.buildApp();

    const res1 = await request(app)
      .post('/logs')
      .send({ log_id: '1', level: 'error', message: 'err', source: { service: 'svc' } });
    expect(res1.status).toBe(202);

    const res2 = await request(app).get('/logs?level=error');
    expect(res2.status).toBe(200);
    expect(res2.body.data.items.length).toBe(1);
  });

  it('should reject invalid ingest', async () => {
    const server = new Server();
    const app = server.buildApp();
    const res = await request(app).post('/logs').send({});
    expect(res.status).toBe(400);
  });

  it('should return health', async () => {
    const server = new Server();
    const app = server.buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('should return metrics', async () => {
    const server = new Server();
    const app = server.buildApp();
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });

  it('should return trace', async () => {
    const server = new Server();
    const app = server.buildApp();
    await request(app)
      .post('/logs')
      .send({ log_id: '1', level: 'info', message: 'm1', source: { service: 'svc' }, trace_id: 't1' });

    const res = await request(app).get('/traces/t1');
    expect(res.status).toBe(200);
    expect(res.body.data.trace.logs.length).toBe(1);
  });
});
