// Stress scenario — ramp 50% → 200% of target over 90s, then back down.
// Tests how each implementation degrades under heavy load and whether the
// rate-limiter middleware itself becomes a bottleneck (vs. the application
// response). The 429 short-circuit should keep serving fast even when
// demand is 2x capacity.

import http from 'k6/http';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const URL = `http://localhost:${PORT}/`;

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '15s', target: 50  },   // warm-up: 50 RPS
        { duration: '30s', target: 200 },   // ramp to 200% (200 RPS)
        { duration: '30s', target: 200 },   // hold at peak
        { duration: '15s', target: 50  },   // cool down
      ],
    },
  },
  thresholds: {
    http_req_failed:   ['rate<0.001'],
    'checks{check:ok}': ['rate>0.999'],
  },
  discardResponseBodies: true,
};

export default function () {
  const r = http.get(URL, { tags: { scenario: 'stress' } });
  check(r, { ok: (res) => res.status === 200 || res.status === 429 });
}
