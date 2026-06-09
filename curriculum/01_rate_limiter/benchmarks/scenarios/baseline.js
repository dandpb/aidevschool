// Baseline scenario — sustained load at ~70% of target.
// We treat 100 RPS demand as 100% (each VU in a closed loop with a small
// sleep contributes a few RPS), so baseline = 70 RPS, ramped over 60s.
//
// Goal: compare the three implementations under steady, sub-saturating load
// where the rate limiter should not be the bottleneck.

import http from 'k6/http';
import { check, sleep } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const URL = `http://localhost:${PORT}/`;

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-arrival-rate',
      rate: 70,                  // 70 RPS
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    // We do NOT set a strict latency threshold here: 429s are part of normal
    // operation and the rate-limiter is expected to short-circuit with a
    // small body, so p95 should be sub-10ms on every implementation.
    http_req_failed:   ['rate<0.001'],     // only true transport errors
    'checks{check:ok}': ['rate>0.999'],
  },
  noConnectionReuse: false,
  discardResponseBodies: true,
};

export default function () {
  const r = http.get(URL, { tags: { scenario: 'baseline' } });
  check(r, { ok: (res) => res.status === 200 || res.status === 429 });
}
