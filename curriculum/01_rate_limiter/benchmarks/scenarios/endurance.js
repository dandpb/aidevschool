// Endurance scenario — 80% of target RPS held for 5 minutes (300s).
// Goal: expose any slow memory growth, GC pauses, or cleanup-loop issues.
// The 1-hour idle-cleanup spec is too long to verify in 5 min, but we can
// see whether heap/RSS climbs linearly (leak) or stays flat (well-behaved).

import http from 'k6/http';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const URL = `http://localhost:${PORT}/`;

export const options = {
  scenarios: {
    endurance: {
      executor: 'constant-arrival-rate',
      rate: 80,                  // 80 RPS
      timeUnit: '1s',
      duration: '300s',          // 5 minutes
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    http_req_failed:   ['rate<0.001'],
    'checks{check:ok}': ['rate>0.999'],
  },
  discardResponseBodies: true,
};

export default function () {
  const r = http.get(URL, { tags: { scenario: 'endurance' } });
  check(r, { ok: (res) => res.status === 200 || res.status === 429 });
}
