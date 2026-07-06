# Code Review: Project 02 Key-Value Store — Node/TypeScript

> **Cycle**: `2026-07-06-02-key-value-store`, phase `review`. **Scope**: this is a
> full rewrite of the previous `docs/code_review.md`, which was produced by an
> earlier "backfill" commit (`5d0ee67`), not a real gated review — no verifier ever
> passed it, and `learner/pipeline_status.md` never recorded a review phase for this
> project before this cycle. Every issue below was independently re-derived against
> the current code (re-read + re-executed), not copied from that draft. Where a
> claim from the draft turned out to still hold, or to no longer hold, that is
> stated explicitly.

## Scope note — Go/Rust are OUT OF SCOPE this cycle

Per the repo owner's explicit decision (`docs/SPEC_plano_execucao.md`, Fase 2.1) and
`learner/pipeline_status.md`'s `dev-go`/`dev-rust` notes ("not started this cycle —
out of scope"), **`go-impl/` and `rust-impl/` were NOT reviewed, NOT read for
correctness, and NOT re-executed in this pass.** `go-impl/` and `rust-impl/` already
exist in the repo from an earlier/ungated cycle, but this review makes **no claim**
about their correctness, one way or the other. Any statements in the prior draft
about Go/Rust (e.g. "Go TTL handling accepts explicit zero TTL") are **not
re-verified here** and must not be treated as current findings. This review's
Critical/Major/Minor/Educational counts and the 7-category coverage below apply
**only to `node-impl/`**.

## Severity Legend

- **Critical**: breaks a core contract or creates unacceptable risk.
- **Major**: likely to cause incorrect behavior, poor scalability, or drift from the spec.
- **Minor**: improves clarity, ergonomics, or robustness without changing the core design.
- **Educational**: useful teaching point rather than a required fix.

## Verification performed (real execution, this session)

- Fresh install in an isolated sandbox (`/tmp`, not the repo's committed
  `node_modules`, per the established workaround for this environment):
  `npm ci` → 360 packages, clean.
  - `npx vitest run --coverage`: **6/6 tests passed** (2 files: `store.test.ts` 4
    tests, `server.test.ts` 2 tests). Coverage: **86.15% stmts / 80.76% branch /
    96.66% funcs / 86.15% lines** — matches `learner/pipeline_status.md`'s claim
    exactly, now independently reproduced rather than trusted.
  - `npx tsc --noEmit`: clean (exit 0).
  - `npx eslint "src/**/*.ts" "tests/**/*.ts"`: clean (exit 0).
  - `npm audit`: **0 vulnerabilities in production dependencies** (`--omit=dev`).
    Full audit (including devDependencies) reports 6 (3 moderate/1 high/2
    critical) — all rooted in `esbuild`/`vite`/`vitest`'s transitive dev-server
    dependency chain (a dev-server request-forgery class of issue), not in
    code that ships to production (`express`, `pino`, `zod` are clean). Flagged
    as **Minor/Educational**, not Major, because it does not affect the running
    service.
- Targeted runtime probes against the actual `KeyValueStore` class (via
  `ts-node -e`, not just static reading) to confirm or refute suspected bugs
  before writing them up — see individual issues below for the exact commands
  and observed output.

## Issue Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Major | 3 |
| Minor | 4 |
| Educational | 4 |

## Issues

### [MAJOR-001] `expire()` bypasses key validation, misreporting `KEY_NOT_FOUND` instead of `INVALID_KEY`/`KEY_TOO_LONG`

- **Arquivo**: `node-impl/src/store.ts:119-136` (the `expire` method), contrasted
  with `node-impl/src/store.ts:262-263` (`validateWrite` calls `this.validateKey(key)`
  for `set`).
- **Categoria**: Error Handling
- **Descrição**: `expire(key, ttlSeconds)` calls `validateTtl(ttlSeconds)` first,
  then goes straight to `this.validStoredKey(key, now)` — it never calls
  `this.validateKey(key)`. `validStoredKey` (store.ts:289-300) is a pure
  map-lookup-plus-expiry-check; for a key that was never valid to begin with
  (empty string, or longer than 512 UTF-8 bytes), it simply returns `false`
  because the key was never in the map, and `expire` then throws
  `KEY_NOT_FOUND`. The spec (`docs/spec.md:104`) requires
  `POST /v1/kv/{key}/expire` to return `400 INVALID_KEY | INVALID_TTL` before
  `404 KEY_NOT_FOUND`. The HTTP layer doesn't rescue this either —
  `server.ts:44-47`'s `/expire` handler calls `store.expire()` directly without
  first calling `store.validateKey()`, unlike the `DELETE` and `GET .../ttl`
  handlers at `server.ts:40` and `server.ts:50`, which do call `validateKey`
  explicitly before touching the store.
- **Reproduced**: ran the store directly —
  `store.expire('', 10)` → threw `KEY_NOT_FOUND` (expected `INVALID_KEY`).
  `store.expire('x'.repeat(600), 10)` → threw `KEY_NOT_FOUND` (expected
  `KEY_TOO_LONG`). Confirmed via `ts-node -e` against the built class, not
  just static reading.
- **Impacto**: A client that sends an obviously malformed key to `/expire` gets
  a `404` telling them the key doesn't exist, when the real problem is that the
  key was never valid input. This is a genuine contract violation (spec
  acceptance criteria for RF-004 implicitly assumes the shared validation rules
  apply uniformly across routes) and it is exactly the kind of route-by-route
  validation drift the earlier unverified draft warned about in the abstract
  ("Validation drift across routes can make the API contract inconsistent") —
  except here it's a concrete, reproducible instance, not a general worry.
- **Remediação**: Add `this.validateKey(key)` as the first line of
  `expire()` in `store.ts`, mirroring `validateWrite`'s pattern. This is a
  one-line fix with no design implications.
- **Referência**: `docs/spec.md` lines 101-104 (endpoint contract),
  line 216 ("GET and PERSIST on missing or expired keys MUST return 404
  KEY_NOT_FOUND" — note this sentence does not even mention EXPIRE, implying
  EXPIRE's own validation should run first).
- **Aprendizado**: When several HTTP routes share one validation rule (here:
  "key must be non-empty and ≤512 bytes"), the safest place to enforce it is
  the *single* boundary function every route calls before touching the store
  (`validateKey` already exists for this purpose) — not each handler
  remembering to call it individually. `DELETE`, `PERSIST`'s sibling `TTL`
  route, and `MGET` call it; `expire` and `PUT` (indirectly, via `set`) are
  the two paths that reveal what happens when the discipline isn't uniform.
  `PUT` happens to be safe because `set` calls `validateKey` internally, but
  `expire` has no equivalent internal call. A single test that runs the
  *same* invalid-key input against *every* endpoint would have caught this in
  minutes; the current test suite does not have such a table-driven check
  (see Testing category below).

### [MAJOR-002] Value-size limit (`VALUE_TOO_LARGE`) checked with UTF-16 code-unit count, not UTF-8 byte count — off by up to ~2x for multi-byte payloads

- **Arquivo**: `node-impl/src/store.ts:267-269`
  ```ts
  const serialized = JSON.stringify(value);
  if (serialized.length > this.config.maxValueBytes) {
    throw new DomainError(ErrorCode.ValueTooLarge, 'value is too large');
  }
  ```
  contrasted with the very next block, `store.ts:274`, which does it correctly:
  ```ts
  const approxBytes = Buffer.byteLength(key, 'utf8') + Buffer.byteLength(serialized, 'utf8') + ENTRY_OVERHEAD_BYTES;
  ```
- **Categoria**: Error Handling / Maintainability (two different measurement
  units for "size" coexist three lines apart in the same function)
- **Descrição**: `String.prototype.length` counts UTF-16 code units, not
  bytes. For ASCII content the two numbers coincide, which is why the existing
  test (`maxValueBytes: 4`, value `'large'`, a 5-char ASCII string) passes and
  never exposes the bug. For content with multi-byte UTF-8 characters (emoji,
  CJK, accented Latin outside Latin-1), `serialized.length` under-counts the
  true byte size, so the spec's "1 MiB serialized JSON" limit
  (`docs/spec.md:79`, `RNF-004`) can be bypassed by roughly 2x (common
  multi-byte Unicode is 3-4 UTF-8 bytes but only 1-2 UTF-16 code units).
- **Reproduced**: with `maxValueBytes: 100`, a string of 30 repeated emoji
  serialized to 122 UTF-8 bytes (`Buffer.byteLength`) but only 62 UTF-16 code
  units (`.length`). `store.set('k', bigEmojiString)` **succeeded** — the
  100-byte limit was silently exceeded by 22%. Verified via `ts-node -e`
  against the live class.
- **Impacto**: `MEMORY_LIMIT_EXCEEDED`/`VALUE_TOO_LARGE` are meant to bound
  worst-case memory (`RNF-004`); this bug means a client can smuggle
  meaningfully larger-than-configured values past the per-value gate as long
  as the content is Unicode-heavy. It does not defeat the *aggregate*
  `approxMemoryBytes` check (which does use `Buffer.byteLength` correctly and
  would still eventually reject via `MEMORY_LIMIT_EXCEEDED` once enough data
  accumulates), so this is not a full DoS bypass — it is a per-item contract
  violation with a real but bounded blast radius.
- **Remediação**: Change line 268 to
  `Buffer.byteLength(serialized, 'utf8') > this.config.maxValueBytes`,
  reusing the same computation already done on line 274 (could even compute
  `Buffer.byteLength(serialized, 'utf8')` once and reuse it for both the limit
  check and `approxBytes`, removing the duplication as a bonus).
- **Referência**: `docs/spec.md` line 79 (`Maximum value size | 1 MiB
  serialized JSON`), line 41 (`RNF-005: Deterministic serialization... UTF-8`).
- **Aprendizado**: "Size" is ambiguous in JavaScript/TypeScript unless you say
  which unit. `.length` on a `string` is *never* bytes — it's UTF-16 code
  units (and even that undercounts for astral-plane characters represented as
  surrogate pairs, though in this case the surrogate pair still contributes 2
  to `.length`, so the direction of the error is consistent: `.length` is
  always ≤ UTF-8 byte count for non-ASCII content). Any byte-budget check on
  a JS string MUST go through `Buffer.byteLength(str, 'utf8')` (Node) or
  `new TextEncoder().encode(str).length` (portable). This is a good "same
  function, two units, no test caught it" teaching example precisely because
  the *existing* test suite's only large-value case was pure ASCII.

### [MAJOR-003] Server binds `0.0.0.0` by default; spec requires default `127.0.0.1`

- **Arquivo**: `node-impl/src/main.ts:10`
  ```ts
  server.listen(port, '0.0.0.0', () => { ... });
  ```
  Documented (not just accidental) in `node-impl/README.md:14`: "The service
  listens on `0.0.0.0:8081` by default."
- **Categoria**: Security
- **Descrição**: `docs/spec.md:48` states plainly: "The default bind address is
  `127.0.0.1`". The Node implementation's default is the opposite of the spec's
  default — `0.0.0.0` binds to all network interfaces, making the
  unauthenticated key-value API reachable from any host that can route to the
  machine (LAN, or the public internet if the host has a public IP and no
  firewall). There is no `BIND_ADDRESS`/`HOST` environment variable to
  override it back to loopback; `PORT` is the only configurable knob
  (`main.ts:7`).
- **Impacto**: This is a real, if scoped, security regression from the written
  contract: for a teaching service with no authentication, the safe default is
  loopback-only, opt-in-to-network-exposure — not the reverse. A learner who
  runs this locally without reading the README carefully is one `docker run -p
  8081:8081` away from exposing a fully open read/write/delete key-value store
  to their LAN.
- **Remediação**: Change the default bind host to `127.0.0.1` (or read from an
  env var defaulting to `127.0.0.1`, e.g. `process.env.HOST ?? '127.0.0.1'`),
  and update `README.md` to match. If network-wide binding is genuinely wanted
  for container deployments, make it an explicit opt-in via env var rather
  than the hardcoded default, and note the trade-off in the README (the
  pre-existing draft review's "Educational" note about documenting the trust
  boundary was correct in spirit but did not identify that the code actively
  contradicts the written spec default — this review upgrades that from
  "worth documenting" to "spec conformance bug").
- **Referência**: `docs/spec.md` line 48 (API/Interface Contract).
- **Aprendizado**: A spec's stated default is part of the contract, not just a
  suggestion — "implementation-defined port, but MUST document" (spec line 48)
  is explicitly looser than the fixed default bind address in the same
  sentence. When a project spec pins a specific default for a security-
  relevant setting, grep the implementation for that literal value during
  review; don't assume the README's stated behavior means it was a deliberate,
  reviewed choice.

### [MINOR-001] `mset`'s per-item plan lookup by array index is fragile under future refactors

- **Arquivo**: `node-impl/src/store.ts:214-219`
  ```ts
  items.forEach((item, index) => {
    const existing = this.entries.get(item.key);
    const plan = plans[index];
    if (plan === undefined) {
      return;
    }
    ...
  ```
- **Categoria**: Maintainability
- **Descrição**: `plans` is built in the same loop order as `items` (line 205:
  `plans.push(plan)`), so `plans[index]` is currently always defined for every
  valid index — the `if (plan === undefined) return;` guard is dead code today
  (confirmed: the loop that builds `plans` either pushes exactly one entry per
  item or throws before reaching the push, so `plans.length === items.length`
  whenever the commit loop runs). It's not a live bug, but it's a silent
  correctness dependency on "loop A and loop B iterate the same array in the
  same order" that isn't enforced by the type system — a future refactor
  (e.g. deduplicating plans, or processing items out of order for a batching
  optimization) could silently skip writes with no error and no test failure,
  since the `return` swallows the mismatch instead of asserting on it.
- **Impacto**: Low today; this is a latent footgun, not a live defect.
- **Remediação**: Either use a `Map<string, WritePlan>` keyed by item key
  instead of a parallel array (removes the index-alignment assumption
  entirely), or replace the silent `return` with an explicit invariant check
  (`if (plan === undefined) throw new Error('invariant violated: plan/item
  index mismatch')`) so a future regression fails loudly instead of silently
  dropping a write.
- **Referência**: `docs/spec.md` line 31, RF-010 ("MSET... MUST validate every
  item first, then store all pairs or none").
- **Aprendizado**: When two arrays are built from the same source in "parallel
  loops" and later zipped by index, prefer a single pass that produces
  key-indexed data (`Map`/object), or add an assertion, so the parallel-array
  invariant is enforced rather than assumed. This is a common source of
  "works today, breaks after next refactor" bugs.

### [MINOR-002] `expiresAt` timestamp computed from `Date.now()`, not from the injectable monotonic clock — tests can't fully control expiry-timestamp determinism

- **Arquivo**: `node-impl/src/store.ts:131` (`expire`), `store.ts:285`
  (`validateWrite`'s write plan): both compute
  `new Date(Date.now() + ttlSeconds * 1000)` for the client-facing
  `expiresAt` field, while the internal expiry *comparison* correctly uses
  `this.nowNanos()` (the injectable clock used throughout the rest of the
  class, e.g. `store.ts:67`'s constructor parameter).
- **Categoria**: Testing / Idiomaticity
- **Descrição**: The spec (`docs/spec.md:169`) is explicit: "ISO-8601
  timestamps returned to clients are for observability only and MUST NOT be
  used internally for expiry comparisons" — and the code correctly honors
  that (internal comparisons use `nowNanos()`/`expiresAtNanos`, never
  `expiresAtDate`). But the *value* of `expiresAt` itself is derived from the
  real wall clock (`Date.now()`) even when the store was constructed with an
  injected fake `nowNanos` for deterministic testing (as `store.test.ts:6-7`
  does: `new KeyValueStore({}, () => now)`). This means a test that freezes
  `nowNanos` still gets a real, non-deterministic `expiresAt` ISO string in
  the response — the existing tests happen not to assert on the exact
  `expiresAt` value (only `toBeDefined()` at `store.test.ts:10`), so this
  hasn't caused a flaky test yet, but it's a latent seam gap.
  Node/TypeScript's own spec section (`docs/spec.md:295`) recommends "Use
  `process.hrtime.bigint()`... for TTL calculations; use `Date` only for
  response timestamps" — which the code does — but doesn't address that the
  *response* `Date` should still be derivable from the same injected clock for
  full test determinism.
- **Impacto**: Low — no functional bug, but it limits how precisely a test can
  assert on `expiresAt`'s exact value, and it's a small inconsistency in an
  otherwise clean "inject the clock" pattern that the rest of the class
  follows (this project's own `learner/journal.md` entry "`Clock` injection is
  the universal testability seam" documents this exact pattern from Project
  01 — Project 02's Node implementation follows it for internal comparisons
  but not for the client-facing timestamp derivation).
- **Remediação**: Accept an optional wall-clock function alongside
  `nowNanos` (or derive wall-clock-equivalent nanos-since-epoch from the same
  injected source when it's a fake), so `expiresAtDate` becomes fully
  deterministic under test.
- **Referência**: `docs/spec.md` line 169, line 295; `learner/journal.md`
  "`Clock` injection is the universal testability seam" (2026-06-03).
- **Aprendizado**: "Inject the clock" is only complete if *every* time-derived
  output goes through the seam — including values that only appear in
  responses, not in comparisons. A partially-injected clock still leaves
  tests with one degree of non-determinism, even if it's currently unused by
  any assertion.

### [MINOR-003] Health endpoint's `removeExpired` full-table scan runs on every `/health` call

- **Arquivo**: `node-impl/src/store.ts:242-243`
  ```ts
  health(): {...} {
    this.removeExpired(this.nowNanos());
    ...
  ```
  `removeExpired` (store.ts:302-309) iterates every entry in the map.
- **Categoria**: Performance
- **Descrição**: `RNF-008` requires `/health` to report `expiredKeysRemoved`
  and other counters; calling `removeExpired` there is a reasonable way to
  keep `keyCount` honest. But at the spec's stated scale (`RNF-001`/`RNF-002`:
  10,000 resident keys), a full `O(n)` scan on every health check — which
  monitoring systems typically poll every few seconds — means the health
  endpoint's cost scales with total key count, unlike every other read path
  (`get`, `ttl`) which is `O(1)` and only removes the single key being
  touched.
- **Impacto**: Low at 10,000 keys (a `Map` iteration of 10k entries is sub-
  millisecond), but worth flagging because `/health` is usually the
  *cheapest*, most frequently polled endpoint in a service, and this is the
  one place it's deliberately made `O(n)`.
- **Remediação**: Either drop the proactive sweep from `/health` (since lazy
  cleanup on individual key access already guarantees expired keys are
  invisible, per RF-011, `keyCount` would just be "count including some stale
  but soon-to-be-cleaned entries" — acceptable for an approximate health
  metric) or rate-limit the sweep (e.g. only sweep if the last sweep was >N
  seconds ago).
- **Referência**: `docs/spec.md` line 32 (RF-011, lazy-or-sweep is explicitly
  allowed), line 44 (RNF-008).
- **Aprendizado**: A metrics/health endpoint should generally be the cheapest
  path in the service, since it's polled the most often and by automated
  systems with no backoff. Doing eager cleanup work there trades an
  occasional accuracy improvement for a cost profile that scales with total
  state size on the one endpoint where that's least expected.

### [MINOR-004] `express.json({ limit: '2mb' })` is a different, looser limit than the spec's per-value 1 MiB

- **Arquivo**: `node-impl/src/server.ts:18`
  ```ts
  app.use(express.json({ limit: '2mb' }));
  ```
- **Categoria**: Maintainability
- **Descrição**: The body-parser limit (2 MiB) is independent of and larger
  than the domain-level `maxValueBytes` (1 MiB default, `store.ts:4`). This is
  defensible — the request body includes the key, the `ttlSeconds` field, and
  JSON structural overhead, plus `mset` bodies contain *multiple* items each
  up to 1 MiB — but the "2mb" number is a magic literal with no comment tying
  it back to the domain limits it's meant to accommodate, and no test exists
  that exercises the boundary between "rejected by body-parser" (generic
  Express error, not the spec's `413 VALUE_TOO_LARGE` envelope) and "rejected
  by domain validation" (`413 VALUE_TOO_LARGE`, correctly enveloped).
- **Impacto**: Low — but a request that exceeds 2 MiB gets a raw
  Express/body-parser error, not the spec-mandated `{ ok: false, error: {
  code: ... } }` envelope, which would be a contract violation for that edge
  case (RNF-005: "All request and response bodies MUST... use the response
  envelopes defined below" — this includes error cases).
- **Remediação**: Derive the body-parser limit from the domain constants
  (e.g. `maxValueBytes * someMultiSetFactor + overhead`) with a comment
  explaining the relationship, and add a test asserting that an oversized
  body still returns the shared error envelope (even if via the generic
  Express error handler being adapted to it).
- **Referência**: `docs/spec.md` line 41 (RNF-005), line 79 (max value size).
- **Aprendizado**: Transport-layer limits (body parser, proxy, load balancer)
  and domain-layer limits (business rule) are two different budgets that
  should be sized in relation to each other, not picked independently. When
  they diverge, the failure mode at the transport boundary is often outside
  the application's own error-envelope contract — worth an explicit test.

### [EDUCATIONAL-001] Node's single-threaded event loop genuinely eliminates the concurrency-safety risk this spec worries about — for this implementation, as written

- **Categoria**: Testing / Idiomaticity (cross-cutting concurrency discussion,
  requested explicitly by this review's brief)
- **Descrição**: The spec's `RNF-003` demands "Concurrent requests MUST NOT
  corrupt store state, resurrect expired keys, lose successful writes, or
  expose partially applied MSET operations," and the canonical comparison
  question in the spec is "how does each language's map/dictionary
  implementation compare under concurrent read/write pressure?" For Node
  specifically: this implementation does **not** use worker threads or
  clusters (confirmed: no `worker_threads`, `cluster`, or `child_process`
  import anywhere in `src/`), so there is exactly one JS thread executing
  application code, and **every store method in `store.ts` is fully
  synchronous — there is no `await` anywhere between a method's entry and its
  return** (confirmed via `grep -n await src/*.ts` — zero matches in
  `store.ts` or `server.ts`). Because Express's handler for a given request
  runs to completion (or to its next microtask/`await`) before the event loop
  picks up another callback, and because this store never awaits mid-mutation,
  every store method (`set`, `mset`, `flushdb`, etc.) is atomic *with respect
  to other requests* even though there is no explicit lock anywhere. This is
  categorically different from Go or Rust, where the OS scheduler can
  preempt a goroutine/thread at any point and an explicit `Mutex`/`RWMutex` is
  required for the same guarantee.
- **Onde isso pode quebrar (the actual risk, not a hypothetical)**: the
  guarantee depends entirely on "no `await` between validation and commit"
  holding forever. If a future contributor adds `await someAsyncLogger(...)`
  or `await someValidationCall(...)` inside `mset` between the validation loop
  (store.ts:195-212) and the commit loop (store.ts:213-228), the atomicity
  guarantee silently breaks — two concurrent `mset` calls could interleave at
  that `await` point, violating RF-010's "all pairs or none." Nothing in the
  type system or the test suite would catch this; it is a convention, not an
  enforced invariant. The spec's own Node-specific notes
  (`docs/spec.md:294`) say exactly this: "Keep storage mutations synchronous
  and avoid `await` between validation and commit" — the implementation
  follows this correctly today, but the guarantee is a discipline, not a
  compile-time guarantee.
- **Aprendizado**: "Node is single-threaded, so it's automatically safe" is a
  half-truth that this codebase demonstrates correctly: the safety comes
  specifically from *the absence of `await` in the critical section*, not
  merely from being single-threaded. A single-threaded program with `async`
  functions can still interleave at every `await`, producing the exact
  torn-write bugs a multi-threaded program gets from missing locks — just
  triggered by cooperative yielding instead of preemption. The correct mental
  model is: JS is single-threaded, but *concurrent* (interleaved) execution is
  still possible through the event loop; *atomicity* requires "no yield point
  inside the critical section," which is a code-review-enforced invariant in
  this codebase, not a language guarantee. A regression test that would catch
  a future violation: spawn N concurrent `Promise`-wrapped calls into an
  `mset`-triggering endpoint via `Promise.all`, assert the store afterward has
  either all-N-sets' effects or none partially interleaved — this test does
  not currently exist (see Testing category).

### [EDUCATIONAL-002] TTL-to-nanosecond conversion via `BigInt(ttlSeconds) * NANOS_PER_SECOND` is exact where a float-based approach would silently drift

- **Categoria**: Idiomaticity
- **Descrição**: `store.ts:130` and `store.ts:284` compute expiry as
  `now + BigInt(ttlSeconds) * NANOS_PER_SECOND`, where `now` comes from
  `process.hrtime.bigint()` (nanosecond-precision `BigInt`). Using `BigInt`
  throughout avoids the classic float-precision trap of `Date.now() +
  ttlSeconds * 1000` accumulating rounding error over large `ttlSeconds`
  values (the spec allows up to 30 days = 2,592,000 seconds,
  `docs/spec.md:83`) — `2592000 * 1000 = 2,592,000,000`, still exactly
  representable as a JS `number` (safe up to 2^53), so this particular
  implementation would actually be fine with floats at these magnitudes, but
  the `BigInt` choice is future-proof against a spec change to
  millisecond/microsecond-level nanosecond precision requirements or larger
  TTL windows.
- **Aprendizado**: `process.hrtime.bigint()` + `BigInt` arithmetic is the
  idiomatic Node pattern for monotonic-time math that must never silently
  lose precision, exactly per the spec's own Node-specific note
  (`docs/spec.md:295`: "Use `process.hrtime.bigint()`... for TTL
  calculations"). Contrast with the client-facing `expiresAt` field, which
  correctly uses regular `Date`/`number` math (`store.ts:131`) — because
  observability timestamps don't need nanosecond precision, only internal
  comparisons do. This split is a good example of "use the higher-precision
  type only where precision loss would be observable."

### [EDUCATIONAL-003] `KEYS` sorts and slices in a single line, but the sort is `O(n log n)` even when `limit` is small

- **Categoria**: Performance
- **Descrição**: `store.ts:171`:
  `[...this.entries.keys()].filter(...).sort().slice(0, limit)` — the full
  filtered result is sorted before slicing, so requesting `limit=1` on a
  100,000-key store still pays for a full sort of every matching key. The
  spec's default `limit` is 1,000 and max is 10,000 (`docs/spec.md:254`), so
  in the worst case (`maxKeys: 100_000`, `limit: 10_000`) this is a real but
  bounded cost — not a correctness bug, and arguably fine for a "fundamentals"
  level project, but worth naming because a partial-sort or a min-heap of
  size `limit` would be the asymptotically better structure if `KEYS` needed
  to scale further (e.g. Project 10's Distributed Cache).
- **Aprendizado**: `sort-then-slice` is the simplest correct implementation
  and is the right choice for a Level-1 fundamentals project — flagging this
  only so the "when to reach for a bounded/partial sort" lesson is written
  down for when a later project's non-functional requirements actually make
  it matter.

### [EDUCATIONAL-004] Zod's `z.lazy` recursive schema for `JsonValue` is the correct idiom, and its recursion depth is bounded only by the call stack

- **Categoria**: Idiomaticity
- **Descrição**: `server.ts:7-9` defines `jsonValueSchema` recursively via
  `z.lazy(...)` to validate arbitrarily nested JSON — a clean, idiomatic
  match for the domain's own recursive `JsonValue` type
  (`types.ts:1`). Worth noting for learners: because this recursion is
  implemented via normal JS function calls (not trampolined), an
  attacker-supplied, sufficiently deeply nested JSON body (e.g.
  `[[[[[...]]]]]` nested 50,000 levels) could throw `RangeError: Maximum call
  stack size exceeded` during validation, which the current error handler
  (`server.ts:106-113`, `toDomainError`) would catch via the generic
  `instanceof SyntaxError` / fallback path — actually, `RangeError` is not
  `SyntaxError`, so it would fall through to the generic
  `INVALID_COMMAND` 400 response rather than crashing the process, which is
  an acceptable (if accidental) outcome, but not one the code or tests
  document intentionally.
- **Aprendizado**: Recursive validators over untrusted input should have an
  explicit depth limit, not rely on the call stack limit as an implicit one.
  This is a common gap in schema-validation libraries used against
  attacker-controlled JSON; `express.json({ limit: '2mb' })` bounds the byte
  size but not the nesting depth, and a 2 MiB body can still nest very deeply
  with minimal bytes per level (e.g. `[` × 500,000 followed by matching `]`).
  Not filed as a Major/Minor because no crash was reproduced and the review's
  time budget didn't extend to constructing and running that exact payload —
  flagged here as a concrete, testable hypothesis for a future pass rather
  than an unverified claim of a live vulnerability.

## 7-Category Coverage Checklist

- [x] **Security** — MAJOR-003 (bind address), EDUCATIONAL-004 (unbounded
  recursion depth in JSON validation)
- [x] **Performance** — MINOR-003 (health sweep), EDUCATIONAL-003 (KEYS sort)
- [x] **Readability** — implicitly covered across all issues (file
  organization is clean: `store.ts`/`server.ts`/`types.ts`/`main.ts` split is
  a real strength, noted below)
- [x] **Maintainability** — MINOR-001 (parallel-array fragility), MINOR-004
  (magic body-parser limit)
- [x] **Idiomaticity** — EDUCATIONAL-001 (event-loop atomicity), 
  EDUCATIONAL-002 (BigInt TTL math), EDUCATIONAL-004 (zod recursive schema)
- [x] **Error Handling** — MAJOR-001 (expire validation gap), MAJOR-002
  (byte-count bug), MINOR-002 (clock injection gap)
- [x] **Testing** — see dedicated section below

## Testing — is the 6-test suite meaningful or superficial?

**Verdict: meaningful for the paths it covers, but leaves real gaps that this
review's own findings above fell straight through.**

What the 6 tests do well:
- `store.test.ts` test 1 exercises SET → GET → TTL-not-null → PERSIST →
  TTL(-1) → SET-again-clears-TTL in one coherent sequence using an injected
  fake clock (`() => now`), which is exactly the "Clock injection" pattern
  documented in `learner/journal.md`. This is a real state-machine test, not a
  smoke test.
- `store.test.ts` test 2 verifies lazy expiry (`get` returns `null`, `ttl`
  returns `-2`) and idempotent delete (`deleted: 1` out of 3 requested keys,
  2 of which are missing/expired) in one assertion — a genuinely meaningful
  edge-case test.
- `store.test.ts` test 3 verifies MSET's atomicity directly: a `maxKeys: 2`
  store rejects a third key via `mset` and confirms the rejected key (`c`)
  was **not** partially written (`store.get('c')` is `null` after the
  throw) — this is a real atomicity assertion, not just "it throws."
- `store.test.ts` test 4 and `server.test.ts`'s two tests cover input
  validation (empty key, too-long key, oversized value, invalid TTL,
  duplicate mset keys) and HTTP envelope shape (success/error envelopes,
  malformed JSON body).

What's missing (concretely, not just "more tests would be nice"):
1. **No test exercises `/expire` or `/persist` with an invalid key** — this
   is exactly the gap that let MAJOR-001 ship unnoticed. A single
   table-driven test ("for each of PUT/GET/DELETE/EXPIRE/TTL/PERSIST, an
   empty-string key returns 400 INVALID_KEY") would have caught it directly.
2. **No test with non-ASCII/multi-byte value content** — this is exactly the
   gap that let MAJOR-002 ship unnoticed; the only "too large" test
   (`store.test.ts:49`) uses a pure-ASCII string.
3. **No concurrency/interleaving test** — RNF-003 ("Concurrent requests MUST
   NOT... expose partially applied MSET operations") is a stated
   non-functional requirement, and while this review's own analysis
   (EDUCATIONAL-001) explains *why* the current single-threaded, no-`await`
   design satisfies it, there is no `Promise.all`-based test that would
   catch a *future* regression (e.g. someone adding an `await` inside
   `mset`). This mirrors the exact "well-tested is not the same as
   regression-proof" lesson from the 01_rate_limiter review's journal entry
   about the dead `ClientKeyStrategy` abstraction — except here the risk is
   inverted: it's not dead code, it's live code whose safety property has no
   test guarding it.
4. **No benchmark/load evidence for RNF-001/RNF-002** (p95 GET < 5ms, p95 SET
   < 10ms at 10,000 keys) — expected, since that's the benchmarker phase's
   job, not the reviewer's, but noting it here so the benchmark phase has a
   concrete pointer.
5. **`types.ts` shows 0% coverage** in the coverage report — expected, since
   it's pure type declarations with no runtime code, but worth confirming
   explicitly rather than assuming (confirmed: `types.ts` contains only
   `type`/`interface` declarations, no executable statements).

None of the above gaps were severe enough by themselves to file as a
standalone Major (the resulting bugs are filed as MAJOR-001/002 above); they
are listed here as the *test-suite-quality* finding requested by this review's
scope, separate from the *code* findings.

## Readability / cross-cutting positive notes (please read — praise is not filler)

- The `store.ts` / `server.ts` / `types.ts` / `main.ts` split cleanly
  separates pure domain logic (no `express`/`http` imports in `store.ts`),
  HTTP wiring, shared types, and the process entrypoint. This is the "pure
  core, thin shell" pattern this ecosystem's `learner/journal.md` already
  names as a generalization from Project 01 — Project 02's Node
  implementation is a clean second example of the same shape.
- `DomainError` as a typed exception class with a `code: ErrorCode` field,
  caught once at the Express error-handling middleware (`server.ts:86-90`)
  and mapped to HTTP status via a single `statusFor` function
  (`server.ts:116-127`), is a clean, idiomatic way to keep domain errors
  decoupled from HTTP concerns — every domain method just throws, and only
  one place in the codebase knows about status codes.
- Graceful shutdown (`main.ts:14-29`) correctly implements RNF-007's "allow
  in-flight requests to complete for up to 5 seconds" via `server.close()` +
  a `5000`ms fallback timer with `.unref()`, matching this ecosystem's
  documented `setInterval(...).unref()` idiom from the Project 01 journal
  entry, applied correctly here to a shutdown timer instead of a cleanup
  timer.
- The MSET atomicity design (validate-all-then-commit-all, `store.ts:188-232`)
  correctly implements RF-010's "all-or-nothing" requirement in the common
  case (confirmed by test 3, and confirmed by re-reading the validation loop
  at lines 195-212, which throws before any `entries.set` call runs) — the
  only issue found here is the latent fragility noted in MINOR-001, not a
  live correctness bug.

## Cross-Language Comparison

**Not attempted this cycle.** Go and Rust implementations exist in the
repository (`go-impl/`, `rust-impl/`) but per the explicit scope decision
recorded in `learner/pipeline_status.md` ("Go/Rust: not started this cycle —
out of scope"), they were not read, executed, or compared against Node in
this review. Any cross-language comparison in the previous draft
`code_review.md` (now superseded by this document) should not be relied upon
— it was written for a different, informal pass and is not re-verified here.
A genuine cross-language comparison should be deferred to a future cycle that
explicitly re-opens Go/Rust scope.

## Pre-existing documentation-integrity issue (noted, not fixed this phase)

`curriculum/catalog.md` (line 290, "02. Key-Value Store... ✅ ✅") and
`curriculum/BACKLOG_STATUS.md` (line 28, "`02_key_value_store` |
`scaffolded` | ... pending catalog-verified 5-phase gate") **contradict each
other**, and neither reflected reality as of the start of this review: no
cycle had completed a real gated review for Project 02 before this session.
This review is itself part of correcting that — but per this cycle's phase
scope (`review`, not `optimize`/`certify`), the catalog/backlog wording itself
is intentionally left unchanged here. It should be corrected in the
optimize/certify phase once benchmark also completes, so the catalog reflects
the actual state of the pipeline rather than being updated piecemeal mid-cycle.
