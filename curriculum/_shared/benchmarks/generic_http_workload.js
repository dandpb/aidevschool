import http from 'k6/http';
import { check, sleep } from 'k6';

// Generic HTTP read+probe workload, reusable across curriculum projects.
// Most projects expose a read/list endpoint that returns 200; we hit it at
// varying concurrency and measure throughput + latency percentiles.
//
// Env:
//   TARGET_PORT  – port the impl listens on (default 8080)
//   READ_PATH    – the endpoint to GET (default /health)
const PORT = __ENV.TARGET_PORT || '8080';
const PATH = __ENV.READ_PATH || '/health';
const BASE = `http://localhost:${PORT}`;
// Accept any non-5xx as success (read endpoints may legitimately return 4xx).
http.setResponseCallback(
  http.expectedStatuses(200, 201, 202, 204, 301, 302, 400, 401, 403, 404, 405, 422, 429),
);

export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '5s', target: 0 },
      ],
      gracefulStop: '3s',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const r = http.get(`${BASE}${PATH}`);
  check(r, { 'non-5xx': (res) => res.status < 500 });
  sleep(0.02);
}
