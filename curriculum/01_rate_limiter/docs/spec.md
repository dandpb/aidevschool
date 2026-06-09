# Project 01 Spec: Token-Bucket Rate Limiter

## 1. Objective
Build a lightweight HTTP API service in **Go**, **Rust**, and **Node.js/TypeScript** that implements an in-memory **Token-Bucket Rate Limiter**.

The service will rate limit requests based on the client's IP address. If a client exceeds their allowance, they receive an HTTP status code `429 Too Many Requests`.

---

## 2. The Token-Bucket Algorithm

The algorithm maintains a "bucket" of tokens for each unique client IP:
- **Capacity ($C$)**: The maximum number of tokens the bucket can hold. Set to `10`.
- **Refill Rate ($r$)**: The rate at which tokens are added back to the bucket. Set to `2 tokens per second`.
- **Consumption**: Each incoming request consumes `1` token.
- **Refill Logic**:
  Instead of using a background cron/timer to refill buckets (which scales poorly), calculate the tokens lazily on request arrival:
  $$\text{tokens}_{\text{current}} = \min(C, \text{tokens}_{\text{last}} + (\text{current\_time} - \text{last\_request\_time}) \times r)$$

---

## 3. API Endpoints

### 1. `GET /`
Returns a simple welcome message. This endpoint is **rate-limited**.
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Welcome to the rate-limited endpoint!"
  }
  ```
- **Rate Limited Response (429 Too Many Requests)**:
  ```json
  {
    "error": "Too Many Requests",
    "retry_after_seconds": 3
  }
  ```

### 2. `GET /status`
Provides status information about the current bucket state for the client. This endpoint is **not** rate-limited.
- **Response (200 OK)**:
  ```json
  {
    "client_ip": "127.0.0.1",
    "tokens_remaining": 7.5,
    "max_capacity": 10,
    "refill_rate_per_second": 2
  }
  ```

---

## 4. HTTP Headers

Every response from the rate-limited endpoint must contain standard rate-limiting headers:
- `X-RateLimit-Limit`: Maximum capacity $C$ (10).
- `X-RateLimit-Remaining`: Current integer count of remaining tokens.
- `X-RateLimit-Reset`: The timestamp (Unix Epoch Seconds) when the bucket will be completely full again.

If rate-limited (`429`), include:
- `Retry-After`: Number of seconds the client must wait before another token becomes available.

---

## 5. Architectural Requirements & Guidelines

- **In-Memory Store**: Use thread-safe map structures to store client state (e.g., `sync.Map` or mutexes in Go, `RwLock<HashMap>` or `Arc` in Rust, in-memory Map with atomic-like behavior or locks if multi-processed in Node).
- **Concurrency**: The rate limiter must handle high concurrent loads without race conditions or memory leaks.
- **Cleanup**: Implement a background cleanup routine that deletes inactive client buckets (clients who haven't made a request in over 1 hour) to prevent memory exhaustion.
- **Ports**:
  - Go: `http://localhost:8080`
  - Node.js: `http://localhost:8081`
  - Rust: `http://localhost:8082`
