# Engine entry — approved implementation checklist

Sources: .tasks/engine-entry-recommender.md; .design/engine-entry-recommender.md; user “siga com as recomendaçoes” and “aprovado” delegates closing prior recommendations and technical/visual choices; engines/school-entry/DESIGN.md and docs/entry-concept.png are implementation-selected UI references. API source https://docs.typesafe.ai/api. Existing OS registry, studentCatalog, protocol and shared/fsio informed grounding but are not dependencies.

Profile: light (repository has no override). Handoff: on. Publication, remote push, new accounts, learner state, curriculum, other engines and paid infrastructure are out of scope.

## Landing

New isolated engine; existing engines remain unchanged. No localStorage authority. Decisions recorded before code:

| Door | Literal shape | Alternative rejected |
|---|---|---|
| Runtime | Node >=22.13 ESM HTTP server, SQLite via node:sqlite, static semantic HTML/CSS/JS | Separate SPA build and hosted database add dependencies not needed by two small forms |
| Persistence | engine_release(id TEXT PRIMARY KEY, enabled INTEGER, version INTEGER, updated_at TEXT); all 13 seeded disabled; optimistic version comparison | Browser-only storage cannot be global; flip operations are not idempotent |
| Operator auth | One configured password hash, scrypt with random salt; random opaque HttpOnly SameSite=Strict session cookie; 8h expiry; Secure with HTTPS; origin and per-session CSRF on writes | URL flag is not authorization; no third-party accounts provisioned |
| Health | Playwright isolated context per configured target; navigate and require a configured visible enabled ready control; 10s budget; fresh check on query and launch, no positive cross-query cache; unknown/timeout excluded | HTTP 200 and generic handshake do not prove usable entry |
| Targets | Trusted server-side JSON config, id/url/readySelector; requests accept IDs only; public-mode denies private hosts and disallowed redirects/resources; explicit local-test mode | User-supplied URLs would create SSRF risk |
| Model | POST TypeSafe systemone, jev-1.13.0; per engine Score 0 irrelevant,1 weak,2 partial,3 strong; Noul whether ANY catalog candidate meaningfully meets request; no-match when noul<0.5; ranking stable by score then id; reason composed from verified capability | Model-generated URLs or prose explanations are not this provider's contract |
| Failure | modes recommended/fallback/no-match/empty; fallback/no-match include all eligible engines; TypeSafe budget 5s, no automatic retry; availability store failure 503 | API failure never bypasses availability |
| Browser API | GET /api/engines; POST /api/recommend {description}; POST /api/launch/:id; GET/POST/DELETE /api/session; GET /api/admin/engines; PUT /api/admin/engines/:id {enabled,version} | No public API contract beyond this app |
| Validation/limits | description trimmed 1..2000 chars; JSON body <=16KB; 400 invalid,401 unauthenticated,403 origin/CSRF,409 state conflict/unavailable,429 limiter,503 storage; recommendation 10/min/client, login 5/min/client, bounded global probe concurrency | Unbounded anonymous work could consume browser/provider resources |
| Logs/privacy | event category, duration, model/usage/IDs only; never descriptions/password/cookies/key; no description persistence | Full prompt logs not necessary |

## Checks

### S1 — Administração global

**C01** — admin lists all thirteen engines.
Proof: from engines/school-entry, `node --test --test-name-pattern="C01" tests/backend.test.mjs`.

**C02** — saved availability is global and durable.
Proof: from engines/school-entry, `node --test --test-name-pattern="C02" tests/backend.test.mjs`.

**C03** — anonymous mutations and foreign origin are rejected.
Proof: from engines/school-entry, `node --test --test-name-pattern="C03" tests/backend.test.mjs`.

**C04** — concurrent update returns conflict.
Proof: from engines/school-entry, `node --test --test-name-pattern="C04" tests/backend.test.mjs`.

### S2 — Elegibilidade atual

**C05** — only enabled healthy engines are eligible.
Proof: from engines/school-entry, `node --test --test-name-pattern="C05" tests/backend.test.mjs`.

**C06** — browser checker requires visible enabled ready control.
Proof: from engines/school-entry, `node --test --test-name-pattern="C06" tests/health.test.mjs`.

**C07** — private targets and redirects are rejected in public mode.
Proof: from engines/school-entry, `node --test --test-name-pattern="C07" tests/health.test.mjs`.

**C08** — failed and unknown checks cannot become available.
Proof: from engines/school-entry, `node --test --test-name-pattern="C08" tests/backend.test.mjs`.

### S3 — Recomendação

**C09** — valid judgments return top three in descending order.
Proof: from engines/school-entry, `node --test --test-name-pattern="C09" tests/backend.test.mjs`.

**C10** — two eligible engines return two results.
Proof: from engines/school-entry, `node --test --test-name-pattern="C10" tests/backend.test.mjs`.

**C11** — no match returns available catalog with distinct mode.
Proof: from engines/school-entry, `node --test --test-name-pattern="C11" tests/backend.test.mjs`.

**C12** — malformed provider results trigger full eligible fallback.
Proof: from engines/school-entry, `node --test --test-name-pattern="C12" tests/backend.test.mjs`.

**C13** — description boundaries are enforced.
Proof: from engines/school-entry, `node --test --test-name-pattern="C13" tests/backend.test.mjs`.

**C14** — provider HTTP contract validates complete typed judgments.
Proof: from engines/school-entry, `node --test --test-name-pattern="C14" tests/model.test.mjs`.

### S4 — Escolha do aluno

**C15** — launch rechecks release and health.
Proof: from engines/school-entry, `node --test --test-name-pattern="C15" tests/backend.test.mjs`.

**C16** — student submits without login and chooses destination.
Proof: from engines/school-entry, `node --test --test-name-pattern="C16" tests/browser.spec.mjs`.

**C17** — public origin configuration has no loopback dependency.
Proof: from engines/school-entry, `node --test --test-name-pattern="C17" tests/backend.test.mjs`.

### S5 — Degradação e UI

**C18** — provider failure shows all available engines.
Proof: from engines/school-entry, `node --test --test-name-pattern="C18" tests/backend.test.mjs`.

**C19** — zero available engines returns empty with no links.
Proof: from engines/school-entry, `node --test --test-name-pattern="C19" tests/backend.test.mjs`.

**C20** — storage error is not reported as empty.
Proof: from engines/school-entry, `node --test --test-name-pattern="C20" tests/backend.test.mjs`.

**C21** — browser distinguishes fallback no match and empty.
Proof: from engines/school-entry, `node --test --test-name-pattern="C21" tests/browser.spec.mjs`.

**C22** — operator login toggle and logout work in browser.
Proof: from engines/school-entry, `node --test --test-name-pattern="C22" tests/browser.spec.mjs`.

**C23** — mobile and desktop content does not overflow.
Proof: from engines/school-entry, `node --test --test-name-pattern="C23" tests/browser.spec.mjs`.

**C24** — newest student request owns displayed results.
Proof: from engines/school-entry, `node --test --test-name-pattern="C24" tests/browser.spec.mjs`.

**C25** — session expiry logout and rate limits are enforced.
Proof: from engines/school-entry, `node --test --test-name-pattern="C25" tests/backend.test.mjs`.

**C26** — Real API receives real catalog candidates and returns validated judgments with model, duration and usage; no fabricated response. Proof: `npm run test:live` (requires existing TYPESAFE_API_KEY, synthetic learner descriptions only; not a production accuracy benchmark).

## Swept

- validation: C13,C14.
- failure modes: C08,C12,C18,C19,C20,C21.
- idempotency and retry: C02,C04; fixed-value PUT, no automatic inference retry.
- authorization: C03,C22,C25.
- concurrency and ordering: C04,C24; bounded health work.
- data lifecycle: C02; descriptions not persisted, release state durable, sessions memory-only expire.
- external dependency failure: C06,C08,C12,C18.
- state transitions: C02,C15,C19,C22.
- observability: C26; sanitized diagnostic events.

## Coverage

Light profile; primary sample spaces explicit in tests: thirteen catalog identities C01; enabled/disabled x health success/failure C05,C08; modes C09,C11,C18,C19; validation boundaries C13; session expiry/logout/limit C25; browser desktop/mobile C23. Tests prove initial-control usability, not whole learning journeys. Live inference examples are not calibration evidence for all student language.

## Handoff

One build batch: new backend/public/tests/scripts and existing source documents. Existing source reading ~120KB/4 =~30k tokens, projected new code <=100KB/4 =~25k; total ~55k <150k. Backend ownership delegated, frontend/integration held by root. No handoff mid-slice. Fresh verifier dispatched by root after full feature lands; builder must not spawn a verifier.
