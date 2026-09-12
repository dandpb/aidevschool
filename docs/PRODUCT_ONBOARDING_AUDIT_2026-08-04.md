# AiDevSchool — product onboarding and initiative audit

| Field | Value |
| --- | --- |
| Date | 2026-08-04 |
| Purpose | Understand the product portfolio, test every initiative consistently, and propose what to focus, maintain, incubate, or retire |
| Decision status | Proposal for founder review; this document does not retire an initiative |
| Mission test | Democratize practical AI learning through short, Duolingo-like lessons for nontechnical people and developers |

## Executive assessment

AiDevSchool has a strong, differentiated learning integrity system: one learner, one curriculum,
many engines; short attempts; evidence appropriate to the declared gate; and an independent
verifier rather than model self-assessment. That is the product moat.

The main risk is portfolio sprawl. The repository has enough engines, games, agent systems, and
curriculum scaffolds to look like several products. The learner-facing story is now coherent in
the documentation, but the implementation footprint is much broader than the six missions in the
first release. The next product cycle should optimize for one proven journey, not more surfaces.

**Proposed product thesis:** codexDojo OS is the front door; LiteracyDojo delivers the first
nontechnical lessons; voxelDojo/pixelDojo deliver the first developer simulations; the shared
curriculum, learner substrate, evidence package, and independent gate are the product backbone.
Everything else should justify itself as infrastructure, an experiment with a measurable learning
hypothesis, or an archive candidate.

## Portfolio map and recommendation

| Initiative | Role today | Mission fit | Evidence/readiness | Proposed posture |
| --- | --- | --- | --- | --- |
| `codexdojo-os-prototype` | Canonical mission-first host for both audiences | Direct | Local onboarding, track choice, six first-release missions, local continuity, test/build/smoke scripts | **Focus** as the only primary learner entry |
| `literacyDojo` + `curriculum/ai-literacy` | 3–5 minute no-code lessons for IA na Prática | Direct | Canonical content generation, unit/E2E/build gates, public LiteracyDojo URL documented; producer never writes mastery | **Focus** as the first shippable nontechnical value loop |
| `voxelDojo` | 3D concept simulations for the developer track | Direct, when bound to missions | 15/18 spatial concepts described as pilot-quality; catalog-wide lint/test/typecheck/build/smoke | **Focus narrowly** on the first three bound Dev missions; maintain the rest as a catalog, not launch scope |
| `pixelDojo` / `pixel-quest` | 2D teaching game and evidence-producing encounters | Direct but overlaps voxel | Strong evidence contract and catalog-wide gates; only selected concepts belong in the first journey | **Maintain selectively** where it teaches a concept better than voxel; avoid duplicate coverage as a roadmap goal |
| Shared curriculum + `learner/` + `@aidevschool/evidence` + gate | Canonical content, state, scheduling, evidence, verification | Essential moat | Auditable YAML/Markdown/NDJSON, substrate validation, independent verification | **Invest**; treat as one backbone with explicit service boundaries |
| `minimaxDojo` | 14-agent tutoring core for developers | Indirect/supporting | Reference implementation and contract tests; currently developer-oriented | **Maintain as R&D** until a bounded mentor outcome beats the deterministic/local mentor experience |
| `miniMaxEvolutionEngine` | Five-phase AI-assisted engineering motor | Indirect/internal | Supervised state transitions and verifier-gated advancement | **Maintain internally** as curriculum-production/learning infrastructure; do not market as a learner product |
| `openclaw` | File-based simulate-grade checklist runner | Indirect/internal | Explicitly bounded by ADR-0002; Python tests and CLI | **Maintain minimally** as a reliable test harness; no independent product roadmap |
| `miniTown` | Cozy, explore-only Level 0 surface | Thematic, not yet a lesson player | Has lint/test/typecheck/build/smoke; never writes learner state | **Incubate behind a hypothesis**: prove it improves onboarding completion or comprehension before public expansion |
| `codexDojo` dashboard/desktop | Contributor and engine-inspection surface | Indirect | Runnable dashboard and ecosystem docs; secondary route | **Maintain as internal/contributor tooling**; keep out of primary learner navigation and growth messaging |
| 18-project programming catalog | Long-term developer curriculum | Direct, long horizon | Only projects 01–02 have certified Node evidence; most entries are scaffolded | **Keep the curriculum, stop implying implementation breadth**; build sequentially from observed learner demand |
| Design archives and legacy/experimental game surfaces | Historical exploration | Variable | Not launch-authoritative | **Archive or freeze by default**; revive only with a named hypothesis, owner, and exit criterion |

## Testing intelligence: one scorecard for every initiative

Every initiative should be judged at four gates. A green build is necessary but cannot prove
product value.

### 1. Mission gate

- Names one primary audience and one job-to-be-done.
- Produces a useful learner outcome in a short session.
- Fits the shared micro-lesson lifecycle or explicitly declares why it is explore-only/internal.
- Does not create another source of truth for curriculum, learner state, evidence, or mastery.

### 2. Learning gate

- Captures a learner attempt before evaluation.
- Uses falsifiable evidence appropriate to the unit: executable checks for code; the ADR-0004
  checklist for no-code work.
- Keeps producer and verifier contexts separate.
- Measures transfer or retention, not only completion, XP, or satisfaction.

### 3. Product gate

For each learner-facing initiative, run a five-person moderated pilot per target audience and record:

- onboarding completion;
- time to first useful outcome;
- first-session mission completion;
- independent-verification pass rate;
- day-7 return for a scheduled review;
- observed confusion, abandonment point, and help requested.

Initial decision thresholds should be treated as hypotheses, not truth: at least 4/5 complete
onboarding without operator rescue; median first value under 10 minutes; at least 3/5 return for
or complete a prompted review; no false mastery events.

### 4. Operational gate

Use the smallest owning-surface suite, then the cross-engine contract gate when integration changes:

| Surface | Verification command |
| --- | --- |
| codexDojo OS | `npm run lint && npm run test && npm run build && npm run test:smoke` |
| LiteracyDojo | `npm run gen:content && npm run lint && npm run test && npm run build && npm run test:e2e` |
| miniTown | `pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke` |
| pixelDojo | `pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke` |
| voxelDojo | `pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke` |
| Shared Python surfaces | `make test && make test-core && make test-substrate` |
| OpenClaw only | `python3 -m pytest engines/openclaw/tests/` |
| Learner substrate only | `python3 -m unittest discover -s learner/substrate/tests` |

Store each evaluation as a dated scorecard with: hypothesis, target audience, build receipt,
learning evidence, product observations, decision, owner, and next review date. Do not convert a
green operational gate into a claim of learning effectiveness.

## Proposed decision rules

- **Focus:** part of the first coherent journey and passes mission + operational gates; receives
  product experiments and design attention.
- **Maintain:** required infrastructure or a useful secondary surface with low carrying cost;
  receives fixes and contract updates, not feature expansion.
- **Incubate:** has a falsifiable product hypothesis, named owner, success metric, and review date;
  time-box experiments.
- **Freeze/archive:** duplicates another surface, has no named learning hypothesis, or cannot be
  tested without creating a new product line.

No initiative should be retired solely because it is unfinished, and none should remain active
solely because substantial code already exists.

## Recommended next 30 days

1. **Baseline the canonical journey.** Test root onboarding through one IA na Prática mission and
   one Trilha Dev mission with real learners. Capture the product-gate metrics above.
2. **Publish one portfolio contract.** Mark each engine as learner-facing, supporting, internal,
   incubating, or archived; name its authority and prohibited writes.
3. **Resolve overlap experimentally.** Compare pixel and voxel presentation for one shared Dev
   concept; keep the format with better comprehension/transfer, not the prettier demo.
4. **Gate miniTown.** Run it as an onboarding A/B hypothesis. Promote it only if it improves a
   learner metric without delaying first value.
5. **Protect claims.** Make the public catalog distinguish available missions, pilot simulations,
   certified projects, and scaffolds.

## Founder decisions requested

1. Confirm the proposed primary stack: OS + LiteracyDojo + narrowly bound Dev simulations + shared
   substrate/gate.
2. Confirm that miniTown, minimaxDojo, and broad game catalogs are experiments/supporting systems,
   not separate launch products, until their hypotheses pass.
3. Confirm the default rule that unowned experiments freeze rather than accumulate roadmap work.

On approval, these decisions should be converted into a portfolio-status contract and bounded
follow-up issues. This audit itself does not modify product behavior or claim user validation that
has not been run.
