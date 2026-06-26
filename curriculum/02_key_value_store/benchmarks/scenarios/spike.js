// Spike — bursts of large-value writes (memory-pressure shape: exercises
// allocation + copy cost differently across Go/Rust/Node).
import http from 'k6/http';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const BASE = `http://localhost:${PORT}`;
const HEADERS = { 'Content-Type': 'application/json' };
const BIG_VALUE = 'x'.repeat(16 * 1024); // 16 KiB value

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 50, timeUnit: '1s',
      preAllocatedVUs: 100, maxVUs: 400,
      stages: [
        { target: 50, duration: '10s' },
        { target: 1500, duration: '10s' }, // spike up
        { target: 50, duration: '10s' },   // recover
      ],
    },
  },
  thresholds: { http_req_failed: ['rate<0.05'] },
  discardResponseBodies: true,
};

export default function () {
  const key = `big-${__VU}-${__ITER % 256}`;
  const r = http.put(`${BASE}/v1/kv/${key}`, JSON.stringify({ value: BIG_VALUE }), {
    headers: HEADERS, tags: { scenario: 'spike' },
  });
  check(r, { ok: (res) => res.status >= 200 && res.status < 500 });
}
