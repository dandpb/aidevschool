import { createHash } from 'node:crypto';

export enum EvictionPolicy {
  Lru = 'lru',
  Lfu = 'lfu',
}

export class CacheError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class NodeInfo {
  constructor(public readonly id: string, public readonly address = '') {}
}

export type Loader = (key: string) => Promise<string> | string;
export type Writer = (key: string, value: string) => Promise<void> | void;

export class Config {
  shards: NodeInfo[];
  capacityEntries = 128;
  maxValueBytes = 1024 * 1024;
  evictionPolicy = EvictionPolicy.Lru;
  virtualNodes = 32;
  defaultTtlMs = 0;
  loader?: Loader;
  writer?: Writer;

  constructor(public readonly nodeId: string) {
    this.shards = [new NodeInfo(nodeId)];
  }

  withCapacityEntries(value: number): this {
    this.capacityEntries = value;
    return this;
  }

  withMaxValueBytes(value: number): this {
    this.maxValueBytes = value;
    return this;
  }

  withEvictionPolicy(value: EvictionPolicy): this {
    this.evictionPolicy = value;
    return this;
  }

  withDefaultTtlMs(value: number): this {
    this.defaultTtlMs = value;
    return this;
  }

  withLoader(value: Loader): this {
    this.loader = value;
    return this;
  }

  withWriter(value: Writer): this {
    this.writer = value;
    return this;
  }
}

type Entry = {
  key: string;
  namespace?: string;
  value: string;
  createdAt: number;
  accessedAt: number;
  accessSeq: number;
  expiresAt?: number;
  accessCount: number;
  version: number;
};

export type Metrics = {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
  invalidations: number;
  loaderCalls: number;
  singleflightCoalesces: number;
  membershipChanges: number;
};

export type GetResult = {
  key: string;
  value?: string;
  hit: boolean;
  loaded: boolean;
  coalesced: boolean;
  ttlRemainingMs: number;
  shardId: string;
  nodeId: string;
  version: number;
};

export type SetOptions = { namespace?: string; ttlMs?: number; writeThrough?: boolean };
export type SetResult = { key: string; stored: boolean; version: number; evicted: string[]; shardId: string; nodeId: string };
export type DeleteResult = { key: string; deleted: boolean; reason?: string; shardId: string; nodeId: string };

export class Invalidation {
  private constructor(readonly kind: 'key' | 'namespace' | 'prefix', readonly value: string) {}
  static key(value: string): Invalidation {
    return new Invalidation('key', value);
  }
  static namespace(value: string): Invalidation {
    return new Invalidation('namespace', value);
  }
  static prefix(value: string): Invalidation {
    return new Invalidation('prefix', value);
  }
}

type Flight = Promise<string>;

export class Cache {
  private entries = new Map<string, Entry>();
  private readonly ring: HashRing;
  private readonly inflight = new Map<string, Flight>();
  private readonly counters: Metrics = { hits: 0, misses: 0, evictions: 0, expirations: 0, invalidations: 0, loaderCalls: 0, singleflightCoalesces: 0, membershipChanges: 0 };
  private shutdownFlag = false;
  private accessSeq = 0;

  constructor(private readonly config: Config) {
    this.ring = new HashRing(config.shards, config.virtualNodes);
  }

  async set(key: string, value: string, options: SetOptions = {}): Promise<SetResult> {
    this.validate(key, value, options.ttlMs);
    if (options.writeThrough && this.config.writer) {
      await this.config.writer(key, value);
    }
    const now = Date.now();
    const ttlMs = options.ttlMs ?? this.config.defaultTtlMs;
    const old = this.entries.get(key);
    this.entries.set(key, { key, namespace: options.namespace, value, createdAt: old?.createdAt ?? now, accessedAt: now, accessSeq: this.nextAccessSeq(), expiresAt: ttlMs > 0 ? now + ttlMs : undefined, accessCount: 1, version: (old?.version ?? 0) + 1 });
    const evicted = this.evict(key);
    const owner = this.ring.owner(key);
    console.log(JSON.stringify({ level: 'info', event: 'cache_set', key, nodeId: owner.id, evicted: evicted.length }));
    return { key, stored: true, version: (old?.version ?? 0) + 1, evicted, shardId: owner.id, nodeId: owner.id };
  }

  async get(key: string, options: { loadOnMiss?: boolean } | boolean = {}): Promise<GetResult> {
    this.validateKey(key);
    const local = this.getLocal(key);
    if (local) return local;
    const loadOnMiss = typeof options === 'boolean' ? options : options.loadOnMiss === true;
    if (!loadOnMiss || !this.config.loader) return this.miss(key);
    return this.loadSingleflight(key);
  }

  async delete(key: string): Promise<DeleteResult> {
    this.validateKey(key);
    const deleted = this.entries.delete(key);
    if (deleted) this.counters.invalidations += 1;
    const owner = this.ring.owner(key);
    return { key, deleted, reason: deleted ? undefined : 'not_found', shardId: owner.id, nodeId: owner.id };
  }

  async invalidate(scope: Invalidation): Promise<number> {
    const keys = [...this.entries.values()].filter((entry) => this.matches(scope, entry)).map((entry) => entry.key);
    for (const key of keys) this.entries.delete(key);
    this.counters.invalidations += keys.length;
    return keys.length;
  }

  metrics(): Metrics {
    return { ...this.counters };
  }

  async shutdown(): Promise<void> {
    this.shutdownFlag = true;
    console.log(JSON.stringify({ level: 'info', event: 'shutdown' }));
  }

  isShutdown(): boolean {
    return this.shutdownFlag;
  }

  ringInfo(): { ringVersion: number; virtualNodes: number; nodes: NodeInfo[] } {
    return { ringVersion: this.ring.version, virtualNodes: this.config.virtualNodes, nodes: this.config.shards };
  }

  private getLocal(key: string): GetResult | undefined {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry) {
      this.counters.misses += 1;
      return undefined;
    }
    if (entry.expiresAt !== undefined && now >= entry.expiresAt) {
      this.entries.delete(key);
      this.counters.misses += 1;
      this.counters.expirations += 1;
      return undefined;
    }
    entry.accessedAt = now;
    entry.accessSeq = this.nextAccessSeq();
    entry.accessCount += 1;
    this.counters.hits += 1;
    const owner = this.ring.owner(key);
    return { key, value: entry.value, hit: true, loaded: false, coalesced: false, ttlRemainingMs: entry.expiresAt === undefined ? 0 : Math.max(0, entry.expiresAt - now), shardId: owner.id, nodeId: owner.id, version: entry.version };
  }

  private async loadSingleflight(key: string): Promise<GetResult> {
    const existing = this.inflight.get(key);
    if (existing) {
      this.counters.singleflightCoalesces += 1;
      const value = await existing;
      return this.loadedResult(key, value, true);
    }
    this.counters.loaderCalls += 1;
    const flight = Promise.resolve(this.config.loader?.(key)).then((value) => {
      if (value === undefined) throw new CacheError('BACKING_STORE', 'backing store unavailable');
      return value;
    });
    this.inflight.set(key, flight);
    try {
      const value = await flight;
      await this.set(key, value, { ttlMs: this.config.defaultTtlMs || undefined });
      return this.loadedResult(key, value, false);
    } finally {
      this.inflight.delete(key);
    }
  }

  private loadedResult(key: string, value: string, coalesced: boolean): GetResult {
    const owner = this.ring.owner(key);
    return { key, value, hit: false, loaded: true, coalesced, ttlRemainingMs: this.config.defaultTtlMs, shardId: owner.id, nodeId: owner.id, version: 1 };
  }

  private miss(key: string): GetResult {
    return { key, hit: false, loaded: false, coalesced: false, ttlRemainingMs: 0, shardId: '', nodeId: '', version: 0 };
  }

  private validate(key: string, value: string, ttlMs?: number): void {
    this.validateKey(key);
    if (Buffer.byteLength(value) > this.config.maxValueBytes) throw new CacheError('VALUE_TOO_LARGE', 'value too large');
    if (ttlMs !== undefined && ttlMs <= 0) throw new CacheError('INVALID_TTL', 'ttl must be positive');
  }

  private validateKey(key: string): void {
    if (key.length === 0 || Buffer.byteLength(key) > 512) throw new CacheError('INVALID_KEY', 'invalid key');
  }

  private evict(protectedKey: string): string[] {
    const evicted: string[] = [];
    while (this.entries.size > this.config.capacityEntries) {
      const victim = [...this.entries.values()]
        .filter((entry) => entry.key !== protectedKey)
        .sort((left, right) => this.compareVictims(left, right))[0];
      if (!victim) break;
      this.entries.delete(victim.key);
      this.counters.evictions += 1;
      evicted.push(victim.key);
    }
    return evicted;
  }

  private compareVictims(left: Entry, right: Entry): number {
    if (this.config.evictionPolicy === EvictionPolicy.Lfu && left.accessCount !== right.accessCount) return left.accessCount - right.accessCount;
    if (left.accessSeq !== right.accessSeq) return left.accessSeq - right.accessSeq;
    if (left.accessedAt !== right.accessedAt) return left.accessedAt - right.accessedAt;
    if (left.createdAt !== right.createdAt) return left.createdAt - right.createdAt;
    return left.key.localeCompare(right.key);
  }

  private matches(scope: Invalidation, entry: Entry): boolean {
    if (scope.kind === 'key') return entry.key === scope.value;
    if (scope.kind === 'namespace') return entry.namespace === scope.value;
    return entry.key.startsWith(scope.value);
  }

  private nextAccessSeq(): number {
    this.accessSeq += 1;
    return this.accessSeq;
  }
}

export class HashRing {
  private tokens: Array<{ token: bigint; node: NodeInfo }> = [];
  version = 0;

  constructor(nodes: NodeInfo[], private readonly replicas: number) {
    for (const node of nodes) this.add(node);
  }

  add(node: NodeInfo): void {
    for (let index = 0; index < this.replicas; index += 1) {
      this.tokens.push({ token: hash(`${node.id}-${index}`), node });
    }
    this.tokens.sort((left, right) => (left.token < right.token ? -1 : left.token > right.token ? 1 : 0));
    this.version += 1;
  }

  owner(key: string): NodeInfo {
    const token = hash(key);
    return this.tokens.find((entry) => entry.token >= token)?.node ?? this.tokens[0]?.node ?? new NodeInfo('unavailable');
  }

  tokensFor(nodeId: string): bigint[] {
    return this.tokens.filter((entry) => entry.node.id === nodeId).map((entry) => entry.token);
  }
}

export class MemoryStore {
  private writesFail = false;

  constructor(private readonly data = new Map<string, string>()) {}

  load(key: string): string {
    const value = this.data.get(key);
    if (value === undefined) throw new CacheError('BACKING_STORE', 'backing store unavailable');
    return value;
  }

  write(key: string, value: string): void {
    if (this.writesFail) throw new CacheError('BACKING_STORE', 'backing store unavailable');
    this.data.set(key, value);
  }

  failWrites(value: boolean): void {
    this.writesFail = value;
  }
}

export type HttpResponse = { status: number; body: string };

export class HttpApp {
  constructor(private readonly cache: Cache) {}

  async handle(method: string, path: string, body = ''): Promise<HttpResponse> {
    if (path === '/health') return json(200, { status: 'ok' });
    if (path === '/metrics') return json(200, this.cache.metrics());
    if (path === '/cluster/ring') return json(200, this.cache.ringInfo());
    if (path === '/cache/invalidate' && method === 'POST') {
      const parsed = parseJson(body);
      const scopes = ['key', 'namespace', 'prefix'].filter((key) => typeof parsed[key] === 'string');
      if (scopes.length !== 1) return json(400, { code: 'INVALIDATION' });
      const scope = scopes[0] === 'key' ? Invalidation.key(String(parsed.key)) : scopes[0] === 'namespace' ? Invalidation.namespace(String(parsed.namespace)) : Invalidation.prefix(String(parsed.prefix));
      return json(202, { accepted: true, matchedApprox: await this.cache.invalidate(scope) });
    }
    if (!path.startsWith('/cache/')) return json(404, { code: 'NOT_FOUND' });
    const key = path.slice('/cache/'.length).split('?')[0] ?? '';
    try {
      if (method === 'GET') {
        const result = await this.cache.get(key, { loadOnMiss: path.includes('loadOnMiss=true') });
        return json(result.hit || result.loaded ? 200 : 404, result);
      }
      if (method === 'PUT') {
        const parsed = parseJson(body);
        const result = await this.cache.set(key, String(parsed.value ?? ''), { ttlMs: numberOrUndefined(parsed.ttlMs), namespace: stringOrUndefined(parsed.namespace), writeThrough: parsed.writeThrough === true });
        return json(result.version === 1 ? 201 : 200, result);
      }
      if (method === 'DELETE') return json(200, await this.cache.delete(key));
      return json(405, { code: 'METHOD_NOT_ALLOWED' });
    } catch (error) {
      if (error instanceof CacheError && error.code === 'VALUE_TOO_LARGE') return json(413, { code: error.code, message: error.message });
      return json(400, { code: error instanceof CacheError ? error.code : 'ERROR' });
    }
  }
}

function hash(value: string): bigint {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 16);
  return BigInt(`0x${hex}`);
}

function json(status: number, value: unknown): HttpResponse {
  return { status, body: JSON.stringify(value) };
}

function parseJson(body: string): Record<string, unknown> {
  const parsed: unknown = body.length > 0 ? JSON.parse(body) : {};
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
