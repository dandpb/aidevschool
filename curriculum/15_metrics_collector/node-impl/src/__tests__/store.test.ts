import { describe, it, expect } from 'vitest';
import { MetricStore } from '../store';

describe('MetricStore', () => {
  it('records counter and queries sum', () => {
    const store = new MetricStore(1000);
    store.record({ name: 'reqs', type: 'counter', value: 1, timestamp: new Date(), labels: {} });
    store.record({ name: 'reqs', type: 'counter', value: 2, timestamp: new Date(), labels: {} });
    expect(store.query('reqs', 'counter', {}, undefined, undefined, 'sum')).toBe(3);
  });

  it('records gauge and queries avg', () => {
    const store = new MetricStore(1000);
    store.record({ name: 'cpu', type: 'gauge', value: 10, timestamp: new Date(), labels: {} });
    store.record({ name: 'cpu', type: 'gauge', value: 20, timestamp: new Date(), labels: {} });
    expect(store.query('cpu', 'gauge', {}, undefined, undefined, 'avg')).toBe(15);
  });

  it('records histogram and queries percentile', () => {
    const store = new MetricStore(1000);
    for (let i = 0; i < 10; i++) {
      store.record({ name: 'lat', type: 'histogram', value: i * 0.1, timestamp: new Date(), labels: {} });
    }
    expect(store.histogramPercentile('lat', {}, 0.95)).toBeGreaterThan(0);
  });

  it('records timer and queries percentile', () => {
    const store = new MetricStore(1000);
    store.record({ name: 'dur', type: 'timer', value: 0.01, timestamp: new Date(), labels: {} });
    store.record({ name: 'dur', type: 'timer', value: 0.05, timestamp: new Date(), labels: {} });
    expect(store.histogramPercentile('dur', {}, 0.50)).toBeGreaterThan(0);
  });

  it('queries with time range', () => {
    const store = new MetricStore(1000);
    const now = new Date();
    store.record({ name: 'cpu', type: 'gauge', value: 10, timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), labels: {} });
    store.record({ name: 'cpu', type: 'gauge', value: 20, timestamp: now, labels: {} });
    expect(store.query('cpu', 'gauge', {}, new Date(now.getTime() - 60 * 60 * 1000), new Date(now.getTime() + 60 * 60 * 1000), 'sum')).toBe(20);
  });

  it('creates alert and evaluates', () => {
    const store = new MetricStore(1000);
    store.createAlert({ ruleId: 'rule1', name: 'high-cpu', enabled: true, query: 'avg(cpu)', operator: 'gt', threshold: 5, windowSeconds: 300, severity: 'warning' });
    store.record({ name: 'cpu', type: 'gauge', value: 10, timestamp: new Date(), labels: {} });
    store.evaluateAlerts();
    expect(store.events.length).toBe(1);
  });

  it('computes percentiles', () => {
    const store = new MetricStore(1000);
    for (let i = 0; i < 100; i++) {
      store.record({ name: 'lat', type: 'gauge', value: i, timestamp: new Date(), labels: {} });
    }
    expect(store.query('lat', 'gauge', {}, undefined, undefined, 'p50')).toBe(49);
    expect(store.query('lat', 'gauge', {}, undefined, undefined, 'p95')).toBe(94);
    expect(store.query('lat', 'gauge', {}, undefined, undefined, 'p99')).toBe(98);
  });

  it('evicts old samples', () => {
    const store = new MetricStore(3);
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      store.record({ name: 'cpu', type: 'gauge', value: i, timestamp: new Date(now.getTime() + i * 1000), labels: {} });
    }
    expect(store.query('cpu', 'gauge', {}, undefined, undefined, 'count')).toBe(3);
  });

  it('computes min and max', () => {
    const store = new MetricStore(1000);
    store.record({ name: 'cpu', type: 'gauge', value: 10, timestamp: new Date(), labels: {} });
    store.record({ name: 'cpu', type: 'gauge', value: 5, timestamp: new Date(), labels: {} });
    store.record({ name: 'cpu', type: 'gauge', value: 20, timestamp: new Date(), labels: {} });
    expect(store.query('cpu', 'gauge', {}, undefined, undefined, 'min')).toBe(5);
    expect(store.query('cpu', 'gauge', {}, undefined, undefined, 'max')).toBe(20);
  });

  it('prometheus export', () => {
    const store = new MetricStore(1000);
    store.record({ name: 'cpu', type: 'gauge', value: 10, timestamp: new Date(), labels: {} });
    expect(store.prometheusExport()).toContain('cpu');
  });

  it('histogram percentile no data', () => {
    const store = new MetricStore(1000);
    expect(store.histogramPercentile('nonexistent', {}, 0.95)).toBe(0);
  });
});
