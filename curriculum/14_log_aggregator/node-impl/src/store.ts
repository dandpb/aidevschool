export interface LogEntry {
  log_id: string;
  timestamp: string;
  ingested_at: string;
  level: string;
  message: string;
  source: LogSource;
  correlation_id?: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  attributes?: Record<string, unknown>;
}

export interface LogSource {
  service: string;
  host?: string;
  environment?: string;
  version?: string;
  labels?: Record<string, string>;
}

export class LogStore {
  private logs: LogEntry[] = [];

  constructor(private maxSize: number) {}

  ingest(entry: Omit<LogEntry, 'ingested_at'> & Partial<Pick<LogEntry, 'ingested_at'>>): void {
    const stored: LogEntry = {
      ...entry,
      log_id: entry.log_id || `${Date.now()}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      ingested_at: entry.ingested_at ?? new Date().toISOString(),
    };

    if (this.logs.length >= this.maxSize) {
      this.logs.shift();
    }
    this.logs.push(stored);
  }

  query(
    level?: string,
    source?: string,
    correlationId?: string,
    traceId?: string,
    filter?: string,
    start?: string,
    end?: string,
    limit = 100,
    orderDesc = false
  ): LogEntry[] {
    let results = this.logs.filter((entry) => {
      if (level && entry.level !== level) return false;
      if (source && entry.source.service !== source) return false;
      if (correlationId && entry.correlation_id !== correlationId) return false;
      if (traceId && entry.trace_id !== traceId) return false;
      if (filter && !entry.message.toLowerCase().includes(filter.toLowerCase())) return false;
      if (start && new Date(entry.timestamp) < new Date(start)) return false;
      if (end && new Date(entry.timestamp) > new Date(end)) return false;
      return true;
    });

    results.sort((a, b) => {
      const cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return orderDesc ? -cmp : cmp;
    });

    if (results.length > limit) {
      results = results.slice(0, limit);
    }
    return results;
  }

  getTrace(traceId: string): LogEntry[] {
    return this.logs
      .filter((entry) => entry.trace_id === traceId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  applyRetention(maxAgeMs: number): void {
    const cutoff = Date.now() - maxAgeMs;
    this.logs = this.logs.filter((entry) => new Date(entry.timestamp).getTime() > cutoff);
  }

  count(): number {
    return this.logs.length;
  }
}
