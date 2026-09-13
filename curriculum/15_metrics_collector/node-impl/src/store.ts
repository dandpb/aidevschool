export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface MetricSample {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface HistogramBucket {
  upperBound: number;
  cumulativeCount: number;
}

export interface HistogramData {
  buckets: HistogramBucket[];
  count: number;
  sum: number;
}

export interface AlertRule {
  ruleId: string;
  name: string;
  enabled: boolean;
  query: string;
  operator: string;
  threshold: number;
  windowSeconds: number;
  severity: string;
}

export interface AlertEvent {
  alertEventId: string;
  ruleId: string;
  triggeredAt: Date;
  observedValue: number;
  threshold: number;
  severity: string;
}

export interface AlertState {
  ruleId: string;
  name: string;
  status: 'ok' | 'firing';
  currentValue: number | null;
  threshold: number;
  lastEvaluatedAt: Date;
}

export interface SeriesRef {
  name: string;
  type: MetricType;
  labels: Record<string, string>;
}

export interface QueryResult {
  matched: boolean;
  type: MetricType | null;
  value: number | null;
}

function seriesKey(name: string, type: MetricType, labels: Record<string, string>): string {
  const labelParts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  return [type, name, ...labelParts].join(',');
}

function aggregate(values: number[], aggregation: string): number {
  if (values.length === 0) return 0;

  switch (aggregation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    case 'p50':
    case 'p95':
    case 'p99': {
      const sorted = [...values].sort((a, b) => a - b);
      const pct = aggregation === 'p50' ? 0.50 : aggregation === 'p95' ? 0.95 : 0.99;
      const idx = Math.floor((sorted.length - 1) * pct);
      return sorted[idx];
    }
    default:
      return 0;
  }
}

function histogramAggregate(h: HistogramData, aggregation: string): number | null {
  switch (aggregation) {
    case 'count':
      return h.count;
    case 'sum':
      return h.sum;
    case 'avg':
      return h.count === 0 ? null : h.sum / h.count;
    case 'p50':
    case 'p95':
    case 'p99': {
      if (h.count === 0) return null;
      const pct = aggregation === 'p50' ? 0.5 : aggregation === 'p95' ? 0.95 : 0.99;
      const target = Math.ceil(h.count * pct);
      for (const bucket of h.buckets) {
        if (bucket.upperBound === Number.MAX_VALUE) break;
        if (bucket.cumulativeCount >= target) return bucket.upperBound;
      }
      return null;
    }
    default:
      return null;
  }
}

export class MetricStore {
  private samples: Map<string, TimeSeriesPoint[]> = new Map();
  private histograms: Map<string, HistogramData> = new Map();
  private alerts: Map<string, AlertRule> = new Map();
  private alertStates: Map<string, AlertState> = new Map();
  private seriesRegistry: Map<string, SeriesRef> = new Map();
  public events: AlertEvent[] = [];

  constructor(private maxSize: number) {}

  record(sample: MetricSample): void {
    const key = seriesKey(sample.name, sample.type, sample.labels);
    if (!this.seriesRegistry.has(key)) {
      this.seriesRegistry.set(key, { name: sample.name, type: sample.type, labels: sample.labels });
    }

    switch (sample.type) {
      case 'counter':
      case 'gauge': {
        let points = this.samples.get(key) ?? [];
        if (points.length >= this.maxSize) {
          points = points.slice(1);
        }
        points.push({ timestamp: sample.timestamp, value: sample.value });
        this.samples.set(key, points);
        break;
      }
      case 'histogram':
      case 'timer': {
        let h = this.histograms.get(key);
        if (!h) {
          h = {
            buckets: [
              0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, Number.MAX_VALUE,
            ].map((b) => ({ upperBound: b, cumulativeCount: 0 })),
            count: 0,
            sum: 0,
          };
          this.histograms.set(key, h);
        }
        h.count++;
        h.sum += sample.value;
        for (const bucket of h.buckets) {
          if (sample.value <= bucket.upperBound) {
            bucket.cumulativeCount++;
          }
        }
        break;
      }
    }
  }

  query(
    name: string,
    metricType: MetricType,
    labels: Record<string, string>,
    start: Date | undefined,
    end: Date | undefined,
    aggregation: string,
  ): number {
    const key = seriesKey(name, metricType, labels);
    const points = this.samples.get(key) ?? [];

    const values = points
      .filter((p) => (!start || p.timestamp >= start) && (!end || p.timestamp <= end))
      .map((p) => p.value);

    return aggregate(values, aggregation);
  }

  queryByName(
    name: string,
    labels: Record<string, string>,
    start: Date | undefined,
    end: Date | undefined,
    aggregation: string,
  ): QueryResult {
    for (const metricType of ['counter', 'gauge'] as const) {
      const key = seriesKey(name, metricType, labels);
      const points = this.samples.get(key);
      if (points && points.length > 0) {
        return {
          matched: true,
          type: metricType,
          value: this.query(name, metricType, labels, start, end, aggregation),
        };
      }
    }
    for (const metricType of ['histogram', 'timer'] as const) {
      const key = seriesKey(name, metricType, labels);
      const h = this.histograms.get(key);
      if (h && h.count > 0) {
        return { matched: true, type: metricType, value: histogramAggregate(h, aggregation) };
      }
    }
    return { matched: false, type: null, value: null };
  }

  listSeries(): SeriesRef[] {
    return [...this.seriesRegistry.values()];
  }

  seriesPoints(
    name: string,
    metricType: MetricType,
    labels: Record<string, string>,
    start: Date | undefined,
    end: Date | undefined,
  ): TimeSeriesPoint[] {
    const key = seriesKey(name, metricType, labels);
    const points = this.samples.get(key) ?? [];
    return points.filter((p) => (!start || p.timestamp >= start) && (!end || p.timestamp <= end));
  }

  histogramFor(name: string, metricType: MetricType, labels: Record<string, string>): HistogramData | undefined {
    return this.histograms.get(seriesKey(name, metricType, labels));
  }

  activeSeriesCount(): number {
    return this.seriesRegistry.size;
  }

  histogramPercentile(name: string, labels: Record<string, string>, percentile: number): number {
    const key = seriesKey(name, 'histogram', labels);
    let h = this.histograms.get(key);
    if (!h || h.count === 0) {
      const timerKey = seriesKey(name, 'timer', labels);
      h = this.histograms.get(timerKey);
    }
    if (!h || h.count === 0) return 0;

    const target = Math.ceil(h.count * percentile);
    for (const bucket of h.buckets) {
      if (bucket.cumulativeCount >= target) {
        return bucket.upperBound;
      }
    }
    return 0;
  }

  createAlert(rule: AlertRule): void {
    this.alerts.set(rule.ruleId, rule);
  }

  listAlerts(): AlertRule[] {
    return [...this.alerts.values()];
  }

  listAlertStates(): AlertState[] {
    return [...this.alertStates.values()];
  }

  listAlertEvents(ruleId?: string, limit = 100): AlertEvent[] {
    const filtered = ruleId ? this.events.filter((e) => e.ruleId === ruleId) : this.events;
    return filtered.slice(-limit);
  }

  evaluateAlerts(): void {
    for (const rule of this.alerts.values()) {
      if (!rule.enabled) continue;

      const match = rule.query.match(/^(\w+)\((\w+)\)$/);
      if (!match) continue;
      const [, agg, name] = match;

      const now = new Date();
      const start = new Date(now.getTime() - rule.windowSeconds * 1000);
      const value = this.aggregateQuery(name, agg, start, now);

      let triggered = false;
      switch (rule.operator) {
        case 'gt':
          triggered = value > rule.threshold;
          break;
        case 'gte':
          triggered = value >= rule.threshold;
          break;
        case 'lt':
          triggered = value < rule.threshold;
          break;
        case 'lte':
          triggered = value <= rule.threshold;
          break;
      }

      this.alertStates.set(rule.ruleId, {
        ruleId: rule.ruleId,
        name: rule.name,
        status: triggered ? 'firing' : 'ok',
        currentValue: value,
        threshold: rule.threshold,
        lastEvaluatedAt: now,
      });

      if (triggered) {
        this.events.push({
          alertEventId: `evt_${Date.now()}_${this.events.length}`,
          ruleId: rule.ruleId,
          triggeredAt: new Date(),
          observedValue: value,
          threshold: rule.threshold,
          severity: rule.severity,
        });
      }
    }
  }

  private aggregateQuery(name: string, aggregation: string, start: Date, end: Date): number {
    const values: number[] = [];
    for (const [key, points] of this.samples) {
      if (key.includes(name)) {
        for (const p of points) {
          if (p.timestamp >= start && p.timestamp <= end) {
            values.push(p.value);
          }
        }
      }
    }
    return aggregate(values, aggregation);
  }

  prometheusExport(): string {
    const lines: string[] = [];

    for (const [key, points] of this.samples) {
      const parts = key.split(',');
      if (parts.length < 2) continue;
      const name = parts[1];
      const value = points.length > 0 ? points[points.length - 1].value : 0;
      lines.push(`# TYPE ${name} ${parts[0]}`);
      const labelStr = parts.length > 2 && parts[2] ? `{${parts.slice(2).join(',')}}` : '';
      lines.push(`${name}${labelStr} ${value}`);
    }

    for (const [key, h] of this.histograms) {
      const parts = key.split(',');
      if (parts.length < 2) continue;
      const name = parts[1];
      lines.push(`# TYPE ${name} histogram`);
      for (const bucket of h.buckets) {
        lines.push(`${name}_bucket{le="${bucket.upperBound}"} ${bucket.cumulativeCount}`);
      }
      lines.push(`${name}_sum ${h.sum}`);
      lines.push(`${name}_count ${h.count}`);
    }

    return lines.join('\n');
  }
}
