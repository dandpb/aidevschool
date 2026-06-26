// Baseline — steady mixed read/write at sub-saturating load.
// Each iteration writes a key then reads it back (the common KV round-trip).
import http from 'k6/http';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const BASE = `http://localhost:${PORT}`;
const HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-arrival-rate',
      rate: 200, timeUnit: '1s', duration: '60s',
      preAllocatedVUs: 50, maxVUs: 100,
    },
  },
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export default function () {
  const key = `k${__VU}-${__ITER % 1000}`;
  http.put(`${BASE}/v1/kv/${key}`, JSON.stringify({ value: 'v' }), {
    headers: HEADERS, tags: { scenario: 'baseline' },
  });
  const r = http.get(`${BASE}/v1/kv/${key}`, { tags: { scenario: 'baseline' } });
  check(r, { ok: (res) => res.status === 200 || res.status === 404 });
}
