// Endurance — sustained mixed read/write/mget over a longer window
// (surfaces GC pauses, fragmentation, and steady-state memory drift).
import http from 'k6/http';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const BASE = `http://localhost:${PORT}`;
const HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  scenarios: {
    endurance: {
      executor: 'constant-arrival-rate',
      rate: 500, timeUnit: '1s', duration: '180s',
      preAllocatedVUs: 100, maxVUs: 200,
    },
  },
  thresholds: { http_req_failed: ['rate<0.02'] },
};

export default function () {
  const key = `e${__VU}-${__ITER % 5000}`;
  if (__ITER % 3 === 0) {
    http.put(`${BASE}/v1/kv/${key}`, JSON.stringify({ value: 'v' }), {
      headers: HEADERS, tags: { scenario: 'endurance' },
    });
  } else if (__ITER % 3 === 1) {
    const r = http.post(`${BASE}/v1/mget`, JSON.stringify({ keys: [key, `e${__VU}-0`] }), {
      headers: HEADERS, tags: { scenario: 'endurance' },
    });
    check(r, { ok: (res) => res.status === 200 });
  } else {
    const r = http.get(`${BASE}/v1/kv/${key}`, { tags: { scenario: 'endurance' } });
    check(r, { ok: (res) => res.status === 200 || res.status === 404 });
  }
}
