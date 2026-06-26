// Stress — read-heavy at high rate against a small hot key set (cache-friendly,
// exposes per-language map/lookup + allocation behavior).
import http from 'k6/http';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const BASE = `http://localhost:${PORT}`;
const HOT_KEYS = 64;

export const options = {
  scenarios: {
    stress: {
      executor: 'constant-arrival-rate',
      rate: 2000, timeUnit: '1s', duration: '60s',
      preAllocatedVUs: 200, maxVUs: 500,
    },
  },
  thresholds: { http_req_failed: ['rate<0.02'] },
  discardResponseBodies: true,
};

export default function () {
  const key = `hot-${__ITER % HOT_KEYS}`;
  const r = http.get(`${BASE}/v1/kv/${key}`, { tags: { scenario: 'stress' } });
  check(r, { ok: (res) => res.status === 200 || res.status === 404 });
}
