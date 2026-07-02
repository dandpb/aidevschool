# Tentativa — U0-sonda-rate-limiter-robustness — 2026-07-01

This is a senior-level attempt to review the rate-limiter system and answer the diagnostic questions.

## Tarefa 1: Test Design

Propose six tests for the token-bucket rate limiter.

1. **Under-limit requests stay 200.**
   - Name: `test_under_limit_success`
   - Setup: Capacity = 10, Refill Rate = 2/sec, client = "192.168.1.1", clock = 0.
   - Action: Send 3 consecutive requests from client "192.168.1.1" at t = 0.
   - Assertion: All 3 requests return `200 OK` status with `X-RateLimit-Remaining` values of 9, 8, 7, and `X-RateLimit-Limit: 10`.
   - Risk covered: Off-by-one errors in token consumption or basic limiter breakdown that denies valid requests.

2. **Burst over capacity returns 429 + Retry-After.**
   - Name: `test_burst_over_capacity_rate_limited`
   - Setup: Capacity = 10, Refill Rate = 2/sec, client = "192.168.1.1", clock = 0.
   - Action: Send 11 consecutive requests immediately at t = 0.
   - Assertion: The first 10 requests return `200 OK`. The 11th request returns `429 Too Many Requests` with header `Retry-After: 1` (since the next token refills at 0.5s, ceiling to 1s) and JSON body `{"error": "Too Many Requests", "retry_after_seconds": 1}`.
   - Risk covered: Failure to enforce maximum capacity bounds or failure to return standard 429 headers and error shape when capacity is exceeded.

3. **Lazy refill restores tokens after time passes.**
   - Name: `test_lazy_refill_recovery`
   - Setup: Capacity = 10, Refill Rate = 2/sec, client = "192.168.1.1", clock = 0.
   - Action: Send 10 requests at t = 0 (draining bucket to 0). Wait 3 seconds (t = 3000ms). Send 1 request at t = 3000ms.
   - Assertion: The first 10 requests return `200 OK`. The request at t = 3000ms returns `200 OK` with `X-RateLimit-Remaining: 5` (since 3 sec * 2 tokens/sec = 6 tokens, and t=3000ms consumes 1, leaving 5).
   - Risk covered: Refill math errors, clock drift vulnerability, or failure to perform lazy calculations on request arrival.

4. **Concurrent burst never grants more than capacity.**
   - Name: `test_concurrent_burst_safety`
   - Setup: Capacity = 10, Refill Rate = 2/sec, client = "192.168.1.1", clock = 0.
   - Action: Spawn 50 threads/goroutines sending requests concurrently at t = 0.
   - Assertion: Exactly 10 requests return `200 OK`. The remaining 40 return `429 Too Many Requests`.
   - Risk covered: Race conditions on bucket access, such as read-modify-write races allowing token over-drafting.

5. **Idle client buckets get cleaned up.**
   - Name: `test_idle_cleanup`
   - Setup: Capacity = 10, Refill Rate = 2/sec, t = 0, client = "192.168.1.1".
   - Action: Send 1 request at t = 0. Wait 3601 seconds (t = 3601, > 1 hour) with no requests from client. Trigger the cleanup routine. Then check `/status` for client "192.168.1.1".
   - Assertion: The client's record is deleted from the in-memory store. A subsequent request at t = 3602 initializes a fresh bucket (10 tokens) rather than restoring an old one.
   - Risk covered: Memory leak / memory exhaustion via an unbounded growth of tracking records for ephemeral IPs.

6. **Rate-limit headers are correct on every limited response.**
   - Name: `test_rate_limit_headers_contract`
   - Setup: Capacity = 10, Refill Rate = 2/sec, client = "192.168.1.1", clock = 0.
   - Action: Send 11 requests at t = 0.
   - Assertion: The 11th request (which fails with 429) contains headers `X-RateLimit-Limit: 10`, `X-RateLimit-Remaining: 0`, and `X-RateLimit-Reset: 5` (since it takes 5 seconds to refill to 10 tokens from 0), and `Retry-After: 1` (seconds until next token is available, which is 1 / refill_rate = 0.5s, ceiling to 1s).
   - Risk covered: Failure to comply with headers contract specifications, incorrect computation of the reset timestamp or retry duration.

## Tarefa 2: Algorithm Sketch

Pseudocode for `allowRequest(clientID, now)` that returns `{ allowed, remaining, reset, retryAfter? }`.

```ts
class TokenBucket {
  capacity: number = 10;
  refillRate: number = 2; // tokens per second
  tokens: number = 10;
  lastRefillMs: number = Date.now();
}

const db = new Map<string, TokenBucket>();
const dbLock = new Mutex(); // Thread synchronization lock (vital for multi-thread runtimes like Go/Rust)

async function allowRequest(clientID: string, nowMs: number): Promise<{ allowed: boolean; remaining: number; reset: number; retryAfter?: number }> {
  // Acquire lock to prevent race conditions on shared Map state
  await dbLock.acquire();
  try {
    let bucket = db.get(clientID);
    if (!bucket) {
      bucket = new TokenBucket();
      bucket.lastRefillMs = nowMs;
      db.set(clientID, bucket);
    }

    // Lazy refill calculation in seconds
    const elapsedSeconds = Math.max(0, nowMs - bucket.lastRefillMs) / 1000;
    const refilledTokens = elapsedSeconds * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refilledTokens);
    bucket.lastRefillMs = nowMs;

    const resetEpochSeconds = Math.ceil(nowMs / 1000 + (bucket.capacity - bucket.tokens) / bucket.refillRate);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        reset: resetEpochSeconds
      };
    } else {
      const retryAfterSeconds = Math.max(1, Math.ceil((1 - bucket.tokens) / bucket.refillRate));
      return {
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        reset: resetEpochSeconds,
        retryAfter: retryAfterSeconds
      };
    }
  } finally {
    dbLock.release(); // Ensure lock is released before any external network operations
  }
}
```

## Tarefa 3: Code Reading Risk Scan

Read the current Project 01 skeleton (`curriculum/01_rate_limiter/`) and identify three risks or ambiguities:

1. **Risk:** Client IP Spoofing via `X-Forwarded-For`
   **Why it matters:** In `resolveClientIp()`, if `trustProxy` is set to `true`, the server trusts the left-most IP in `X-Forwarded-For`. If the service is exposed directly to the public web (without a trusted reverse proxy sanitizing this header), any client can spoof their IP by sending an arbitrary `X-Forwarded-For` header, bypassing the rate limiter entirely.
   **Smallest safe next step:** Add warning log during startup if `trustProxy` is active, and ensure the deployment documentation highlights that the app MUST run behind a reverse proxy that overwrites/sanitizes headers.

2. **Risk:** Unbounded Map Growth (Memory Leak) under Distributed Spikes
   **Why it matters:** The cleanup timer runs periodically using `setInterval` to call `limiter.cleanupIdle()`. If the server is hit by a massive distributed attack (e.g., millions of unique bot IP addresses making 1 request each), the in-memory Map will grow rapidly. If `cleanupIntervalMs` is large or `idleTimeoutMs` is 1 hour, memory consumption might spike and cause an Out-Of-Memory (OOM) crash before the next cleanup cycle.
   **Smallest safe next step:** Implement a maximum capacity bound on the `Map` size itself, or evict the oldest idle bucket (least recently used) if the Map reaches a pre-configured maximum client limit (e.g., 100,000 buckets).

3. **Risk:** Clock Drift and Refill Starvation
   **Why it matters:** Refill math relies on subtraction between the current timestamp (`now`) and `lastRefillMs` in milliseconds. On systems where the system clock shifts backwards (e.g. NTP synchronization adjusts the clock), the elapsed time could be negative. Although `Math.max(0, now - bucket.lastRefillMs)` is used to prevent negative refill, if NTP adjusts the clock backwards repeatedly or slightly, the client might receive fewer tokens than expected (starvation).
   **Smallest safe next step:** Document clock behavior requirements or log a warning if non-monotonic clock behavior (where `now < lastRefillMs`) is detected.

## Tarefa 4: Review Judgment

Classify each hypothetical finding.

| Finding | Severity | Why |
|---------|----------|-----|
| A denied request returns 429 but omits `Retry-After`. | **Critical** | The `Retry-After` header is a standard RFC 7231 requirement for 429 status code, and omitting it breaks API client retry predictability. |
| The implementation refills all buckets every 100ms in a background loop. | **Major** | A background loop scale poorly ($O(N)$ with number of clients) and wastes CPU cycles, whereas lazy refill on request scales $O(1)$ and consumes zero idle CPU. |
| `/status` returns `tokens` instead of `tokens_remaining`. | **Minor** | This is a discrepancy with the API contract specified in the documentation but does not impact rate limiter performance or core correctness. |
| The README does not mention which port the service uses. | **Educational** | A missing documentation detail that does not affect runtime safety but increases developer friction during onboarding. |
| A concurrent burst can grant more successful requests than the bucket capacity allows. | **Critical** | This indicates a concurrency race condition (e.g., lack of synchronization/locking in Go/Rust or shared memory access in Node multi-processes) which invalidates the core rate-limiting invariant. |