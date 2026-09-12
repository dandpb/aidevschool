# Hot

## [2026-08-21] Docs vs Code Drift

Audited the aidevschool repo for docs that no longer match the real code.
Found ~20 drift items; the most material ones can mislead readers about
product readiness (LiteracyDojo in VISION.md vs stale matrix), implemented
projects (CONSOLIDACAO_2026-08-17.md contradicts itself: 2 vs 18), OS pilot
scope (16 game packages claimed, only 4 bundled), and pixelDojo scope (only
Game 01 claimed, pixel-quest covers 18 projects). A dated snapshot
(ESTADO_REAL_2026-08-17.md) is also cited as current and references a
`.env.production` that does not exist.

Synthesis: [[Research - Docs vs Code Drift]]
Next: edit the high-severity docs to match reality; consider moving the
2026-08-17 dated snapshots to `docs/archive/`.

---

## [2026-08-21] Repo Customer Readiness

Audited the aidevschool repo against external customer-readiness criteria.
Bottom line: strong internal journey-evidence system
(`docs/product-readiness/`), but 6/8 use cases are stale under its own
freshness rule, and the operational/commercial/legal layers are absent —
no auth/accounts, no billing, manual deploys (1 verified public URL), no
privacy policy/terms/LICENSE, no telemetry endpoint, no support channel,
pt-BR hardcoded, learner progress only in browser storage. If minors in
Brazil are the audience, LGPD art. 14 + ECA Digital (in force since
2026-03-17) apply; US schools imply FERPA/COPPA/SOPIPA procurement demands.

Synthesis: [[Research - Repo Customer Readiness]]
First decision needed: who is the customer (self-serve learner, parent,
school, facilitator-led cohort) and in which jurisdiction.
