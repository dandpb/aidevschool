# AID-27: review the current state of the project

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** CEO | **Created:** 2026-08-21T15:59:23.809348+00:00 | **Updated:** 2026-08-21T20:02:05.105+00:00
- **ID:** `58b43b69-074b-4de4-8896-693f55a746fd`

## Description

[https://github.com/dandpb/aidevschool](https://github.com/dandpb/aidevschool)
review the current state of the project

## Document `AI DevSchool — current-state review` (2026-08-21)

# AI DevSchool — current-state review

**Issue:** AID-27  
**Review date:** 2026-08-21  
**Repository:** `dandpb/aidevschool`  
**Reviewed commit:** `dac4078` (`main`, 2026-08-04)  
**Scope:** product position, architecture, operational readiness, test evidence, and the shortest path to a clearer MVP.

## Executive assessment

AI DevSchool has moved beyond an idea or content prototype. It contains a credible learning architecture, a complete 14-lesson AI-literacy curriculum, several runnable learner experiences, an independently verifiable evidence model, and a substantial automated Python core. The strongest product proof is the nontechnical track: LiteracyDojo is described as publicly deployed, and its content/player boundary is unusually disciplined.

The project is not yet one coherent school product. It is an ecosystem of multiple apps and engines with overlapping entry points, separate package-management surfaces, local/browser state that is not a canonical multi-learner service, and documentation that mixes current truth with dated audit snapshots. The immediate company problem is focus and operational coherence, not lack of features.

**Overall state: strong technical/product prototype; early MVP with one public vertical slice; not yet a unified scalable platform.**

## What is working

### 1. Mission and implementation are now aligned

The current vision explicitly serves both audiences from onboarding:

- nontechnical learners use the 14-lesson “IA na Prática” / AI Literacy track;
- developers enter a mission-first chapter and can continue into 18 coding projects;
- both share the short loop of objective → attempt → feedback → retry → evidence → review.

This directly supports AI DevSchool’s mission of democratizing practical AI learning with a Duolingo-like rhythm.

### 2. The learning integrity model is a real differentiator

The repository consistently distinguishes attempt surfaces from verification, `completed` from `mastered`, producer evidence from independent verifier receipts, and canonical learner state from generated read models.

That is stronger than ordinary gamified courseware. It gives the company a defensible promise: progress is evidence-backed rather than model-declared.

### 3. The nontechnical vertical slice is substantial

The canonical AI Literacy curriculum reports 14/14 lessons ready across four modules, a 3–5 minute lesson format, typed compilation into LiteracyDojo, deterministic feedback and local progress, and independent evidence verification outside the app.

The vision document also records a live LiteracyDojo URL, while honestly limiting that claim to the microlearning player rather than the entire ecosystem.

### 4. The shared Python core is healthy

Current verification on the reviewed commit:

```text
python3 -m pytest -q
487 passed, 1 skipped in 4.58s
```

This covers the tutor core, learner substrate/gate, OpenClaw, installer contracts, shared curriculum utilities, and AI-literacy content contracts configured in `pyproject.toml`.

### 5. Architecture and repository guidance are unusually explicit

The “one learner, one curriculum, many engines” boundary is documented well. Engine-local build surfaces, shared canonical state, generated projections, evidence boundaries, and product-vs-prototype distinctions are generally discoverable.

## Material risks and gaps

### P0 — generated learner projections are out of sync

`python3 -m learner.substrate --check` fails on the reviewed commit and reports drift in nine generated artifacts:

- `engines/codexDojo/src/data/learner.ts`
- `.mavis/learning_state.yaml`
- `engines/minimaxDojo/whiteboard/profile.yaml`
- `engines/minimaxDojo/whiteboard/learner_profile.md`
- `engines/minimaxDojo/whiteboard/trail.md`
- `engines/codexdojo-os-prototype/src/data/learner.ts`
- `engines/pixelDojo/pixel-quest/src/content/reviewSlice.ts`
- `engines/voxelDojo/shared/content.ts`
- `engines/dojoToday/src/data/today.ts`

This is the clearest current correctness issue. The source-of-truth design is good, but checked-in consumers do not currently match it. A clean test suite does not neutralize stale projections.

**Proposed action:** regenerate the projections, inspect the diff, commit only expected generated changes, add `python -m learner.substrate --check` as an explicit blocking CI step, and document which workflows are allowed to mutate canonical learner state.

### P1 — the product has too many “front doors”

Current learner-facing surfaces include LiteracyDojo, codexDojo, codexdojo OS, miniTown, dojoToday, PixelDojo, and VoxelDojo. Their roles are documented, but a new learner or stakeholder still has to understand an ecosystem before understanding the product.

**Proposed action:** declare one primary URL and one primary onboarding journey. Treat the remaining engines as embedded experiences, labs, or internal/prototype surfaces. The vision already points toward the mission-first OS host; the decision should be made explicit in release docs and the root README.

### P1 — CI does not cover the current product surface

The checked-in CI covers codexDojo, PixelDojo, VoxelDojo, codexdojo OS, and Python. It does not visibly run release gates for LiteracyDojo, miniTown, or dojoToday, despite LiteracyDojo being the strongest public MVP claim.

**Proposed action:** make LiteracyDojo’s content generation, lint, unit test, build, and an appropriately scoped E2E check blocking. Add miniTown/dojoToday checks according to whether they are release surfaces or prototypes.

### P1 — public release evidence is documented, not continuously proved here

The vision names a production LiteracyDojo URL and a historical HTTP check. This review did not re-verify the deployment, and the repository CI shown does not deploy or probe it.

**Proposed action:** maintain a small release record with commit SHA, deployment URL, timestamp, and smoke result, produced automatically by the deployment workflow.

### P2 — canonical multi-learner progress remains unresolved

Browser progress is local and the canonical filesystem state is still effectively a pilot-instance model. That is acceptable for a prototype, but it blocks accounts, cross-device continuity, cohorts, instructor views, and reliable product analytics.

**Proposed action:** defer a full backend until retention is proven, but define the migration seam now: learner identity, event/evidence envelope, idempotency, verifier receipt, and canonical progress projection.

### P2 — old audits look current after their findings have changed

The July audits contain useful evidence but also prominent claims that are now obsolete, including missing miniTown documentation and missing no-code support. Readers can easily mistake them for present truth.

**Proposed action:** add a visible historical/superseded banner to dated audits and maintain one short current-state page linked from the root README.

### P2 — repository breadth raises delivery cost

There are roughly 1,952 tracked files and several independent JS projects plus Python, Go, and Rust surfaces. This enables experimentation, but increases dependency, CI, documentation, and release overhead.

**Proposed action:** classify every engine as `primary`, `embedded`, `experimental`, or `archived`; require primary/embedded surfaces to have owners and release checks; stop expanding experimental engines until the primary journey is measurable.

## Recommended 30-day direction

This is a proposal, not a decision.

1. **Restore state integrity:** resolve the nine projection drifts and make the drift check blocking.
2. **Choose the front door:** publish one canonical onboarding URL and journey for both audiences.
3. **Protect the actual MVP:** add blocking LiteracyDojo CI and automated production smoke evidence.
4. **Instrument the loop:** measure onboarding start, first lesson start, first lesson completion, retry/hint use, next-session return, and track choice without equating analytics with mastery.
5. **Reduce narrative drift:** publish one current-state/release page; label older audits historical.
6. **Set a backend trigger:** only commit to accounts/sync after a defined signal (for example, repeat usage or cohort demand), while preserving evidence-envelope compatibility.

## CEO-level conclusion

The project’s strongest asset is not the number of engines; it is the combination of short practical lessons and a rigorous evidence boundary. The next stage should concentrate that advantage into one understandable, continuously verified learner journey.

I would not recommend another broad feature wave yet. First make the canonical projections clean, make the nontechnical MVP release path blocking in CI, and make one front door unmistakable. After that, usage data can determine whether to deepen the developer track, add accounts/sync, or expand the voxel/game catalog.

## Verification limits

- The checkout had no JS dependencies installed and no `pnpm` executable, so frontend suites were not re-run locally in this review.
- The public deployment was not re-probed.
- Current frontend conclusions are based on repository structure, package scripts, checked-in CI, operational READMEs, and existing evidence claims.
- No source files were modified.

## Document `Continuation Summary` (2026-08-21)

# Continuation Summary

- Issue: AID-27 — review the current state of the project
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: c381617b-19c6-4458-ad45-6d70d347749a
- Agent: CEO (codex_local)

## Objective

[https://github.com/dandpb/aidevschool](https://github.com/dandpb/aidevschool)
review the current state of the project

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `c381617b-19c6-4458-ad45-6d70d347749a` finished with status `succeeded` at 2026-08-21T20:02:08.879Z.
- AID-27 is complete.

The approved 30-day plan was converted into nine assigned child issues, AID-28 through AID-36, covering scope, engineering, UX, design systems, QA, release validation, and final go/no-go. Assigned owners are already being activated, and the full handoff was recorded on AID-27.

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `c381617b-19c6-4458-ad45-6d70d347749a` invoked adapter `codex_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Document `AI DevSchool — customer-ready team plan` (2026-08-21)

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

## Interaction [request_confirmation] Approve the customer-ready team plan (accepted)

Approve the 30-day plan before I create and assign nine implementation issues across the full AiDevSchool team.

## Comments (4)

**CEO** · 2026-08-21T16:03:41.326678+00:00

AID-27 is complete and marked `done`. The full review is attached to the task under document key `project-review`.

Key conclusion: AI DevSchool is a strong prototype with a credible 14-lesson MVP, but needs consolidation before further expansion.

Evidence:

- Python: 487 passed, 1 skipped.
- P0 issue: nine generated learner projections are out of sync.
- CI omits LiteracyDojo, miniTown, and dojoToday.
- Multiple learner-facing entry points weaken product clarity.

Recommended next move: fix projection drift, enforce it in CI, select one primary product entrance, and protect LiteracyDojo with blocking release checks.

**founder** · 2026-08-21T18:19:48.569307+00:00

delegate a plan whole team to the project be customer ready .

**CEO** · 2026-08-21T18:21:50.45566+00:00

Prepared a 30-day customer-ready plan for the full existing team. Pending approval interaction 72aab157-c6d0-4281-8b8f-e84d978b63e5 targets plan revision 1; implementation issues will be created and assigned after acceptance.

**CEO** · 2026-08-21T20:02:05.047436+00:00

Approval accepted and the approved 30-day plan has been converted into assigned child work:

- AID-28 — Release scope and engine classification — CEO
- AID-29 — Canonical state synchronization and drift CI gate — Founding Product Engineer
- AID-30 — Canonical two-audience customer journey — UX Designer
- AID-31 — Minimum cross-engine release design contract — System Designer
- AID-32 — Customer-readiness QA baseline and release test plan — QA Lead
- AID-33 — LiteracyDojo and primary-host blocking CI — Founding Product Engineer; follows AID-28
- AID-34 — Canonical host integration and privacy-safe analytics — Founding Product Engineer; follows AID-28/AID-30/AID-31
- AID-35 — Release-candidate validation and production smoke — QA Lead; follows AID-29/AID-32/AID-33/AID-34
- AID-36 — Go/no-go and customer launch record — CEO; follows AID-35

The board has begun waking assigned owners. AID-27's review and planning objective is complete; delivery continues through these children.

---

