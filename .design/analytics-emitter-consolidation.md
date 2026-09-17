# Analytics emitter consolidation — one funnel core, single-sourced vocabularies

> Plan this with **tlc-plan** (`.claude/skills/tlc-plan`).
> Decisions below carry the literal shape - copy them, do not re-derive them.

## Situation

- Project: in active construction, with live pilots (Netlify: literacyDojo, dojoToday, voxel game-02).
- Decision: open until this session — **build**, confirmed by Daniel, 2026-09-13.
- In flight: the AID-987/T1b surfaces wave is live work on exactly this seam (`engines/shared/teaching-evidence/funnelTelemetry.ts` modified 22h before this document, `evidenceTransport.ts` 4h before; collector 2026-09-12). Open tracker issue #375 (catalog divergences) is unrelated.
- At stake: wrong move breaks anonymous pilot telemetry on three deployed surfaces (LGPD-sensitive pilot); doing nothing re-prices a five-site edit on every upcoming analytics wave. Not an afternoon revert — four components plus a deployed collector.

## Problem

Internal pain, no end user. Whoever ships an analytics wave (Daniel plus the agent personas) pays a five-site edit per funnel event today: engine vocabulary + validator → collector hand-copied validator → drift-monitor vocabulary copy → parity tests → emitter plumbing. Three envelope versions are live (v1 OS, v2 literacy, v3 surfaces); three batcher/transport stacks (667 + 712 + 425 production LOC) are hardened separately. More waves are confirmed planned. If nothing changes, every wave re-pays the tax and drift stays held only by parity tests rather than made structurally impossible.

## Evidence

- Change frequency per mirror site, 2026-06-15 → 2026-09-13 (git log, measured this session): literacyDojo stack 16 commits (last 09-10), OS stack 9 (last 09-10), shared teaching-evidence 14 (last 09-13), collector + analytics tooling 11 (last 09-12). 50 commits across the four sites, 5+ distinct author identities — hot on all sites simultaneously; an area still moving months in, not stable, not abandoned.
- Envelope deltas are functional, not accidental (scout-verified, line-cited): v2 carries `contentVersion`; v1 carries `sequence` + nested `dimensions` for ack reconciliation and a persisted `installationId`; v3 is v2's shape minus `contentVersion`, multi-source.
- Cost per wave in engineer-hours: untracked — the instrumentation does not exist. Proxy used instead: sites touched per event (5 today). Making the real number measurable is not in scope.
- Event volume at the collector: deliberately not fetched — it cannot change this decision; mechanism-change frequency can, and it is high.

## Journey

Operational sequence confirmed — "ship one funnel event", states and what should happen in each:

- **Happy path** (new event, existing vocabulary): today 5 sites; target 2 — one vocabulary entry, one engine call site.
- **New property needed** (field-need): vocabulary source gains the optional prop; derived validators follow; no new envelope.
- **New delivery semantics needed** (envelope-fork — e.g. a producer wanting acks): today mints a new envelope version; target: a strategy plugin on the shared core; a new wire envelope only as last resort.
- **Drift** (emitter vs collector disagree): today caught by parity tests; target: structurally impossible via single source, with one smoke parity test per producer kept as tripwire.
- **Collector rejects** (bad vocabulary, oversize): unchanged collector behavior; per-engine fire-and-forget/retry policies unchanged.
- **Transition/back-compat**: literacyDojo keeps sending v2 until its deploy lands; the collector already accepts v1/v2/v3, so there is no reject window. OS wire traffic is untouched.
- **Half-finished migration** (abandoned): parity tests retire per producer only after that producer's migration ships — the guard persists through the gap.

## Verdict

**build** — cost of doing nothing is a recurring five-site tax on confirmed upcoming waves against a one-time consolidation; confirmed by Daniel, 2026-09-13.

Cheaper paths considered:
- Do nothing + parity guards — the repo's established convention (AST-locked gate mirrors, host-protocol parity tests), discarded because guards hold the mirrors but not the three separately-hardened emitter stacks, and the waves keep coming.
- Vocabulary single-sourcing only — discarded as sole move: it fixes the half the parity tests already hold and leaves the 1,800 LOC emitter stacks, the half nothing holds.
- Cap by rule ("no new envelope versions") — discarded: reduces future drift but cuts neither the five-site tax nor the existing triple mechanism.
- Buying — nothing exists to buy for internal telemetry plumbing.

## Success

- Worked if: the next analytics wave lands a new event by touching ~2 sites (one vocabulary entry, one call site) instead of 5 — visible at the next AID wave.
- Early signal: the in-flight surfaces wave's remaining edits, within days — if post-migration they still hand-edit the collector validator, or a parity test catches drift the single source claimed to make impossible, the bet is going wrong.
- Review: trigger = the next analytics wave; whoever ships it counts the sites; Daniel looks.

## Boundary

In: emitter plumbing (validation, batching, transport, identity) in `engines/shared/teaching-evidence`; vocabulary single-sourcing and its bindings in the collector's validator tables and the drift monitor.
Out: collector storage, retention, and export API (deployed function internals beyond validator derivation); drift-tooling redesign beyond the vocabulary binding; `engines/zai-duolingo-like`; the four declined ride-alongs (shared utils export, PALETTE fix, type pinning, hygiene swaps — declined this session, 2026-09-13; recommendations on record in the consolidation report).

## Prior art

- Not checked externally — the mechanism (config-driven telemetry client) is a shape everyone in the room can picture, and little rides on being wrong about it. Internal precedent is the prior art: the repo's parity-mirror convention (gate mirrors, host protocol, collector validators) is both what this replaces and the evidence it was load-bearing — the core must be at least as guarded as the mirrors it retires.
- Convergence evidence internal: the v3 envelope was designed most recently by folding v2's learnings — the repo was already consolidating; this finishes the move.

## Shape

One configurable funnel core behind the existing shared seam, vocabularies as the single authority, wire contracts frozen. Cheap to change later: every migration is per-producer behind an unchanged wire contract, so a botched migration is a per-engine revert, not a cross-engine event.

### Adds

- `engines/shared/teaching-evidence/funnelCore.ts` — `createFunnelClient(config)` with `FunnelClientConfig` = { vocabulary, envelope extras, identity strategy, batch policy, durability strategy }.
- Package export subpath `./funnel-core` in `engines/shared/teaching-evidence/package.json`.
- `engines/shared/teaching-evidence/vocabularies/literacy.json`, `surfaces.json`, `os.json` — one authority per producer vocabulary, JSON so both the TS package and the plain-`.mjs` tooling consume it without a build step.
- One smoke parity test per producer in `engines/shared/teaching-evidence/tests/`.

### Changes

- `engines/shared/teaching-evidence/funnelTelemetry.ts` → refactored onto `funnelCore.ts`; public API `emitFunnelEvent` preserved for dojoToday / pixelDojo / voxelDojo callers.
- `engines/literacyDojo/src/domain/analytics.ts` → vocabulary moves to `vocabularies/literacy.json`; validation/builders delegate to the core; `src/adapters/analyticsBatchSink.ts` and `analyticsIdentity.ts` collapse into core config (ephemeral identity, 15s interval, `contentVersion` envelope extra). Wire envelope stays v2.
- `engines/codexdojo-os-prototype/src/analytics/events.ts` → vocabulary moves to `vocabularies/os.json`; `collector.ts` / `batcher.ts` / `transports.ts` keep `installationId`, localStorage queue, retries, and ack reconciliation as strategies over core validation/transport. Wire envelope stays v1.
- `learner/gate/netlify-functions/dojo-analytics-collector.mjs` → the three hand-copied per-envelope validators become table-driven from the same vocabulary JSONs (binding mechanism per the spike below).
- `learner/gate/analytics/schema_drift_monitor.mjs` → third literacy vocabulary copy (lines 58–75) replaced by the same JSON source.
- Parity tests (`collectorParity.test.ts`, `eventsExposure.test.ts`, `learner/gate/tests/dojo_analytics_collector_v2.test.mjs`, `..._v3.test.mjs`, `..._v4.test.mjs`, `..._funnel_surfaces_v3.test.mjs`) → retired per producer as its migration ships. The collector's exported validator names (`validateAnalyticsEvent`, `validateLiteracyEvent`, `validateSurfaceEvent`, `EVENT_VOCABULARIES`, …) stay stable: `aggregate_funnel.mjs`, `schema_drift_monitor.mjs`, and `probe_collector_export.mjs` import them.
- `engines/codexDojo/ecosystem/MANIFEST.md` → updated in the same change (repo rule).

### Leaves

- Wire envelopes v1/v2/v3 — no v4 minted.
- Collector route, storage, retention, export API; OS anonymity model (persisted `installationId`) and durable queue; literacy `contentVersion`; surfaces evidence piggyback (`evidenceTransport.ts` dualEmit); Netlify deploy configs; `engines/zai-duolingo-like`; the four declined ride-alongs named in Boundary.

The heavier alternative — unify the wire contract on an envelope v4 (flat + source + optional `contentVersion` + optional `sequence`), OS emits v4, v1/v2 validators retired after a back-compat window — only wins if a fourth producer engine lands or OS telemetry becomes the canonical product loop. Neither is true today; revisit at the next producer onboarding. What the chosen shape will not survive: if 4+ producers keep arriving with distinct envelope needs, the per-envelope validator table grows without bound and v4 unification arrives anyway — as a rewrite of the core's config layer.

Also in the field, for perspective and not as candidates: a standalone analytics micro-package under `engines/shared/` — removed by precedence, the seam already exists in `@aidevschool/evidence`; codegen pipeline rendering validators from a TS source — removed by the plain-`.mjs` consumer requirement, JSON import makes it unnecessary.

## Roadmap

| Block | Delivers | Clarity |
|---|---|---|
| Vocabulary single-sourcing | `vocabularies/*.json` as the one authority; collector validator tables and drift monitor bound to them; third literacy copy gone | clear |
| Funnel core | `funnelCore.ts` + `./funnel-core` export; `funnelTelemetry.ts` refactored on it (surfaces producer migrated) | clear |
| literacyDojo migration | v2 semantics preserved via core config; adapters collapse; parity test retired | clear |
| OS adoption | OS stack on core validation/transport with durability/ack/installationId as strategies; wire untouched | open |

Sequencing: blocks land after the in-flight AID-987/T1b surfaces wave completes — its files were modified the day this document was written.

## Decisions

| Decision | Choice | Why this | Alternative, and what would make it win | Reversibility |
|---|---|---|---|---|
| Wire contracts | Keep v1/v2/v3; no new envelope version | Envelope deltas are functional (`contentVersion`, `sequence`+`dimensions`); boundary keeps the deployed collector stable | Unify on v4 — wins when a fourth producer lands or OS telemetry becomes the canonical loop | costly |
| Vocabulary source of truth | `engines/shared/teaching-evidence/vocabularies/{literacy,surfaces,os}.json` | One authority readable by both the TS package and plain-`.mjs` tooling with no build step | TS source + codegen — loses `.mjs` consumability | reversible |
| Core seam | `funnelCore.ts` + exports subpath `./funnel-core` in `@aidevschool/evidence` | Extends the established shared-package seam; three engines already consume it | New `engines/shared/analytics` package — second seam beside an existing one; removed by precedence | reversible |
| literacyDojo wire shape | Stays v2 (`contentVersion` as core envelope extra) | Pilot continuity; v2 ≡ v3 shape means the core is shared regardless | Migrate literacy to v3 wire — churn with no collector gain | reversible |
| OS durability and anonymity | Kept as strategies: persisted `installationId`, localStorage queue, retry+ack | Semantics are deliberate and documented; the core unifies mechanism, not policy | Force ephemeral identity repo-wide — removes a documented pilot capability | reversible |
| Parity test retirement | Per producer, only after that producer's migration ships | Guards hold through each migration gap | Delete upfront — uncovered gap mid-migration | reversible |
| Start timing | After the in-flight AID-987/T1b wave lands | The wave's files were modified 22h/4h before this document; starting now rebases active work | Start immediately — accept the rebase/conflict cost | reversible |

## Needs a spike

1. Does the Netlify Functions bundler resolve a JSON import from outside `learner/gate/netlify-functions/` (i.e. `../../../engines/shared/teaching-evidence/vocabularies/*.json`)? — If yes, the collector imports the vocabularies directly; if no, the collector binds via a generated copy refreshed by test. — Stops after one function deploy probe. Grounding constraints: the deploy CLI already 422-rejects non-function files in the functions dir (`dojo-analytics-collector.d.mts` was moved out for exactly this, AID-961), and the OS path deploys a staged *copy* (`deploy-pilot-bundle.mjs` copies only named files, so relative imports outside the staged dir do not travel) — both weigh against direct import and for the test-refreshed binding.

## Open

1. Collector binding mechanism before the spike answers — default: parity-test binding JSON ↔ collector validator tables.
2. Vocabulary JSON schema shape — default: mirrors the current `EVENT_PROPS`/`OPTIONAL_PROPS` tables verbatim.
3. Home of the per-producer smoke tests — default: existing `engines/shared/teaching-evidence/tests/`.

## Sources

- git log measurement (this session): commits-per-site since 2026-06-15 for the four mirror areas; last-touch dates 2026-09-10 → 2026-09-13.
- AnalyticsTrio scout report (`agent://AnalyticsTrio`) — stack LOC, envelope shapes, overlap matrix, parity-test inventory, collector/monitor mirror locations.
- `engines/codexDojo/ecosystem/MANIFEST.md` lines 148–149 — the two funnel-analytics seams this consolidates.
- `learner/gate/netlify-functions/dojo-analytics-collector.mjs` header — single collector for all three envelopes at `/__dojo/bridge/v1/analytics`.
- Consolidation report (this session, component-common-domain-detection run) — triage of the six critical issues; the four declined ride-alongs recorded with recommendations.
