// Spike scenario — sudden 10x traffic spikes with brief rest in between.
// Tests allocator / GC / mutex behavior when load arrives in bursts rather
// than gradually. With Go (sync.Mutex) vs Node (single-thread) vs Rust
// (tokio Mutex + DashMap) we expect to see distinct GC / lock-contention
// signatures in the p99 latency.

import http from 'k6/http';
import { check } from 'k6';

const PORT = __ENV.TARGET_PORT || '8080';
const URL = `http://localhost:${PORT}/`;

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 80,
      maxVUs: 250,
      stages: [
        { duration: '5s',  target: 10  },   // baseline
        { duration: '3s',  target: 300 },   // spike up to 10x
        { duration: '5s',  target: 300 },   // hold spike
        { duration: '5s',  target: 30  },   // crash down
        { duration: '5s',  target: 30  },   // hold low
        { duration: '3s',  target: 300 },   // spike up again
        { duration: '5s',  target: 300 },   // hold
        { duration: '5s',  target: 10  },   // cool
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
  const r = http.get(URL, { tags: { scenario: 'spike' } });
  check(r, { ok: (res) => res.status === 200 || res.status === 429 });
}
