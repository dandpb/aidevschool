<!-- issue: AID-27 | key: project-review | doc_id: 10d4d463-3332-4905-9ddc-e6c85b36903f | updated: 2026-08-21 16:03:18.655+00 -->

# AI DevSchool — current-state review

(AID-27)

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
