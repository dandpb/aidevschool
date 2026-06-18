import request from 'supertest';
import { app } from './index';

describe('HTTP API', () => {
  describe('POST /topics', () => {
    it('should create a topic', async () => {
      const res = await request(app)
        .post('/topics')
        .send({ name: 'httptest-topic', partitions: 3 });

      expect(res.status).toBe(201);
      expect(res.body.topic.name).toBe('httptest-topic');
    });

    it('should reject invalid config', async () => {
      const res = await request(app)
        .post('/topics')
        .send({ name: 'httptest-invalid', partitions: 0 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /topics/:topic/messages', () => {
    it('should produce a message', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-produce', partitions: 3 });

      const res = await request(app)
        .post('/topics/httptest-produce/messages')
        .send({ key: 'customer-123', value: { orderId: 'o-1' }, partition: 0 });

      expect(res.status).toBe(201);
      expect(res.body.topic).toBe('httptest-produce');
    });

    it('should reject nonexistent topic', async () => {
      const res = await request(app)
        .post('/topics/nonexistent/messages')
        .send({ value: { test: true } });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /topics/:topic/partitions/:partition/messages', () => {
    it('should read messages', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-read', partitions: 1 });

      await request(app)
        .post('/topics/httptest-read/messages')
        .send({ value: { test: true } });

      const res = await request(app)
        .get('/topics/httptest-read/partitions/0/messages?offset=0&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /consumers', () => {
    it('should create a consumer group', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-cg', partitions: 2 });

      const res = await request(app)
        .post('/consumers')
        .send({ groupId: 'billing-service', topic: 'httptest-cg', startFrom: 'earliest' });

      expect(res.status).toBe(201);
      expect(res.body.groupId).toBe('billing-service');
    });
  });

  describe('GET /consumers/:groupId/topics/:topic/messages', () => {
    it('should fetch messages', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-fetch', partitions: 1 });

      await request(app)
        .post('/topics/httptest-fetch/messages')
        .send({ value: { test: true } });

      await request(app)
        .post('/consumers')
        .send({ groupId: 'httptest-group', topic: 'httptest-fetch', startFrom: 'earliest' });

      const res = await request(app)
        .get('/consumers/httptest-group/topics/httptest-fetch/messages?limit=10');

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /consumers/:groupId/topics/:topic/offsets', () => {
    it('should commit offsets', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-commit', partitions: 1 });

      await request(app)
        .post('/topics/httptest-commit/messages')
        .send({ value: { test: true } });

      await request(app)
        .post('/consumers')
        .send({ groupId: 'httptest-commit-group', topic: 'httptest-commit', startFrom: 'earliest' });

      const res = await request(app)
        .post('/consumers/httptest-commit-group/topics/httptest-commit/offsets')
        .send({ offsets: [{ partition: 0, offset: 1 }] });

      expect(res.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should handle invalid partition', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-error', partitions: 1 });

      const res = await request(app)
        .post('/topics/httptest-error/messages')
        .send({ value: { test: true }, partition: 99 });

      expect(res.status).toBe(422);
    });

    it('should handle invalid consumer group', async () => {
      const res = await request(app)
        .get('/consumers/nonexistent/topics/nonexistent/messages?limit=10');

      expect(res.status).toBe(400);
    });

    it('should handle invalid offset commit', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-error2', partitions: 1 });

      await request(app)
        .post('/consumers')
        .send({ groupId: 'httptest-error-group', topic: 'httptest-error2', startFrom: 'earliest' });

      const res = await request(app)
        .post('/consumers/httptest-error-group/topics/httptest-error2/offsets')
        .send({ offsets: [{ partition: 99, offset: 0 }] });

      expect(res.status).toBe(422);
    });

    it('should handle missing topic on read', async () => {
      const res = await request(app)
        .get('/topics/nonexistent/partitions/0/messages?offset=0&limit=10');

      expect(res.status).toBe(404);
    });

    it('should handle invalid offset on read', async () => {
      await request(app)
        .post('/topics')
        .send({ name: 'httptest-read-error', partitions: 1 });

      const res = await request(app)
        .get('/topics/httptest-read-error/partitions/0/messages?offset=-1&limit=10');

      expect(res.status).toBe(400);
    });
  });
});
