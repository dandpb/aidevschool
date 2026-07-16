# Tentativa — U2-key-value-store — 2026-07-11

Senior-level attempt to answer the diagnostic questions for the in-memory key-value store.
The diagnostic covers the primary concept (hash-map-backed CRUD with TTL expiration) and the
concurrency/memory secondary concepts from `curriculum/02_key_value_store/docs/spec.md`.

## Tarefa 1: Test Design

Propose six tests for the in-memory key-value store.

1. **SET stores, GET retrieves (RF-001, RF-002).**
   - Name: `test_set_then_get_roundtrip`
   - Setup: Empty store.
   - Action: `SET key:"user:42" value:"alice"`. Then `GET key:"user:42"`.
   - Assertion: GET returns `{ ok: true, data: { value: "alice", ttl: -1 } }` (no expiry).
   - Risk covered: Basic hash-map routing failure — key not found after a successful SET.

2. **Expired keys are invisible to GET (RF-005, RF-011).**
   - Name: `test_expired_key_returns_missing`
   - Setup: Store with `SET key:"session:1" value:"abc"`, then `EXPIRE key:"session:1" ttlSeconds:1`.
   - Action: Advance the clock by 2 seconds. Then `GET key:"session:1"`.
   - Assertion: GET returns `{ ok: true, data: null }` (key is treated as missing).
   - Risk covered: TTL deadline check using `>=` instead of `>`, or forgetting to check expiry
     before returning the value — a stale read of dead data.

3. **DEL on a missing/expired key is a no-op success (RF-003, RF-011).**
   - Name: `test_del_missing_key_is_zero`
   - Setup: Empty store.
   - Action: `DEL keys:["nonexistent"]`.
   - Assertion: Returns `{ ok: true, data: { deleted: 0 } }` with no error.
   - Risk covered: Treating a missing key deletion as an error path instead of a count-zero success.

4. **Concurrent SET + GET never corrupts or resurrects expired keys (RNF-003).**
   - Name: `test_concurrent_write_read_safety`
   - Setup: Store with 1 key `"k"` value `"v0"`. 50 concurrent goroutines/tasks.
   - Action: Half the workers do `SET key:"k" value:"v<random>"`; the other half do `GET key:"k"`.
     No TTL involved.
   - Assertion: Every GET returns one of the values that was actually SET (no partial/torn writes).
     Final `GET key:"k"` returns the last-written value, not a corrupted or intermediate state.
   - Risk covered: Read-modify-write race on the map entry — the core concurrency hazard this
     project exists to teach.

5. **MSET is all-or-nothing (RF-010, RNF-003).**
   - Name: `test_mset_atomic_rollback_on_invalid`
   - Setup: Empty store.
   - Action: `MSET items:[{key:"a", value:"1"}, {key:"", value:"empty-key"}]` (second item has an
     empty key, which violates the key validation).
   - Assertion: Returns `{ ok: false, error: { code: "INVALID_COMMAND" } }`. A subsequent
     `GET key:"a"` returns `null` — the valid item was NOT stored because the batch failed atomically.
   - Risk covered: Partial MSET application — storing some items then erroring, leaving the store
     in an inconsistent state.

6. **TTL reports -1 for persistent, -2 for missing/expired (RF-005).**
   - Name: `test_ttl_sentinel_values`
   - Setup: `SET key:"persist" value:"x"` (no TTL). `SET key:"temp" value:"y"` then `EXPIRE key:"temp" ttlSeconds:5`.
   - Action: `TTL key:"persist"`, `TTL key:"temp"` (immediately), `TTL key:"nonexistent"`.
   - Assertion: Returns -1 for persist (no expiry), a positive integer ≤5 for temp, and -2 for
     nonexistent.
   - Risk covered: Confusing the three sentinel states — persistent vs. expiring vs. gone.

## Tarefa 2: Algorithm Sketch

Pseudocode for the core store with hash-bucket routing and lazy TTL expiry.

```ts
interface Entry {
  value: string
  expiresAt: number | null  // epoch ms; null = persistent
}

class KVStore {
  // Hash-map-backed: the JS Map is the bucket array; the hash function is the engine's internal
  // string hashing (V8's hidden-class map). For a from-scratch hash map you'd use:
  //   bucketIndex = hash(key) % bucketCount
  //   entries[bucketIndex] = linked list of {key, value} (separate chaining for collisions)
  private map = new Map<string, Entry>()
  private maxKeys = 100_000

  set(key: string, value: string, ttlSeconds?: number): void {
    if (this.nonExpiredCount() >= this.maxKeys && !this.map.has(key)) {
      throw { code: "STORE_FULL" }
    }
    const now = Date.now()
    const expiresAt = ttlSeconds !== undefined ? now + ttlSeconds * 1000 : null
    this.map.set(key, { value, expiresAt })  // overwrites + replaces TTL (RF-001)
  }

  get(key: string): string | null {
    const entry = this.map.get(key)
    if (!entry) return null                    // missing (RF-002)
    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      // Lazy sweep: delete on access (RF-011 MAY)
      this.map.delete(key)
      return null                              // expired = invisible
    }
    return entry.value
  }

  del(keys: string[]): number {
    let deleted = 0
    for (const key of keys) {
      // Must count only keys that existed AND were unexpired (RF-003)
      const entry = this.map.get(key)
      if (entry && (entry.expiresAt === null || Date.now() < entry.expiresAt)) {
        this.map.delete(key)
        deleted++
      } else if (entry) {
        // Expired: clean it up but don't count it as "deleted" (it was already dead)
        this.map.delete(key)
      }
    }
    return deleted
  }

  // Concurrency: in a single-threaded runtime (Node), the map operations above are atomic
  // per-call. In Go/Rust, you'd wrap every access in a Mutex/RwLock. The critical invariant
  // (RNF-003) is that no two concurrent operations interleave inside a read-modify-write on
  // the same entry.
  private nonExpiredCount(): number {
    // O(n) — in production you'd maintain a counter, but for correctness sketch this is clearer
    let count = 0
    for (const [key, entry] of this.map) {
      if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
        this.map.delete(key)  // lazy sweep
      } else {
        count++
      }
    }
    return count
  }
}
```

The hash function matters for collision distribution. A poor hash (e.g., sum-of-char-codes)
clusters keys with similar prefixes into the same bucket, degrading GET to O(n) chain traversal
under skewed workloads. A good hash (e.g., FNV-1a, murmur3, or the runtime's built-in) distributes
uniformly so the expected chain length is O(1 + α) where α = load factor.

## Tarefa 3: Code Reading Risk Scan

Risks I would flag in a code review of a KV store implementation:

1. **TTL boundary error (`>=` vs `>`).** The most common bug: checking `now > expiresAt` instead
   of `now >= expiresAt`. A key with TTL=1s that expires at exactly t=1000ms would be readable at
   t=1000ms with the wrong operator. The spec says "expired keys are invisible" — the boundary is
   inclusive of the deadline.

2. **No concurrency guard on the map (RNF-003).** In Go, a bare `map[string]Entry` with concurrent
   goroutine access causes a fatal runtime panic ("concurrent map read and map write"). In Rust,
   the borrow checker forces you to use `Arc<Mutex<HashMap>>` or `Arc<RwLock<>>`. In Node, the
   single-threaded event loop makes per-operation access safe, but an `await` in the middle of a
   read-modify-write (e.g., reading a value, awaiting a validation call, then writing) creates a
   race window where another request can interleave.

3. **MSET non-atomicity (RF-010).** If MSET stores items one-by-one and errors mid-way, the store
   is left with a partial batch. The spec requires "validate every item first, then store all or
   none." The fix is a two-phase commit: validate all → then commit all.

4. **Memory unboundedness (RNF-004).** A store without `maxKeys` or `maxValueSize` limits is a
   denial-of-service vector. A client can OOM the process with unbounded SETs. The limits must be
   checked BEFORE insertion, not after.

5. **UTF-16 vs UTF-8 key/value size confusion.** JavaScript strings are UTF-16; `value.length`
   counts code units, not bytes. A 512-byte UTF-8 key limit enforced via `key.length <= 512` is
   wrong for multi-byte characters. Use `Buffer.byteLength(key, "utf8")`.

## Tarefa 4: Review Judgment

Given an implementation that passes all functional tests but has the following characteristics,
my verdict would be:

**Acceptable for "implemented" but NOT "mastered" without evidence of:**

- **Concurrency stress test under load.** Functional unit tests with sequential calls don't prove
  RNF-003 (concurrency safety). You need a benchmark-style test that fires N concurrent workers
  and verifies no corruption, no lost writes, no resurrected expired keys.

- **TTL expiry under a controllable clock.** Tests that use `Date.now()` directly are flaky and
  slow (you have to actually wait for expiry). The store should accept an injected clock so tests
  can advance time deterministically. This is exactly the pattern the voxelDojo warehouse game
  uses (`createStore` takes a `Clock` function).

- **Collision behavior under a skewed keyspace.** A store that works with uniformly-distributed
  keys can still degrade badly if all keys share a prefix (e.g., "user:1", "user:2", ...). A
  stress test with skewed keys reveals whether the hash function distributes well or clusters.

**My self-assessment of gaps:**

- I'm confident on the CRUD + TTL semantics (RF-001 through RF-011) and the concurrency model.
- I'm less practiced with MGET/MSET atomicity patterns (RF-009/010) in a polyglot context — I
  understand the two-phase commit conceptually but haven't implemented it across Go/Rust/Node
  to feel the language-specific friction.
- The memory-bounding strategy (RNF-004) is something I'd need to verify empirically — approximate
  memory accounting in a GC'd runtime is non-trivial because you can't just count entry sizes.
