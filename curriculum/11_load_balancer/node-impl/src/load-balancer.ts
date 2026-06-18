import crypto from 'node:crypto';
import http, { IncomingMessage, Server, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import httpProxy from 'http-proxy';

export type RoutingAlgorithm = 'round_robin' | 'least_connections';
export type HealthState = 'healthy' | 'unhealthy' | 'unknown';
export type CircuitState = 'closed' | 'open' | 'half_open';

export interface BackendConfig {
  id: string;
  url: string;
  weight?: number;
  healthPath?: string;
  maxConnections?: number;
}

export interface LoadBalancerConfig {
  listenAddress?: string;
  routingAlgorithm: RoutingAlgorithm;
  healthCheckIntervalMs: number;
  healthCheckTimeoutMs: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  failureThreshold: number;
  openDurationMs: number;
  backends: BackendConfig[];
}

export interface BackendSnapshot {
  id: string;
  url: string;
  weight: number;
  health: HealthState;
  activeConnections: number;
  totalRequests: number;
  failedRequests: number;
  circuitState: CircuitState;
}

interface BackendRuntime extends BackendSnapshot {
  healthPath: string;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  openedAt: number;
  halfOpenProbeInFlight: boolean;
}

export class LoadBalancer {
  private readonly backends = new Map<string, BackendRuntime>();
  private readonly proxy = httpProxy.createProxyServer({ changeOrigin: true, xfwd: false, proxyTimeout: 5000 });
  private roundRobinCursor = 0;
  private timer: NodeJS.Timeout | null = null;
  private server: Server | null = null;
  private readonly startedAt = Date.now();
  private readonly metrics = { requestsTotal: 0, requestsInFlight: 0, responsesByStatusClass: new Map<string, number>(), backendRequests: new Map<string, number>() };

  constructor(private readonly config: LoadBalancerConfig, private readonly logger: Pick<Console, 'log' | 'error'> = console) {
    if (config.backends.length === 0) throw new Error('at least one backend is required');
    if (config.healthCheckIntervalMs < 10) throw new Error('healthCheckIntervalMs must be >= 10');
    for (const backend of config.backends) this.addBackend(backend);
    this.proxy.on('proxyReq', (proxyReq, req) => {
      const requestId = req.headers['x-request-id']?.toString() ?? crypto.randomUUID();
      proxyReq.setHeader('x-request-id', requestId);
      proxyReq.setHeader('x-forwarded-host', req.headers.host ?? '');
      proxyReq.setHeader('x-forwarded-proto', 'http');
      proxyReq.setHeader('x-forwarded-for', appendForwardedFor(req));
    });
  }

  addBackend(config: BackendConfig): void {
    if (!config.id.trim()) throw new Error('backend id is required');
    if (this.backends.has(config.id)) throw new Error(`duplicate backend id ${config.id}`);
    const parsed = new URL(config.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('backend url must be http(s)');
    const weight = config.weight ?? 1;
    if (!Number.isInteger(weight) || weight < 1) throw new Error('backend weight must be >= 1');
    this.backends.set(config.id, { id: config.id, url: parsed.toString().replace(/\/$/, ''), weight, healthPath: config.healthPath ?? '/health', health: 'unknown', activeConnections: 0, totalRequests: 0, failedRequests: 0, circuitState: 'closed', consecutiveSuccesses: 0, consecutiveFailures: 0, openedAt: 0, halfOpenProbeInFlight: false });
  }

  removeBackend(id: string): boolean { return this.backends.delete(id); }
  snapshots(): BackendSnapshot[] { return [...this.backends.values()].map(({ id, url, weight, health, activeConnections, totalRequests, failedRequests, circuitState }) => ({ id, url, weight, health, activeConnections, totalRequests, failedRequests, circuitState })); }
  metricsSnapshot() { return { requestsTotal: this.metrics.requestsTotal, requestsInFlight: this.metrics.requestsInFlight, responsesByStatusClass: Object.fromEntries(this.metrics.responsesByStatusClass), backendRequests: Object.fromEntries(this.metrics.backendRequests), routingAlgorithm: this.config.routingAlgorithm }; }

  selectBackend(): BackendSnapshot | null {
    const eligible = this.weightedEligible();
    if (eligible.length === 0) return null;
    if (this.config.routingAlgorithm === 'least_connections') {
      return eligible.reduce((best, candidate) => candidate.activeConnections < best.activeConnections || (candidate.activeConnections === best.activeConnections && candidate.id < best.id) ? candidate : best);
    }
    const selected = eligible[this.roundRobinCursor % eligible.length];
    this.roundRobinCursor += 1;
    return selected;
  }

  async checkBackend(id: string): Promise<void> {
    const backend = this.backends.get(id);
    if (!backend) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.healthCheckTimeoutMs);
    const started = Date.now();
    try {
      const response = await fetch(`${backend.url}${backend.healthPath}`, { signal: controller.signal });
      if (response.status >= 200 && response.status < 300) this.markHealthSuccess(backend, Date.now() - started);
      else this.markHealthFailure(backend, `status_${response.status}`);
    } catch (error) {
      this.markHealthFailure(backend, error instanceof Error ? error.message : 'health_check_failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  startHealthChecks(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void Promise.all([...this.backends.keys()].map((id) => this.checkBackend(id))); }, this.config.healthCheckIntervalMs);
  }

  stopHealthChecks(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }

  markBackendHealthy(id: string): void { const b = this.backends.get(id); if (b) b.health = 'healthy'; }
  recordFailure(id: string): void {
    const backend = this.backends.get(id);
    if (!backend) return;
    backend.failedRequests += 1;
    backend.consecutiveFailures += 1;
    if (backend.consecutiveFailures >= this.config.failureThreshold) {
      backend.circuitState = 'open';
      backend.openedAt = Date.now();
      backend.halfOpenProbeInFlight = false;
      this.logger.error(JSON.stringify({ event: 'circuit_opened', backendId: id }));
    }
  }

  async handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.url?.startsWith('/__lb/')) { this.admin(req, res); return; }
    const selected = this.selectBackend();
    if (!selected) { writeJson(res, 503, { error: { code: 'no_eligible_backend' } }); return; }
    const backend = this.backends.get(selected.id);
    if (!backend) { writeJson(res, 503, { error: { code: 'no_eligible_backend' } }); return; }
    backend.activeConnections += 1;
    backend.totalRequests += 1;
    this.metrics.requestsTotal += 1;
    this.metrics.requestsInFlight += 1;
    this.metrics.backendRequests.set(backend.id, (this.metrics.backendRequests.get(backend.id) ?? 0) + 1);
    this.logger.log(JSON.stringify({ event: 'proxy_request', backendId: backend.id, method: req.method, url: req.url }));
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (failed: boolean, statusCode?: number): void => {
        if (settled) return;
        settled = true;
        backend.activeConnections -= 1;
        this.metrics.requestsInFlight -= 1;
        if (statusCode) this.countStatus(statusCode);
        if (failed) this.recordFailure(backend.id); else this.recordSuccess(backend.id);
        resolve();
      };
      res.on('finish', () => finish(res.statusCode >= 500, res.statusCode));
      this.proxy.web(req, res, { target: backend.url }, (error) => {
        if (!res.headersSent) writeJson(res, error.message.includes('timeout') ? 504 : 502, { error: { code: 'bad_gateway', message: error.message } });
        finish(true, res.statusCode);
      });
    });
  }

  listen(port: number, host = '127.0.0.1'): Server {
    this.startHealthChecks();
    this.server = http.createServer((req, res) => { void this.handler(req, res); });
    this.server.listen(port, host);
    return this.server;
  }

  async shutdown(timeoutMs = 5000): Promise<void> {
    this.stopHealthChecks();
    const server = this.server;
    if (!server) return;
    await Promise.race([new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
    this.proxy.close();
  }

  private weightedEligible(): BackendRuntime[] {
    const now = Date.now();
    const out: BackendRuntime[] = [];
    for (const backend of this.backends.values()) {
      if (backend.circuitState === 'open' && now - backend.openedAt >= this.config.openDurationMs) backend.circuitState = 'half_open';
      const allowedCircuit = backend.circuitState === 'closed' || (backend.circuitState === 'half_open' && !backend.halfOpenProbeInFlight);
      if (backend.health !== 'unhealthy' && allowedCircuit) for (let i = 0; i < backend.weight; i += 1) out.push(backend);
    }
    return out;
  }
  private markHealthSuccess(backend: BackendRuntime, latencyMs: number): void {
    backend.consecutiveSuccesses += 1; backend.consecutiveFailures = 0;
    if (backend.consecutiveSuccesses >= this.config.healthyThreshold) backend.health = 'healthy';
    if (backend.circuitState === 'half_open') backend.circuitState = 'closed';
    this.logger.log(JSON.stringify({ event: 'health_success', backendId: backend.id, latencyMs }));
  }
  private markHealthFailure(backend: BackendRuntime, reason: string): void {
    backend.consecutiveFailures += 1; backend.consecutiveSuccesses = 0;
    if (backend.consecutiveFailures >= this.config.unhealthyThreshold) backend.health = 'unhealthy';
    this.recordFailure(backend.id);
    this.logger.error(JSON.stringify({ event: 'health_failure', backendId: backend.id, reason }));
  }
  private recordSuccess(id: string): void {
    const backend = this.backends.get(id);
    if (!backend) return;
    backend.consecutiveFailures = 0;
    if (backend.circuitState === 'half_open') backend.circuitState = 'closed';
  }
  private countStatus(status: number): void { const key = `${Math.floor(status / 100)}xx`; this.metrics.responsesByStatusClass.set(key, (this.metrics.responsesByStatusClass.get(key) ?? 0) + 1); }
  private admin(req: IncomingMessage, res: ServerResponse): void {
    if (req.url === '/__lb/health') { const snapshots = this.snapshots(); writeJson(res, 200, { status: 'ok', uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000), backendSummary: { healthy: snapshots.filter((b) => b.health === 'healthy').length, unhealthy: snapshots.filter((b) => b.health === 'unhealthy').length, openCircuits: snapshots.filter((b) => b.circuitState === 'open').length } }); return; }
    if (req.url === '/__lb/backends') { writeJson(res, 200, { items: this.snapshots() }); return; }
    if (req.url === '/__lb/metrics') { writeJson(res, 200, this.metricsSnapshot()); return; }
    writeJson(res, 404, { error: { code: 'not_found' } });
  }
}

function appendForwardedFor(req: IncomingMessage): string {
  const prior = req.headers['x-forwarded-for']?.toString();
  const remote = req.socket.remoteAddress ?? '';
  return prior ? `${prior}, ${remote}` : remote;
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export const defaultConfig = (backends: BackendConfig[]): LoadBalancerConfig => ({ routingAlgorithm: 'round_robin', healthCheckIntervalMs: 1000, healthCheckTimeoutMs: 500, healthyThreshold: 1, unhealthyThreshold: 1, failureThreshold: 2, openDurationMs: 1000, backends });
