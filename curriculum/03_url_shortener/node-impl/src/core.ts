import { createHash } from 'node:crypto';

const base62Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const maxUrlLength = 2048;
const minAliasLength = 3;
const maxAliasLength = 32;
const maxBatchSize = 100;
const reservedAliases = new Set(['urls', 'shorten', 'health', 'healthz']);

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export interface ShortenRequest {
  url: string;
  custom_alias?: string;
  expires_at?: string;
}

export interface UrlRecord {
  code: string;
  short_url: string;
  original_url: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  deleted_at: string | null;
  clicks: number;
}

export interface ClickEvent {
  clicked_at: string;
  referrer?: string;
  user_agent?: string;
  client_ip_hash?: string;
}

export interface StatsResponse {
  code: string;
  original_url: string;
  total_clicks: number;
  created_at: string;
  last_clicked_at: string | null;
  recent_clicks: ClickEvent[];
}

export interface ListResponse {
  items: UrlRecord[];
  next_cursor: string | null;
}

export function validateUrl(raw: string): void {
  if (raw.length === 0) {
    throw new AppError(400, 'invalid_url', 'URL must use http or https and be absolute.');
  }
  if (raw.length > maxUrlLength) {
    throw new AppError(400, 'max_url_length_exceeded', 'URL must be no longer than 2048 characters.');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AppError(400, 'invalid_url', 'URL must use http or https and be absolute.');
  }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.hostname.length === 0) {
    throw new AppError(400, 'invalid_url', 'URL must use http or https and be absolute.');
  }
}

export function validateAlias(alias: string): void {
  if (
    alias.length < minAliasLength ||
    alias.length > maxAliasLength ||
    reservedAliases.has(alias.toLowerCase()) ||
    !/^[0-9A-Za-z]+$/.test(alias)
  ) {
    throw new AppError(400, 'invalid_alias', 'Alias must be 3-32 base62 characters and not reserved.');
  }
}

export function base62(value: bigint): string {
  if (value === 0n) {
    return '0';
  }
  let current = value;
  let out = '';
  while (current > 0n) {
    out = base62Chars[Number(current % 62n)] + out;
    current /= 62n;
  }
  return out.padStart(6, '0');
}

export class UrlStore {
  private readonly urls = new Map<string, UrlRecord>();
  private readonly clicks = new Map<string, ClickEvent[]>();
  private counter = 0n;

  constructor(private readonly now: () => Date = () => new Date()) {}

  create(request: ShortenRequest, baseUrl: string): UrlRecord {
    validateUrl(request.url);
    if (request.custom_alias !== undefined) {
      validateAlias(request.custom_alias);
    }
    const expiresAt = this.parseExpiry(request.expires_at);
    const code = request.custom_alias ?? this.generateUniqueCode(request.url);
    if (this.urls.has(code)) {
      throw new AppError(409, 'alias_conflict', 'Alias already exists.');
    }
    const now = this.now().toISOString();
    const record: UrlRecord = {
      code,
      short_url: `${baseUrl.replace(/\/$/, '')}/${code}`,
      original_url: request.url,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
      deleted_at: null,
      clicks: 0
    };
    this.urls.set(code, record);
    return { ...record };
  }

  resolve(code: string): UrlRecord {
    const record = this.urls.get(code);
    if (record === undefined) {
      throw new AppError(404, 'code_not_found', 'Code was not found.');
    }
    if (record.deleted_at !== null) {
      throw new AppError(410, 'code_deleted', 'Code has been deleted.');
    }
    if (record.expires_at !== null && Date.parse(record.expires_at) <= this.now().getTime()) {
      throw new AppError(410, 'code_expired', 'Code has expired.');
    }
    return { ...record };
  }

  delete(code: string): void {
    const record = this.urls.get(code);
    if (record === undefined) {
      throw new AppError(404, 'code_not_found', 'Code was not found.');
    }
    if (record.deleted_at !== null) {
      throw new AppError(410, 'code_deleted', 'Code has been deleted.');
    }
    const now = this.now().toISOString();
    record.deleted_at = now;
    record.updated_at = now;
  }

  recordClick(code: string, event: ClickEvent): void {
    const record = this.urls.get(code);
    if (record === undefined || record.deleted_at !== null) {
      return;
    }
    record.clicks += 1;
    record.updated_at = this.now().toISOString();
    const events = this.clicks.get(code) ?? [];
    events.push(event);
    this.clicks.set(code, events);
  }

  stats(code: string): StatsResponse {
    const record = this.resolve(code);
    const recent = [...(this.clicks.get(code) ?? [])].slice(-10);
    return {
      code,
      original_url: record.original_url,
      total_clicks: record.clicks,
      created_at: record.created_at,
      last_clicked_at: recent.at(-1)?.clicked_at ?? null,
      recent_clicks: recent
    };
  }

  list(limit: number, cursor: string | undefined): ListResponse {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError(400, 'invalid_pagination', 'Limit must be between 1 and 100.');
    }
    const start = cursor === undefined ? 0 : Number.parseInt(cursor, 10);
    if (!Number.isInteger(start) || start < 0 || String(start) !== (cursor ?? '0')) {
      throw new AppError(400, 'invalid_pagination', 'Cursor is invalid.');
    }
    const items = [...this.urls.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const page = items.slice(start, start + limit).map((item) => ({ ...item }));
    const next = start + limit < items.length ? String(start + limit) : null;
    return { items: page, next_cursor: next };
  }

  private parseExpiry(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }
    const time = Date.parse(value);
    if (Number.isNaN(time)) {
      throw new AppError(400, 'invalid_url', 'expires_at must be an ISO timestamp.');
    }
    return new Date(time).toISOString();
  }

  private generateUniqueCode(originalUrl: string): string {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      this.counter += 1n;
      const hash = createHash('sha256').update(`${originalUrl}:${this.counter.toString()}`).digest('hex').slice(0, 12);
      const candidate = base62(BigInt(`0x${hash}`) + this.counter);
      if (!this.urls.has(candidate)) {
        return candidate;
      }
    }
    throw new AppError(500, 'code_generation_failed', 'Could not generate a unique code.');
  }
}

export class AnalyticsQueue {
  private readonly queue: Array<{ code: string; event: ClickEvent }> = [];
  private draining = false;

  constructor(private readonly store: UrlStore) {}

  enqueue(code: string, event: ClickEvent): void {
    this.queue.push({ code, event });
    if (!this.draining) {
      this.draining = true;
      setImmediate(() => this.drain());
    }
  }

  drain(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item !== undefined) {
        this.store.recordClick(item.code, item.event);
      }
    }
    this.draining = false;
  }
}

export class CreationRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now()
  ) {}

  allow(client: string): void {
    const cutoff = this.now() - this.windowMs;
    const bucket = (this.buckets.get(client) ?? []).filter((seen) => seen > cutoff);
    if (bucket.length >= this.limit) {
      throw new AppError(429, 'rate_limit_exceeded', 'Too many create requests.');
    }
    bucket.push(this.now());
    this.buckets.set(client, bucket);
  }
}

export function clickEvent(headers: Record<string, string | string[] | undefined>, clientKey: string, now: Date = new Date()): ClickEvent {
  const referrer = headerValue(headers.referer ?? headers.referrer);
  const userAgent = headerValue(headers['user-agent']);
  return {
    clicked_at: now.toISOString(),
    ...(referrer === undefined ? {} : { referrer: referrer.slice(0, maxUrlLength) }),
    ...(userAgent === undefined ? {} : { user_agent: userAgent.slice(0, 512) }),
    client_ip_hash: createHash('sha256').update(clientKey).digest('hex').slice(0, 16)
  };
}

export function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function maxBatchSizeLimit(): number {
  return maxBatchSize;
}
