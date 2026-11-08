<!-- issue: AID-27 | key: plan | doc_id: 51a3c596-cec4-471b-847a-22c05d6101a4 | updated: 2026-08-21 18:21:13.52+00 -->

# AI DevSchool — customer-ready team plan

(AID-27)

# AI DevSchool — customer-ready team plan

**Issue:** AID-27  
**Plan horizon:** 30 days  
**Plan owner:** CEO  
**Status:** Proposed for approval  
**Source:** Current-state review, revision 2

## Outcome

Make AI DevSchool ready for real customers through one clear, stable, measurable learning journey—not by expanding the engine catalog.

At the end of this plan, a new customer should be able to open one public URL, understand the product without technical setup, choose the nontechnical or developer path, complete a first lesson or mission, return later to preserved progress, and encounter no known release-blocking defects. The team should be able to prove that journey from a tagged commit through CI and a production smoke test.

## Customer-ready definition

The release is customer-ready only when all of these are true:

1. One canonical public entry URL and one onboarding journey serve both target audiences.
2. The primary nontechnical route offers the 14 canonical AI Literacy micro-lessons; the developer route offers only missions that meet equivalent binding, fallback, evidence, and verification standards.
3. Canonical learner state and every checked-in generated projection are synchronized.
4. Blocking CI covers the primary host, LiteracyDojo, the shared Python core, and all embedded release-path experiences.
5. A production smoke run proves onboarding → track selection → first activity → completion → local resume.
6. Accessibility, mobile layout, empty/error states, and reduced-motion behavior pass the agreed release checklist.
7. The product communicates that browser-local progress does not sync across devices and never equates `completed` with `mastered`.
8. Basic privacy-safe funnel analytics report activation and return behavior without storing lesson answers or sensitive free text.
9. A rollback path, release owner, support/feedback route, and known-limitations page exist.
10. No open severity-1 or severity-2 defects remain; lower-severity exceptions require CEO sign-off in the release record.

## Product decisions proposed

- **Front door:** use the mission-first codexdojo OS host as the canonical entry, with desktop/Engine Hub secondary.
- **Primary nontechnical learning surface:** embed or route cleanly into LiteracyDojo as “IA na Prática.”
- **Developer launch scope:** publish only the verified first chapter; keep the remaining 18-project catalog as continuation, not as a launch promise.
- **State scope:** remain local-first for this release. Do not build accounts or cross-device sync in the 30-day window.
- **Engine policy:** classify each engine as `primary`, `embedded`, `experimental`, or `archived`; only primary/embedded engines block release.
- **Growth policy:** pause new engines and broad feature work until activation and return data exist.

These are proposals for approval, not unilateral decisions.

## Team assignments

### CEO — product owner and release decision

- Approve the canonical front door, launch scope, customer-ready definition, and accepted limitations.
- Keep workstreams aligned to the two-audience mission and prevent scope expansion.
- Maintain the release scorecard and run twice-weekly dependency/risk review.
- Own go/no-go and customer communication.

### Founding Product Engineer — technical delivery lead

- Resolve the nine generated-projection drifts and add a blocking substrate drift check.
- Integrate the approved canonical journey and eliminate broken or ambiguous route handoffs.
- Add release CI for LiteracyDojo and every primary/embedded surface.
- Implement privacy-safe activation/resume analytics and a versioned release record.
- Produce the production deployment, rollback instructions, and technical known-limitations list.

### UX Designer — end-to-end learning journey owner

- Audit the first-run journey for both audiences from landing through first value and return.
- Produce the approved customer journey, page/route map, copy changes, and usability acceptance criteria.
- Test with five representative users if recruitment is available; otherwise run documented heuristic and task-based validation.
- Ensure explanations, path choice, feedback, and local-progress limitations are understandable without developer knowledge.

### System Designer — cross-engine design-system owner

- Inventory primary/embedded UI patterns and define the minimum shared token/component contract.
- Specify consistent navigation, progress, feedback, error, loading, empty, focus, mobile, and reduced-motion states.
- Prevent a redesign: prioritize high-impact convergence needed for the canonical journey.
- Supply adoption criteria that QA can verify across host and embedded surfaces.

### QA Lead — independent release authority

- Build a risk-based customer-readiness test plan from the approved definition.
- Verify projection integrity, CI gates, production smoke, browser/mobile coverage, accessibility, local resume, evidence boundaries, and failure recovery.
- Maintain a severity-ranked defect register with reproducible evidence.
- Issue an independent release recommendation; QA does not implement the features it certifies.

## Work breakdown and sequencing

### Phase 0 — approval and baseline (Day 0–2)

**CEO**

- Approve or amend the six product decisions above.
- Freeze release scope and label engines by release class.
- Create the release scorecard and name the target release candidate.

**QA Lead**

- Capture a reproducible baseline against the reviewed commit.
- Confirm the nine drift findings and record current route/deployment risks.

**Exit:** approved scope, release classes, acceptance criteria, and baseline evidence.

### Phase 1 — integrity and journey design (Day 2–8)

**Founding Product Engineer**

- Regenerate and review all learner projections.
- Add a blocking `python -m learner.substrate --check` CI step.
- Add blocking LiteracyDojo generation/lint/test/build checks.

**UX Designer**

- Map the canonical journey for nontechnical and developer learners.
- Deliver prioritized friction findings and final route/copy acceptance criteria.

**System Designer**

- Deliver the minimum cross-surface design contract and component gap list.

**QA Lead**

- Convert the customer-ready definition into executable and exploratory test cases.

**Exit:** canonical state clean; CI protects the core; journey and UI contract approved.

### Phase 2 — integration and release hardening (Day 8–20)

**Founding Product Engineer**

- Implement the approved host-to-LiteracyDojo and host-to-developer-mission journey.
- Implement analytics events without answer content or personal free text.
- Add customer-visible error/recovery states, known-limitations copy, and release metadata.

**UX Designer + System Designer**

- Review implementation at two checkpoints and resolve high-impact journey or consistency defects.

**QA Lead**

- Run continuous risk-based validation; do not wait until the end of the phase.

**Exit:** feature-complete release candidate deployed to a staging/public-preview URL.

### Phase 3 — customer proof and release (Day 20–30)

**QA Lead**

- Run the full release suite and production-like smoke test.
- Validate accessibility, mobile, reduced motion, local resume, route recovery, analytics, and evidence boundaries.
- Publish independent go/no-go recommendation.

**UX Designer**

- Validate the first-value journey with representative users or a documented fallback review.
- Confirm launch copy and feedback channel.

**Founding Product Engineer**

- Fix release blockers, deploy the approved commit, record the production smoke, and verify rollback.

**CEO**

- Review exceptions and QA recommendation.
- Approve release only when the scorecard meets the customer-ready definition.

**Exit:** one production URL, verified release record, known limitations, support route, and go/no-go decision.

## Proposed delegated issue set after approval

1. **Release scope and engine classification** — CEO — critical.
2. **Canonical state synchronization and drift CI gate** — Founding Product Engineer — critical.
3. **Canonical two-audience customer journey** — UX Designer — high.
4. **Minimum cross-engine release design contract** — System Designer — high.
5. **Customer-readiness QA baseline and release test plan** — QA Lead — critical.
6. **LiteracyDojo and primary-host blocking CI** — Founding Product Engineer — critical; blocked by issue 1.
7. **Canonical host integration and privacy-safe analytics** — Founding Product Engineer — high; blocked by issues 1, 3, and 4.
8. **Release-candidate validation and production smoke** — QA Lead — critical; blocked by issues 2, 5, 6, and 7.
9. **Go/no-go and customer launch record** — CEO — critical; blocked by issue 8.

Issues 2–5 can begin in parallel after scope approval. The integration issue remains intentionally dependent on the product/journey/design decisions so engineering does not encode avoidable ambiguity.

## Release scorecard

| Area | Required evidence | Owner |
| --- | --- | --- |
| Product scope | Approved front door, release classes, launch promises | CEO |
| State integrity | Zero substrate projection drift | Founding Product Engineer |
| Core quality | Blocking Python and primary frontend CI green | Founding Product Engineer |
| First value | Both audiences complete the approved first-value task | UX Designer |
| UI consistency | Minimum design contract adopted on release path | System Designer |
| Accessibility | Keyboard, focus, contrast, reduced motion, mobile checks | QA Lead |
| Persistence | Local progress resumes and limitation copy is correct | QA Lead |
| Evidence integrity | Producer never writes `mastered`; verifier boundary holds | QA Lead |
| Analytics | Activation/resume events work without answer capture | Founding Product Engineer + QA Lead |
| Operations | Versioned deploy, smoke result, rollback, known limitations | Founding Product Engineer |
| Release | Independent QA recommendation and CEO go/no-go | QA Lead + CEO |

## Explicitly out of scope

- Accounts, authentication, multi-tenant learner state, or cross-device synchronization.
- Adding new engines, expanding the 18-project catalog, or redesigning every surface.
- Replacing evidence gates with engagement analytics.
- Claims that all catalog items are production-integrated.
- Large repository or framework migrations unrelated to release risk.

## Risks and controls

- **Scope growth:** CEO owns a frozen scorecard; additions replace work rather than silently extending the deadline.
- **Cross-engine coupling:** release classification limits the blocking surface.
- **False readiness from green unit tests:** independent QA and production smoke remain required.
- **Design work becoming a redesign:** System Designer is constrained to release-path convergence.
- **Local-only progress surprising customers:** limitations appear before commitment and in product help.
- **Analytics weakening learning integrity:** analytics measure behavior only and never decide mastery.
- **Deployment claim drifting from source:** each release record binds URL, commit SHA, timestamp, and smoke result.

## Approval requested

Approve this 30-day plan to create and assign the nine delegated issues above to the existing AiDevSchool team. Rejection or requested changes should identify which product decision, acceptance criterion, owner, or scope boundary needs adjustment.
