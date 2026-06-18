export interface FallbackPolicy {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface RouteConfig {
  id: string;
  pathPrefix: string;
  upstreamUrl: string;
  timeoutMs: number;
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    retryableMethods: string[];
    retryableStatuses: number[];
  };
  circuitBreaker: {
    windowMs: number;
    minimumRequests: number;
    failureRateThreshold: number;
    openCooldownMs: number;
    halfOpenMaxProbes: number;
    halfOpenSuccessesToClose: number;
  };
  fallback?: FallbackPolicy;
  bulkhead: { maxConcurrency: number };
  tenantLimit: { capacity: number; refillPerSecond: number };
}

export interface Config {
  port: number;
  routes: RouteConfig[];
}

export function defaultConfig(): Config {
  return {
    port: 8080,
    routes: [
      {
        id: 'orders',
        pathPrefix: '/api/orders',
        upstreamUrl: 'http://127.0.0.1:9001',
        timeoutMs: 250,
        retry: {
          maxAttempts: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          retryableMethods: ['GET', 'HEAD', 'PUT', 'DELETE'],
          retryableStatuses: [502, 503, 504],
        },
        circuitBreaker: {
          windowMs: 10000,
          minimumRequests: 20,
          failureRateThreshold: 0.5,
          openCooldownMs: 5000,
          halfOpenMaxProbes: 3,
          halfOpenSuccessesToClose: 3,
        },
        fallback: {
          status: 503,
          body: { error: 'orders temporarily unavailable' },
          headers: {},
        },
        bulkhead: { maxConcurrency: 64 },
        tenantLimit: { capacity: 120, refillPerSecond: 20 },
      },
    ],
  };
}
