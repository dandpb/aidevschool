# Code Review — Project 07 · REST API with Auth

> Inputs: `docs/spec.md`, `go-impl/`, `node-impl/` source and tests.
> Posture: pedagogical review — security-sensitive, but still focused on learning architecture tradeoffs.

## Executive Summary

The Go and Node/TypeScript implementations both deliver a compact authenticated REST API: registration, login, JWT access tokens, opaque refresh tokens, refresh rotation, RBAC-protected user listing, self/admin update rules, request IDs, validation, and audit entries. Both implementations are intentionally in-memory and dependency-injected enough for tests.

The strongest shared learning outcome is the separation of token service, password hasher, audit logger, store, auth service, and user service. The biggest security gap is concurrent refresh safety: both implementations perform lookup-then-rotate on in-memory session state without an atomic compare-and-swap operation around a refresh token. The second major gap is password hashing strength: Node uses PBKDF2 correctly via the standard library, while Go implements a custom PBKDF-like loop instead of using a vetted password-hashing package.

## Severity Summary

| Implementation | Critical | Major | Minor | Educational | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Go | 0 | 4 | 3 | 2 | 9 |
| Node/TS | 0 | 3 | 3 | 2 | 8 |
| Cross-language | 0 | 2 | 1 | 1 | 4 |
| **Total** | **0** | **9** | **7** | **5** | **21** |

## Seven-Category Coverage

| Category | Representative findings |
| --- | --- |
| Security | password hashing, refresh races, token/session checks |
| Performance | auth middleware benchmark missing; PBKDF cost blocks handlers |
| Readability | services are separable but concentrated in single large files |
| Maintainability | in-memory stores and limited config sources |
| Idiomaticity | Fastify hooks and Go middleware are idiomatic first passes |
| Error Handling | structured envelopes mostly consistent; method errors drift |
| Testing | good integration tests; missing expiry/wrong-audience/concurrency tests |

## Go Findings

### [GO-MAJOR-001] Custom password hashing should not replace a vetted KDF

- **Category:** Security
- **Evidence:** `pbkdf` manually composes HMAC-SHA256 loops in `internal/authapi/app.go`.
- **Impact:** Credential storage is security-sensitive. Even if the code resembles PBKDF2, custom KDF implementations are easy to get subtly wrong and hard to audit.
- **Pedagogical fix:** Use `golang.org/x/crypto/argon2`, `bcrypt`, or `pbkdf2.Key` from `x/crypto/pbkdf2`; keep cost configurable.

### [GO-MAJOR-002] Refresh rotation is not atomic for concurrent replay attempts

- **Category:** Security · Testing
- **Evidence:** `FindSessionByHash` returns a clone; `Refresh` checks status, then later saves rotated status and child session.
- **Impact:** Two concurrent refresh requests can both observe an active cloned session and create two valid child sessions. This violates RNF-008 and RF-016.
- **Pedagogical fix:** Add a repository method like `RotateRefreshToken(hash, now) (old, ok, replay)` that mutates under one lock/transaction.

### [GO-MAJOR-003] Method-not-allowed responses bypass the common error envelope

- **Category:** Error Handling
- **Evidence:** `method` and `methodHandler` call `w.WriteHeader(http.StatusMethodNotAllowed)` without JSON body/request ID.
- **Impact:** RNF-006 requires deterministic top-level JSON shape. Method errors become shape outliers.
- **Pedagogical fix:** Return structured `METHOD_NOT_ALLOWED` errors through `writeError`.

### [GO-MAJOR-004] Token verification does not check session/JTI revocation state

- **Category:** Security · Maintainability
- **Evidence:** `VerifyAccessToken` validates JWT claims cryptographically, but middleware does not compare `jti` against session state.
- **Impact:** RF-008 says token identifier must be verified. Current access tokens remain valid until expiry even after session rotation/revocation.
- **Pedagogical fix:** Either document stateless access-token caveat, or maintain a JTI/session revocation check in middleware.

### [GO-MINOR-001] Config env coverage is partial

- **Category:** Maintainability
- **Evidence:** `cmd/server/main.go` reads `JWT_SECRET` and `ACCESS_TOKEN_SECONDS`, but not issuer, audience, refresh expiry, or hash cost.
- **Impact:** RNF-002/RNF-005 are only partly configurable without code changes.
- **Pedagogical fix:** Parse all security config from env with validation.

### [GO-MINOR-002] Successful refresh does not update old session `LastUsedAt`

- **Category:** Readability · Auditability
- **Evidence:** refresh sets `RotatedAt`, but not `LastUsedAt` for the used session.
- **Impact:** Audit/session timelines are less useful for incident reconstruction.
- **Pedagogical fix:** Set `LastUsedAt` when a refresh token is consumed.

### [GO-MINOR-003] Tests do not cover expired/wrong-audience/wrong-signature JWT variants

- **Category:** Testing
- **Evidence:** tests cover valid token, missing token, and malformed token only.
- **Impact:** RF-009 has several explicit rejection cases that are not pinned.
- **Pedagogical fix:** Add table tests for expired, wrong audience, wrong issuer, and wrong secret.

### [GO-EDU-001] Middleware composition is a good architecture lesson

- **Category:** Idiomaticity
- **Lesson:** `requestID(logging(mux))`, `authenticate`, and `requireAdmin` express Go's standard middleware style clearly. The next lesson is making every middleware failure use the same envelope.

### [GO-EDU-002] Clone-on-store protects tests from accidental mutation

- **Category:** Maintainability
- **Lesson:** Cloning users/sessions at repository boundaries is a useful in-memory substitute for database value boundaries. Keep it, then add atomic mutation methods for security-sensitive transitions.

## Node/TypeScript Findings

### [NODE-MAJOR-001] Refresh rotation is not atomic

- **Category:** Security · Testing
- **Evidence:** `findSessionByRefreshHash` returns a session object; `refresh` mutates status and creates the next session without an atomic repository operation.
- **Impact:** Concurrent refresh requests may both pass the `session.status === 'active'` check before either marks it rotated.
- **Pedagogical fix:** Move rotation into a store method that atomically checks and updates the session, or use a database uniqueness/transaction boundary in a production-shaped adapter.

### [NODE-MAJOR-002] Token verification does not consult session/JTI state

- **Category:** Security
- **Evidence:** `authenticate` trusts `tokenService.verifyAccessToken` result and does not verify the JTI against active session state.
- **Impact:** RF-008 includes token identifier verification; access tokens remain valid until expiry even if refresh session state changes.
- **Pedagogical fix:** Decide explicitly: either document stateless access tokens, or add a JTI/session lookup/cache for revocation-sensitive endpoints.

### [NODE-MAJOR-003] Blocking PBKDF2 work runs on the event loop

- **Category:** Performance · Security
- **Evidence:** `pbkdf2Sync` is used in `PasswordHasher.hash` and `verify`.
- **Impact:** Under login/register bursts, synchronous password hashing blocks all requests in the Node process.
- **Pedagogical fix:** Use async `crypto.pbkdf2`, `argon2` async bindings, or a worker-thread backed hasher; keep a low-cost test config.

### [NODE-MINOR-001] All implementation layers live in one large file

- **Category:** Readability · Maintainability
- **Evidence:** `src/app.ts` contains domain types, store, hasher, token service, audit, services, validators, middleware, and routes.
- **Impact:** The layers are conceptually separated but physically hard to navigate.
- **Pedagogical fix:** Split into `store.ts`, `tokenService.ts`, `passwordHasher.ts`, `services.ts`, `validation.ts`, and `routes.ts` after tests pin behavior.

### [NODE-MINOR-002] Replay audit metadata records the mutated status, not previous status

- **Category:** Auditability · Readability
- **Evidence:** `session.status = 'replayed'` occurs before metadata `{ previous_status: session.status }`.
- **Impact:** Audit entry says previous status was `replayed`, losing the actual state that triggered detection.
- **Pedagogical fix:** Capture `const previousStatus = session.status` before mutation.

### [NODE-MINOR-003] Config source omits password iterations in `main.ts`

- **Category:** Maintainability
- **Evidence:** `main.ts` maps JWT settings from env but not `passwordIterations`.
- **Impact:** RNF-005 configurability is incomplete in the runnable server entry point.
- **Pedagogical fix:** Add `PASSWORD_ITERATIONS` parsing with positive integer validation.

### [NODE-EDU-001] Fastify preHandlers demonstrate middleware ordering well

- **Category:** Idiomaticity
- **Lesson:** `preHandler: [authenticate, requireAdmin]` makes authn-before-authz visible at route declaration. That is a clean framework-specific expression of RF-010.

### [NODE-EDU-002] Runtime validation hand-written today; schema validation is the next step

- **Category:** Testing · Security
- **Lesson:** The validators reject unknown fields and invalid values, which is correct. Moving them to JSON schema/Zod would reduce duplication and give Fastify typed request bodies.

## Cross-Language Comparison

| Concern | Go | Node/TS | Teaching takeaway |
| --- | --- | --- | --- |
| Routing/middleware | `net/http` wrappers | Fastify hooks/preHandlers | Both express auth composition clearly. |
| Password hashing | custom PBKDF-like loop | `crypto.pbkdf2Sync` | Node uses a vetted primitive but blocks; Go needs vetted KDF. |
| Refresh sessions | cloned in-memory store | mutable in-memory objects | Both need atomic rotate semantics. |
| Validation | decoder + manual maps | manual object validators | Both reject unknown fields; schema tooling would help consistency. |
| Audit | in-memory entries | in-memory entries | Good learning coverage; persistence is a later concern. |

### Cross-language findings

- **[CROSS-MAJOR-001] Concurrent refresh safety is not proven in either implementation.** Add a race/concurrency test and an atomic repository method.
- **[CROSS-MAJOR-002] Access-token JTI verification is incomplete.** JWTs include `jti`, but middleware does not verify that identifier against session state.
- **[CROSS-MINOR-001] No local benchmark evidence shows auth middleware p95 < 5 ms.** This is required by RNF-001.
- **[CROSS-EDU-001] The service/repository/token/audit seams are the right architecture lesson.** Preserve those seams while moving persistence and atomicity behind repository interfaces.

## Priority Recommendations

1. Fix refresh rotation atomicity first; it is the most security-significant gap.
2. Replace Go's custom KDF and make Node hashing asynchronous.
3. Add explicit JWT negative tests: expired, wrong audience, wrong issuer, wrong signature, missing required claims.
4. Split files only after the security behavior is pinned by tests.
