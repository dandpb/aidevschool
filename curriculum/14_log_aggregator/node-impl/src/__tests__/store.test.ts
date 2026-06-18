import { describe, it, expect } from 'vitest';
import { LogStore } from '../store';

describe('LogStore', () => {
  it('should ingest and query', () => {
    const store = new LogStore(100);
    store.ingest({ log_id: '1', timestamp: new Date().toISOString(), level: 'error', message: 'err', source: { service: 'svc' } });
    expect(store.count()).toBe(1);

    const results = store.query('error');
    expect(results.length).toBe(1);
    expect(results[0].message).toBe('err');
  });

  it('should filter by source', () => {
    const store = new LogStore(100);
    store.ingest({ log_id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'm1', source: { service: 'svc1' } });
    store.ingest({ log_id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'm2', source: { service: 'svc2' } });
    const results = store.query(undefined, 'svc1');
    expect(results.length).toBe(1);
  });

  it('should full-text search', () => {
    const store = new LogStore(100);
    store.ingest({ log_id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'payment processed', source: { service: 'svc' } });
    store.ingest({ log_id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'user login', source: { service: 'svc' } });
    const results = store.query(undefined, undefined, undefined, undefined, 'payment');
    expect(results.length).toBe(1);
  });

  it('should apply retention', () => {
    const store = new LogStore(100);
    store.ingest({ log_id: '1', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), level: 'info', message: 'old', source: { service: 'svc' } });
    store.ingest({ log_id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'new', source: { service: 'svc' } });
    store.applyRetention(60 * 60 * 1000);
    expect(store.count()).toBe(1);
  });

  it('should ring buffer', () => {
    const store = new LogStore(2);
    store.ingest({ log_id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'm1', source: { service: 'svc' } });
    store.ingest({ log_id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'm2', source: { service: 'svc' } });
    store.ingest({ log_id: '3', timestamp: new Date().toISOString(), level: 'info', message: 'm3', source: { service: 'svc' } });
    expect(store.count()).toBe(2);
  });
});
