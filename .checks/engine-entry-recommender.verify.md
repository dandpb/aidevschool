# Engine entry verification

**Verdict: PASS — C01–C26 proven within the declared light-profile scope.**

**Profile:** light. **Verifier:** independent sub-agent, no implementation edits.
**Full feature range:** `3bac8da396c280f332ded77abc452f5bd150acf7..b58b5913d3d10f30a32de38ca503fcfb194337b8`.
**Round:** 2, scoped corrections after an initial full-feature review. All proof commands rerun at final HEAD; unchanged source review carried from `a510b855a8f468d58ebee5d1ed0bd60d38ddae7c` (feature implementation `dcee8e7`). Concurrent metric-rubric documentation commits in the range are outside this feature.

## Sources and scope

Read root and engines AGENTS.md, REVIEW.md, `.codex/skills/tlc-implement/references/verify.md`, the complete feature checklist, task, discovery, engine DESIGN.md, and `engines/school-entry/docs/VALIDATION.md`. The brief's root `docs/VALIDATION.md` does not exist; the engine-local document is the intended source and was read. Reviewed feature server, browser, runtime, catalog, authentication, persistence, tests and delivery documentation. No learner files were changed by this verifier.

Light profile does not require the UI-profile exhaustive design/selector join, standard-profile test-policy/coverage join, or fault injection. No Test policy section exists. The implementation-selected raster concept was not independently visually inspected in this pass; the author's screenshot-comparison and Docker/real-Quest observations are not relabelled as independent verifier evidence. Browser obligations below were executed with isolated Playwright as authorized in the brief.

## Commands executed independently

All commands ran from `engines/school-entry`, prefixed with `rtk proxy`, at `b58b5913d3d10f30a32de38ca503fcfb194337b8`.

| Command | Result |
|---|---|
| `npm test` | Exit 0; 23 tests passed, zero failed/skipped/cancelled; 21.30 seconds. Every named backend, health and model proof appeared in TAP. |
| `npm run test:browser` | Exit 0; 7 tests passed, zero failed/skipped/cancelled; 3.18 seconds. |
| `npm run check` | Exit 0; syntax checked 20 JavaScript modules. This is syntax validation, not a type checker. |
| `npm run test:live` | Exit 0; two actual TypeSafe requests, each returning validated recommendations; model `jev-1.13.0`; request durations 896/305 ms; model event durations 840/300 ms; input tokens 1999/2002, output tokens 205/205. |

Live eligibility was deliberately injected for all 13 actual catalog records. These calls used only the authorized synthetic descriptions. The key and private learner data were not printed. The first top result was literacyDojo and the second voxelDojo; this is a two-example smoke, not an accuracy assessment. The second/third positions differed between the first and final live runs, illustrating why no deterministic semantic-quality claim follows.

## Check evidence

Paths in this table are relative to `engines/school-entry/`. Each C-number's named test ran and passed in the command above. `ids` is the catalog ID array declared in the backend test; these assertions establish fixture behavior, not independently maintained inventory identities.

| Check | Settling assertion and location | Result |
|---|---|---|
| C01 — thirteen admin entries | `tests/backend.test.mjs:77–79`: `assert.equal(r.body.engines.length, 13)`, `assert.equal(new Set(r.body.engines.map((e) => e.id)).size, 13)` and every entry disabled. Catalog source was also compared with the task's 13-root inventory. | PASS |
| C02 — durable global state | `tests/backend.test.mjs:90–91`: after closing/reopening SQLite, public `/api/engines` has `engines[0].id === ids[0]` and `engines.length === 1`. State resides in shared server storage, not browser storage. | PASS |
| C03 — auth/origin/CSRF | `tests/backend.test.mjs:95–125`: anonymous PUT status `401`, foreign-origin login `403`, bad-CSRF authenticated PUT `403`. | PASS |
| C04 — concurrent updates | `tests/backend.test.mjs:139`: `assert.deepEqual(r.map((x) => x.status).sort(), [200, 409])`. | PASS |
| C05 — enabled AND healthy | `tests/backend.test.mjs:146–149`: eligible ID array equals `[ids[0]]` when two are enabled and only the first checker result succeeds. | PASS |
| C06 — usable initial control | `tests/health.test.mjs:22–28`: actual Chromium checker returns `true` for visible enabled button; `false` for disabled, hidden and missing control. | PASS |
| C07 — target isolation | `tests/health.test.mjs:38–44`: rejected private targets and foreign origin; `:68–75`: redirected checker `false` and destination `reached === false`; `:81–92`: private rebinding and POST rejected. | PASS |
| C08 — unknown excluded | `tests/backend.test.mjs:154`: undefined checker result produces `engines.length === 0`; C05/C06 separately cover false checks. | PASS |
| C09 — ordered top three | `tests/backend.test.mjs:167–172`: ID order equals `[ids[1], ids[2], ids[0]]`, mode `recommended`, reason strings present. Scores 1/3/2/0 are explicit at `:160`. | PASS |
| C10 — two stay two | `tests/backend.test.mjs:177–180`: recommendation `engines.length === 2` with two enabled fixtures. | PASS |
| C11 — distinct no match | `tests/backend.test.mjs:192–193`: mode `no-match`, count `4`. | PASS |
| C12 — malformed fallback | `tests/backend.test.mjs:201–202`: unknown-only provider score map yields mode `fallback`, count `4`. | PASS |
| C13 — input boundaries | `tests/backend.test.mjs:206–214`: empty/whitespace/2001 characters/number return `400`; lengths 1 and 2000 return `200`. | PASS |
| C14 — provider contract | `tests/model.test.mjs:22–23`: endpoint and Bearer header; `:29–35`: scores `{ one: 3 }`, Noul question, four criteria, rejection of score 4 and missing answer. Full model response validation is present in `server/model.mjs`; this test samples its invalid branches. | PASS |
| C15 — launch revalidation | `tests/backend.test.mjs:221,223,226`: launch status changes `200 → 409` on health failure and is `409` after release revoked. Recovery regression at `tests/browser.spec.mjs:215–224` also proves stale option removal, three remaining cards, change message and no navigation. | PASS |
| C16 — anonymous choice | `tests/browser.spec.mjs:85,93,100`: three cards, page remains on entry origin before click, then destination heading equals `Destino de teste`. | PASS |
| C17 — non-localhost browser origin | `tests/browser.spec.mjs:227–284`: shared `createRuntime` assembly, browser opens `http://entry.test:<port>` via local DNS mapping; `:271–283` asserts same configured origin, recommended mode and configured candidate ID. This closes the original header-only proof gap. | PASS |
| C18 — complete fallback | `tests/backend.test.mjs:243–244`: throwing ranker yields `fallback` and four eligible engines. | PASS |
| C19 — empty without links | `tests/backend.test.mjs:248,251–252`: model must not run, mode `empty`, engine array `[]`; C21 checks zero browser cards. | PASS |
| C20 — storage failure distinct | `tests/backend.test.mjs:257`: closed store public query returns `503`. | PASS |
| C21 — visible modes | `tests/browser.spec.mjs:116–128`: card counts `0` for empty / `4` otherwise; mode-specific text matches `personalizar`, `combina bem`, or `Nenhuma experiência`. | PASS |
| C22 — operator browser flow | `tests/browser.spec.mjs:139,144,147`: 13 rows after login, server store enabled `true` after save, zero admin rows after logout. | PASS |
| C23 — responsive overflow | `tests/browser.spec.mjs:150–159`: widths `[390,1440]`, `document.documentElement.scrollWidth <= innerWidth`, three cards. Covers student result surface, not exhaustive admin/device layouts. | PASS |
| C24 — latest request | `tests/browser.spec.mjs:197–201`: stale `Resultado antigo` count `0`; replacement catalog has `4` cards. | PASS |
| C25 — session and limits | `tests/backend.test.mjs:262–284`: logout `200`, protected access `401` after logout/8h expiry, eleventh recommendation `429`, sixth login `429`. Added `tests/concurrency.test.mjs:71–73` proves delayed bodies cap ranker peak at `8`, with one `429` and eight `200` statuses. | PASS |
| C26 — real integration | `scripts/live-api.mjs:45–47,59`: HTTP `200`, mode `recommended`, 1–3 results and exactly two model events. Actual HTTP provider calls rerun at final HEAD, metadata validated by `server/model.mjs`. | PASS |

## Findings resolved during verification

1. **Global admission race:** the initial implementation checked the eight-request limit before awaiting request bodies and incremented afterward. Independent HTTP reproduction sent nine sets of headers before completing bodies: nine concurrent ranker calls, all `200`. The fix rechecks immediately before reservation without an intervening await. Final independent concurrency regression reports peak eight, eight `200`, one `429`. Resolved.
2. **Revoked launch left stale options:** source Journey requires offering remaining available engines. Initial catch only displayed an error and re-enabled the stale action. The fix refreshes the eligible catalog on `409` and announces the change; browser regression independently passed. Resolved.
3. **C17 proof level:** an HTTP request with a configured Origin header did not demonstrate the actual browser entry on a non-localhost origin. Added shared-runtime Chromium proof does. Resolved.

No remaining material defect identified in the reviewed scope. No fault mutations were applied: light profile, read-only verification. The initial concurrency reproduction exercised unmodified application code and was not mutation testing.

## Evidence boundaries

The backend/browser fixtures inject health and/or model judgments. Their green status never proves the 13 engines are online. C06 proves initial-control usability only; a selector does not prove full learning journeys. Public-origin browser testing maps a test hostname to this machine and uses HTTP; it proves origin compatibility, not real DNS, TLS ingress or deployment. Live TypeSafe calls prove integration and validated responses for two synthetic requests, not calibrated recommendation quality or all student languages. C01 asserts inventory cardinality/uniqueness rather than a separately hardcoded ID set; C08 samples undefined and C14 samples malformed results rather than exhaustively enumerating all invalid inputs. Those are explicit light-profile sampling limits.

No independent Docker rebuild or real SDLC Quest journey was performed by this verifier. These remain separately attributed author evidence in engine VALIDATION.md. Publication, remote push, production credentials, real target rollout, and learner/mastery changes are outside the approved implementation scope. The unrelated dirty learner projections and receipt directory were preserved.
