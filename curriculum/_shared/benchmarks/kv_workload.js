import http from 'k6/http';
import { check, sleep } from 'k6';

// Treat 404 as a successful response: a GET/DELETE on a never-set key legitimately
// returns 404. Without this, k6's http_req_failed metric counts those 404s as
// errors and inflates the "failure rate" to ~80% even though every response is valid.
http.setResponseCallback(http.expectedStatuses(200, 201, 204, 404, 405));

// Mixed KV workload: 80% GET, 15% PUT, 5% DELETE over a keyspace of 10k keys.
// Reusable across any CRUD/HTTP project. Override port via TARGET_PORT env.
const PORT = __ENV.TARGET_PORT || '8080';
const BASE = `http://localhost:${PORT}`;
const KEYSPACE = 10000;

// Stress profile: ramp to 100 VUs, hold, ramp down. Tuned for a ~30s run.
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
  // summary trend stats: include p(99) (k6 default only emits p(90)/p(95)).
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const key = `k${__VU}_${__ITER % KEYSPACE}`;
  const roll = __ITER % 20;
  let r;
  if (roll < 16) {
    // GET (80%) — 404 is an expected, valid response for a missing key.
    r = http.get(`${BASE}/v1/kv/${key}`);
    check(r, { 'get status valid': (res) => res.status === 200 || res.status === 404 });
  } else if (roll < 19) {
    // PUT (15%)
    r = http.put(
      `${BASE}/v1/kv/${key}`,
      JSON.stringify({ value: `val-${__ITER}` }),
      { headers: { 'Content-Type': 'application/json' }, responseType: 'text' },
    );
    check(r, { 'put ok': (res) => res.status === 200 || res.status === 201 });
  } else {
    // DELETE (5%) — 404 is expected for a key that was never set.
    r = http.del(`${BASE}/v1/kv/${key}`);
    check(r, { 'del status valid': (res) => res.status === 200 || res.status === 404 });
  }
  sleep(0.02);
}
