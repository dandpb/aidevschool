import express, { Request, Response } from 'express';
import { defaultConfig, Config, RouteConfig, FallbackPolicy } from './config';
import { CircuitBreaker } from './circuitBreaker';
import { Bulkhead } from './bulkhead';
import { TenantLimiter } from './rateLimiter';
import { doWithRetry } from './retry';

export class Gateway {
  private routes: Map<string, RouteConfig> = new Map();
  private circuits: Map<string, CircuitBreaker> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();
  private tenantLimits: Map<string, TenantLimiter> = new Map();

  constructor(private config: Config = defaultConfig()) {
    for (const route of config.routes) {
      this.routes.set(route.pathPrefix, route);
      this.circuits.set(route.id, new CircuitBreaker(route.circuitBreaker));
      this.bulkheads.set(route.id, new Bulkhead(route.bulkhead.maxConcurrency));
      this.tenantLimits.set(route.id, new TenantLimiter(route.tenantLimit.capacity, route.tenantLimit.refillPerSecond));
    }
  }

  buildApp(): express.Application {
    const app = express();
    app.use(express.json());

    app.get('/_gateway/status', (_req: Request, res: Response) => {
      const routes = Array.from(this.routes.values()).map((route) => {
        const cb = this.circuits.get(route.id)!.snapshot();
        const bh = this.bulkheads.get(route.id)!.snapshot();
        return {
          id: route.id,
          path_prefix: route.pathPrefix,
          upstream: route.upstreamUrl,
          circuit: {
            state: cb.state,
            failure_count: cb.failureCount,
            success_count: cb.successCount,
            half_open_probe_in_flight: cb.halfOpenProbeInFlight,
          },
          bulkhead: {
            max_concurrency: bh.maxConcurrency,
            in_flight: bh.inFlight,
            rejections: bh.rejections,
          },
        };
      });
      res.json({ routes });
    });

    app.get('/_gateway/metrics', (_req: Request, res: Response) => {
      const metrics = Array.from(this.routes.values()).map((route) => {
        const cb = this.circuits.get(route.id)!.snapshot();
        const bh = this.bulkheads.get(route.id)!.snapshot();
        return {
          route_id: route.id,
          circuit_state: cb.state,
          failure_count: cb.failureCount,
          success_count: cb.successCount,
          bulkhead_in_flight: bh.inFlight,
          bulkhead_rejections: bh.rejections,
        };
      });
      res.json({ metrics });
    });

    app.use((req: Request, res: Response) => {
      this.handleRequest(req, res);
    });

    return app;
  }

  private handleRequest(req: Request, res: Response): void {
    const requestId = req.headers['x-request-id']?.toString() || `${Date.now()}`;
    const path = req.path;

    const route = this.matchRoute(path);
    if (!route) {
      return this.sendError(res, 404, 'no matching route', '', requestId);
    }

    const cb = this.circuits.get(route.id)!;
    const bh = this.bulkheads.get(route.id)!;
    const tl = this.tenantLimits.get(route.id)!;

    const tenantId = req.headers['x-tenant-id']?.toString() || 'default';

    if (!tl.allow(tenantId)) {
      res.setHeader('Retry-After', '1');
      res.setHeader('X-RateLimit-Limit', route.tenantLimit.capacity.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.floor(tl.resetAt(tenantId).getTime() / 1000).toString());
      return this.sendError(res, 429, 'tenant rate limit exceeded', route.id, requestId);
    }

    res.setHeader('X-RateLimit-Limit', route.tenantLimit.capacity.toString());
    res.setHeader('X-RateLimit-Remaining', Math.floor(tl.tokensRemaining(tenantId)).toString());
    res.setHeader('X-RateLimit-Reset', Math.floor(tl.resetAt(tenantId).getTime() / 1000).toString());

    if (!cb.allow()) {
      res.setHeader('X-Circuit-State', cb.snapshot().state);
      res.setHeader('X-Retry-Attempts', '0');
      res.setHeader('X-Fallback-Used', 'true');
      if (route.fallback) {
        return this.sendFallback(res, route.fallback);
      }
      return this.sendError(res, 503, 'circuit open', route.id, requestId);
    }

    if (!bh.acquire()) {
      res.setHeader('X-Circuit-State', cb.snapshot().state);
      res.setHeader('X-Retry-Attempts', '0');
      res.setHeader('X-Fallback-Used', 'true');
      if (route.fallback) {
        return this.sendFallback(res, route.fallback);
      }
      return this.sendError(res, 503, 'bulkhead full', route.id, requestId);
    }

    this.proxyRequest(req, res, route, cb, bh).finally(() => {
      bh.release();
    });
  }

  private async proxyRequest(req: Request, res: Response, route: RouteConfig, cb: CircuitBreaker, _bh: Bulkhead): Promise<void> {
    const requestId = req.headers['x-request-id']?.toString() || `${Date.now()}`;

    try {
      const upstreamPath = req.path.replace(route.pathPrefix, '');
      const upstreamUrl = new URL(upstreamPath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''), route.upstreamUrl);

      const result = await doWithRetry(
        route.retry,
        req.method,
        async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), route.timeoutMs);

          try {
            const response = await fetch(upstreamUrl.toString(), {
              method: req.method,
              headers: {
                ...req.headers as Record<string, string>,
                'X-Request-ID': requestId,
              },
              body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
              signal: controller.signal,
            });
            clearTimeout(timeout);
            return response;
          } catch (err) {
            clearTimeout(timeout);
            throw err;
          }
        },
        (r) => r.status,
        (err) => err instanceof Error
      );

      res.setHeader('X-Circuit-State', cb.snapshot().state);
      res.setHeader('X-Gateway-Route', route.id);
      res.setHeader('X-Request-ID', requestId);

      if (result.status >= 500) {
        cb.recordFailure();
      } else {
        cb.recordSuccess();
      }

      if (result.status >= 500 && route.fallback) {
        res.setHeader('X-Fallback-Used', 'true');
        return this.sendFallback(res, route.fallback);
      }

      res.setHeader('X-Fallback-Used', 'false');
      res.status(result.status);
      const body = await result.text();
      res.send(body);
    } catch (err) {
      cb.recordFailure();
      res.setHeader('X-Fallback-Used', 'true');
      if (route.fallback) {
        return this.sendFallback(res, route.fallback);
      }
      this.sendError(res, 502, 'upstream error', route.id, requestId);
    }
  }

  private matchRoute(path: string): RouteConfig | undefined {
    let best: RouteConfig | undefined;
    for (const route of this.routes.values()) {
      if (path.startsWith(route.pathPrefix)) {
        if (!best || route.pathPrefix.length > best.pathPrefix.length) {
          best = route;
        }
      }
    }
    return best;
  }

  private sendError(res: Response, status: number, message: string, routeId: string, requestId: string): void {
    res.status(status).json({ error: message, route_id: routeId, request_id: requestId });
  }

  private sendFallback(res: Response, fallback: FallbackPolicy): void {
    for (const [k, v] of Object.entries(fallback.headers)) {
      res.setHeader(k, v);
    }
    res.status(fallback.status).json(fallback.body);
  }
}
