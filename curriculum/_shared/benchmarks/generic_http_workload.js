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
const THINK_TIME_S = Number(__ENV.THINK_TIME_S || '0');
const BASE = `http://localhost:${PORT}`;
// Only 2xx and 429 (explicit rate-limit rejection) are expected statuses;
// 400/404/5xx must surface as benchmark failures rather than 0.000 fail rate.
http.setResponseCallback(
  http.expectedStatuses({ min: 200, max: 299 }, 429),
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
  check(r, {
    '2xx-or-429': (res) => (res.status >= 200 && res.status < 300) || res.status === 429,
  });
  if (THINK_TIME_S > 0) {
    sleep(THINK_TIME_S);
  }
}
