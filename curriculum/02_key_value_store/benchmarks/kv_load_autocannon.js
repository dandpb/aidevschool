'use strict';
/*
 * Custom autocannon load script for curriculum/02_key_value_store (Node impl).
 * k6 is unavailable in this sandbox (network egress to dl.k6.io blocked — same
 * constraint documented for 01_rate_limiter). autocannon is the sanctioned
 * fallback per .claude/agents/benchmarker.md.
 *
 * Workload mix mirrors curriculum/_shared/benchmarks/kv_workload.js (80% GET /
 * 15% PUT / 5% DELETE over a 10k keyspace) and extends it with TTL churn
 * (EXPIRE + TTL reads) since this project's spec (RF-004/RF-005) makes TTL a
 * first-class operation the rate-limiter workload didn't need to cover:
 *
 *   68% GET       /v1/kv/{key}
 *   15% PUT       /v1/kv/{key}            (SET, some with ttlSeconds)
 *    5% DELETE    /v1/kv/{key}
 *   7%  POST      /v1/kv/{key}/expire     (TTL churn: assign/replace expiry)
 *   5%  GET       /v1/kv/{key}/ttl        (TTL churn: read remaining ttl)
 *
 * Keyspace: 10,000 keys (k{0..9999}), matching kv_workload.js. autocannon's
 * `requests` array + `setupRequest` hook lets each virtual connection pick a
 * pseudo-random key/verb per request, approximating k6's per-iteration logic
 * within autocannon's connection/pipelining model (closed-loop, not the same
 * VU model as k6 — see docs/benchmark_results.md sec 1 for the caveat).
 */

const autocannon = require('autocannon');

const PORT = process.argv[2] || process.env.TARGET_PORT || '28081';
const DURATION = Number(process.argv[3] || process.env.BENCH_DURATION || 20);
const CONNECTIONS = Number(process.argv[4] || process.env.BENCH_CONNECTIONS || 50);
const KEYSPACE = 10000;

function pickKey() {
  return `k${Math.floor(Math.random() * KEYSPACE)}`;
}

function buildRequest() {
  const roll = Math.random() * 100;
  const key = pickKey();

  if (roll < 68) {
    // GET (68%) - 404 is an expected, valid response for a missing/expired key.
    return { method: 'GET', path: `/v1/kv/${key}` };
  }
  if (roll < 83) {
    // PUT / SET (15%) - ~1/3 of SETs carry a short TTL to feed TTL churn.
    const withTtl = Math.random() < 0.33;
    const body = withTtl
      ? JSON.stringify({ value: `val-${Date.now()}`, ttlSeconds: 5 })
      : JSON.stringify({ value: `val-${Date.now()}` });
    return {
      method: 'PUT',
      path: `/v1/kv/${key}`,
      headers: { 'content-type': 'application/json' },
      body,
    };
  }
  if (roll < 88) {
    // DELETE (5%)
    return { method: 'DELETE', path: `/v1/kv/${key}` };
  }
  if (roll < 95) {
    // EXPIRE (7%) - TTL churn: assign/replace expiry on an existing/missing key.
    return {
      method: 'POST',
      path: `/v1/kv/${key}/expire`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ttlSeconds: 10 }),
    };
  }
  // TTL read (5%) - remaining lifetime check.
  return { method: 'GET', path: `/v1/kv/${key}/ttl` };
}

const instance = autocannon(
  {
    url: `http://127.0.0.1:${PORT}`,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: 1,
    requests: [
      {
        setupRequest: (req) => Object.assign(req, buildRequest()),
      },
    ],
  },
  (err, result) => {
    if (err) {
      console.error(JSON.stringify({ error: String(err) }));
      process.exit(1);
    }
    console.log(JSON.stringify(result));
  },
);

autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
