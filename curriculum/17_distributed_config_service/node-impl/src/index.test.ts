import request from 'supertest';
import { createApp, ConfigService } from './index';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
  });

  test('put and get config', () => {
    const config = service.put('test-key', {
      value: { maxRetries: 3 },
      contentType: 'application/json',
    });

    expect(config.version).toBe(1);
    expect(service.get('test-key')).toEqual(config);
  });

  test('version conflict', () => {
    service.put('version-test', {
      value: { data: 'v1' },
      contentType: 'application/json',
    });

    expect(() => {
      service.put('version-test', {
        value: { data: 'v2' },
        contentType: 'application/json',
        expectedVersion: 99,
      });
    }).toThrow('VersionConflict');
  });

  test('get config not found', () => {
    expect(service.get('nonexistent')).toBeUndefined();
  });

  test('flag evaluation', () => {
    service.putFlag('test-flag', {
      key: 'test-flag',
      enabled: true,
      defaultTreatment: 'off',
      treatments: ['on', 'off'],
      targetingRules: [],
      rolloutPercentage: 100,
    });

    const result = service.evaluateFlag('test-flag', {
      subject: { id: 'user-123' },
      defaultTreatment: 'off',
    });

    expect(result.treatment).toBe('off');
    expect(result.reason).toBe('default');
  });

  test('flag not found', () => {
    expect(() => {
      service.evaluateFlag('nonexistent', {
        subject: { id: 'user-123' },
        defaultTreatment: 'off',
      });
    }).toThrow('FlagNotFound');
  });

  test('targeting rule', () => {
    service.putFlag('target-flag', {
      key: 'target-flag',
      enabled: true,
      defaultTreatment: 'off',
      treatments: ['on', 'off'],
      targetingRules: [{
        attribute: 'role',
        operator: 'equals',
        value: 'admin',
        treatment: 'on',
      }],
      rolloutPercentage: 100,
    });

    const result = service.evaluateFlag('target-flag', {
      subject: { id: 'user-123', role: 'admin' },
      defaultTreatment: 'off',
    });

    expect(result.treatment).toBe('on');
    expect(result.reason).toBe('targeting_rule');
  });

  test('rollout exclusion', () => {
    service.putFlag('rollout-flag', {
      key: 'rollout-flag',
      enabled: true,
      defaultTreatment: 'off',
      treatments: ['on', 'off'],
      targetingRules: [],
      rolloutPercentage: 0,
    });

    const result = service.evaluateFlag('rollout-flag', {
      subject: { id: 'user-123' },
      defaultTreatment: 'off',
    });

    expect(result.reason).toBe('rollout');
  });

  test('flag disabled', () => {
    service.putFlag('disabled-flag', {
      key: 'disabled-flag',
      enabled: false,
      defaultTreatment: 'off',
      treatments: ['on', 'off'],
      targetingRules: [],
      rolloutPercentage: 100,
    });

    const result = service.evaluateFlag('disabled-flag', {
      subject: { id: 'user-123' },
      defaultTreatment: 'off',
    });

    expect(result.reason).toBe('flag_disabled');
  });

  test('watch config', (done) => {
    service.put('watch-test', {
      value: { data: 'v1' },
      contentType: 'application/json',
    });

    const unsubscribe = service.watch('watch-test', (config) => {
      expect(config.version).toBe(2);
      unsubscribe();
      done();
    });

    service.put('watch-test', {
      value: { data: 'v2' },
      contentType: 'application/json',
    });
  });
});

describe('HTTP API', () => {
  test('health check', async () => {
    const { app } = createApp();
    const res = await request(app).get('/__config/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('put and get config', async () => {
    const { app } = createApp();
    
    const putRes = await request(app)
      .put('/config/test-key')
      .send({ value: { maxRetries: 3 }, contentType: 'application/json' });
    expect(putRes.status).toBe(201);

    const getRes = await request(app).get('/config/test-key');
    expect(getRes.status).toBe(200);
    expect(getRes.body.version).toBe(1);
  });

  test('get config not found', async () => {
    const { app } = createApp();
    const res = await request(app).get('/config/nonexistent');
    expect(res.status).toBe(404);
  });

  test('version conflict', async () => {
    const { app } = createApp();
    
    await request(app)
      .put('/config/version-test')
      .send({ value: { data: 'v1' }, contentType: 'application/json' });

    const res = await request(app)
      .put('/config/version-test')
      .send({ value: { data: 'v2' }, contentType: 'application/json', expectedVersion: 99 });
    expect(res.status).toBe(409);
  });

  test('put and evaluate flag', async () => {
    const { app } = createApp();
    
    const putRes = await request(app)
      .put('/flags/test-flag')
      .send({
        key: 'test-flag',
        enabled: true,
        defaultTreatment: 'off',
        treatments: ['on', 'off'],
        targetingRules: [],
        rolloutPercentage: 100,
      });
    expect(putRes.status).toBe(201);

    const evalRes = await request(app)
      .post('/flags/test-flag/evaluate')
      .send({ subject: { id: 'user-123' }, defaultTreatment: 'off' });
    expect(evalRes.status).toBe(200);
    expect(evalRes.body.treatment).toBe('off');
  });

  test('evaluate flag not found', async () => {
    const { app } = createApp();
    const res = await request(app)
      .post('/flags/nonexistent/evaluate')
      .send({ subject: { id: 'user-123' }, defaultTreatment: 'off' });
    expect(res.status).toBe(404);
  });

  test('get flag', async () => {
    const { app } = createApp();
    
    await request(app)
      .put('/flags/get-flag')
      .send({
        key: 'get-flag',
        enabled: true,
        defaultTreatment: 'off',
        treatments: ['on', 'off'],
        targetingRules: [],
        rolloutPercentage: 100,
      });

    const res = await request(app).get('/flags/get-flag');
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('get-flag');
  });

  test('get flag not found', async () => {
    const { app } = createApp();
    const res = await request(app).get('/flags/nonexistent');
    expect(res.status).toBe(404);
  });

  test('contains targeting rule', () => {
    const service = new ConfigService();
    service.putFlag('contains-flag', {
      key: 'contains-flag',
      enabled: true,
      defaultTreatment: 'off',
      treatments: ['on', 'off'],
      targetingRules: [{
        attribute: 'email',
        operator: 'contains',
        value: '@company.com',
        treatment: 'on',
      }],
      rolloutPercentage: 100,
    });

    const result = service.evaluateFlag('contains-flag', {
      subject: { id: 'user-123', email: 'admin@company.com' },
      defaultTreatment: 'off',
    });

    expect(result.treatment).toBe('on');
    expect(result.reason).toBe('targeting_rule');
  });

  test('get history', () => {
    const service = new ConfigService();
    service.put('history-test', {
      value: { data: 'v1' },
      contentType: 'application/json',
    });
    service.put('history-test', {
      value: { data: 'v2' },
      contentType: 'application/json',
    });

    const history = service.getHistory('history-test');
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);
  });

  test('watch service callback fires on update', (done) => {
    const service = new ConfigService();
    service.put('watch-cb', { value: { data: 'v1' }, contentType: 'application/json' });

    const unsubscribe = service.watch('watch-cb', (config) => {
      expect(config.version).toBe(2);
      unsubscribe();
      done();
    });

    service.put('watch-cb', { value: { data: 'v2' }, contentType: 'application/json' });
  });
});
