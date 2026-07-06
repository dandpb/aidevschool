# Quiz: Project 02 Key-Value Store (Node/TypeScript)

> Tests comprehension of the Node implementation reviewed in this cycle, not
> memorization of the spec text. Each question includes the answer and an
> explanation. Scope: Node only (Go/Rust out of scope this cycle).

---

**Q1. In `curriculum/02_key_value_store/node-impl/src/store.ts`, the `expire()`
method calls `validateTtl(ttlSeconds)` but never calls `this.validateKey(key)`.
Given an empty-string key and a valid `ttlSeconds`, what error code does the
current code actually return, and what does the spec say it should return?
Why does the code produce the wrong answer instead of crashing or doing
nothing?**

<details>
<summary>Answer</summary>

The code returns `KEY_NOT_FOUND` (HTTP 404). The spec
(`docs/spec.md` lines 101-104) requires `400 INVALID_KEY` for an invalid key,
checked before existence.

It produces the wrong answer (rather than crashing) because
`validStoredKey(key, now)` — the function `expire()` calls to check the key —
is a pure map lookup plus an expiry check. It has no way to distinguish "this
key was never valid input" from "this key is valid input but isn't in the
map right now." Both cases return `false` from `validStoredKey`, and
`expire()` unconditionally translates `false` into `KEY_NOT_FOUND`. The bug
is a missing validation call, not a logic error inside an existing check —
which is why it fails silently (wrong status code) instead of throwing an
unhandled exception.
</details>

---

**Q2. A value serializes to a JSON string containing many multi-byte Unicode
characters (say, 30 emoji). `store.ts`'s `validateWrite` checks
`serialized.length > this.config.maxValueBytes` to enforce the spec's "1 MiB
serialized JSON" limit. Will this check under-count or over-count the true
byte size for this value, and in which direction does that make the bug
exploitable?**

<details>
<summary>Answer</summary>

It **under-counts**. `String.prototype.length` in JavaScript counts UTF-16
code units, not UTF-8 bytes. A single emoji is typically represented as a
UTF-16 surrogate pair (`.length` contributes 2) but encodes to 4 bytes in
UTF-8 — so `.length` reports roughly half (or less, for 3-byte UTF-8
characters like most CJK, where `.length` is 1 but bytes are 3) of the true
byte count.

This is exploitable in the direction of **bypassing the limit**: a client can
send a value whose real UTF-8 byte size exceeds `maxValueBytes` but whose
`.length` does not, and the write will be accepted when it should have been
rejected with `VALUE_TOO_LARGE`. This was verified directly in this review:
a `maxValueBytes: 100` store accepted a value that serialized to 122 UTF-8
bytes because its `.length` was only 62.
</details>

---

**Q3. `main.ts` calls `server.listen(port, '0.0.0.0', ...)`. `docs/spec.md`
states the default bind address MUST be `127.0.0.1`. Explain, in one
sentence, the concrete difference in exposure between these two addresses,
and why that difference matters more for this project than it might for a
typical web app.**

<details>
<summary>Answer</summary>

`127.0.0.1` (loopback) only accepts connections originating from the same
machine, while `0.0.0.0` accepts connections from any network interface
(LAN, and the public internet if the host is directly reachable) — it
matters more here because this key-value store has **no authentication at
all**, so binding to `0.0.0.0` turns "a local teaching exercise" into "an
unauthenticated read/write/delete data store reachable by anyone who can
route to the host."
</details>

---

**Q4. `store.test.ts` constructs `new KeyValueStore({}, () => now)`, injecting
a fake clock. Which of the store's outputs is fully controlled by this fake
clock, and which output still depends on the real wall clock even when the
fake is injected? Point to the specific lines.**

<details>
<summary>Answer</summary>

The internal expiry comparisons (`expiresAtNanos`, checked in
`validStoredKey`/`removeExpired`/`ttl`) are fully controlled by the injected
`nowNanos` function — this is what makes `store.test.ts`'s time-travel
assertions (`now += 20_000_000_000n; ...`) deterministic.

The client-facing `expiresAt` field, however, is computed at `store.ts:131`
(`expire`) and `store.ts:285` (`validateWrite`) via
`new Date(Date.now() + ttlSeconds * 1000)` — using the real system clock
`Date.now()`, not the injected `nowNanos`. So even with a fake clock
injected, the `expiresAt` ISO string returned to callers is still derived
from real wall-clock time. The existing tests don't catch this because they
only assert `expiresAt` is defined/null, never its exact value.
</details>

---

**Q5. The spec says `RNF-003: Concurrency safety — Concurrent requests MUST
NOT... expose partially applied MSET operations.` The Node implementation has
no mutex or lock anywhere in `store.ts`. Explain the actual mechanism that
makes MSET atomic here, and describe one specific code change that would
silently break that atomicity without any type error or test failure at
write time.**

<details>
<summary>Answer</summary>

The mechanism: Node's event loop runs one JS callback to completion (up to
its next `await`) before running another. `mset()` (and every other store
method) contains **no `await`** between its validation loop and its commit
loop — it is synchronous from entry to return. Because of that, once a
request's `mset()` call starts running, no other request's code can run
until it finishes; there is no point where two `mset` calls (or an `mset`
and a `set`) can interleave.

A change that would silently break this: inserting any `await` inside
`mset()` between the validation loop (which builds `plans`) and the commit
loop (which calls `this.entries.set(...)`) — for example, `await
someAuditLogger.log(...)` for compliance logging. This would not cause a
type error or an immediate test failure (the existing tests don't run
concurrent requests against `mset`), but it would create a window where a
second concurrent `mset`/`set` call could commit its own writes in between
this call's validation and commit, potentially violating the "all keys or
none" guarantee if, e.g., a `flushdb` ran in that window.
</details>

---

**Q6. `KeyValueStore.keys(prefix, limit)` is implemented as:
`[...this.entries.keys()].filter(k => k.startsWith(prefix)).sort().slice(0, limit)`.
Is this implementation's asymptotic cost dependent on `limit`, or on the
total number of keys in the store? Is this a correctness bug, a performance
concern, or neither — and why?**

<details>
<summary>Answer</summary>

The cost is dependent on the **total number of matching keys** (up to the
total key count), not on `limit` — the `.sort()` call runs on the entire
filtered array before `.slice()` throws most of it away. Requesting
`limit=1` on a store with 100,000 keys still pays for sorting every matching
key.

This is **neither a correctness bug nor a severe performance concern** at
this project's stated scale (the spec's own non-functional targets assume
10,000 resident keys, and `limit` is capped at 10,000) — a JS array sort of
that size is sub-millisecond. It's flagged as an Educational/Minor point
because `KEYS` is the one place in this codebase where cost scales with
total store size rather than with the requested result size, which is worth
noticing even though it doesn't violate any stated requirement today.
</details>

---

**Q7. `express.json({ limit: '2mb' })` is configured in `server.ts`, while the
domain-level `maxValueBytes` defaults to 1 MiB (`1 << 20` in `store.ts`).
If a client sends a request body larger than 2 MiB, what response format
does the client receive — the spec's `{ ok: false, error: {...} }` envelope,
or something else? Why does this matter given RNF-005?**

<details>
<summary>Answer</summary>

Something else: a request body exceeding the `express.json` limit is
rejected by Express's body-parser middleware itself, before it ever reaches
any route handler or the `errorHandler` middleware that wraps `DomainError`s
into the spec's envelope. Express's default behavior for a payload-too-large
body-parser error is its own generic error response, not the application's
`{ ok: false, error: { code, message, details } }` shape.

This matters because RNF-005 states "All request and response bodies MUST...
use the response envelopes defined below" — which by its wording covers
error responses too. An oversized-body 413 response that isn't in the
spec's envelope shape is a (narrow, edge-case) contract violation that the
current test suite does not exercise.
</details>

---

**Q8. True or false: because this project's spec explicitly scopes
persistence/snapshotting as "conceptual for later extension"
(`docs/spec.md` line 207), the absence of any disk-persistence or
crash-recovery code in `node-impl/` is a defect that should block this
review. Justify your answer.**

<details>
<summary>Answer</summary>

**False.** The spec explicitly and deliberately excludes persistence from
this project's required scope — it names the design decision directly:
"In-memory authoritative state... Snapshot/persistence basics remain
conceptual for later extension." Confirmed by grepping the Node source: no
filesystem writes, no snapshot format, no crash-recovery logic exists
anywhere in `src/`, which is the *correct* state for this cycle, not a gap.
Flagging its absence as a defect would be reviewing the code against
requirements it was never asked to meet — the opposite error of rubber-
stamping, but still not a real finding.
</details>
