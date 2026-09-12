# AiDevSchool Founding Engineer Hiring Plan

Status: Proposed for founder/board approval  
Owner: CEO  
Mission: Democratize AI knowledge and application through short, practical lessons with a Duolingo-like rhythm for non-programmers and developers.

## Hiring thesis

Hire one product-minded founding engineer who can turn AiDevSchool's strong local-first curriculum and engine ecosystem into a coherent learner product. The first mandate is not to add another experimental engine. It is to establish a public learner route, preserve evidence-based mastery, and make one end-to-end learning loop reliable across the two audiences.

The repository is an ecosystem umbrella rather than one root application. It contains the LiteracyDojo no-code route, the codexDojo dashboard, the codexDojo OS prototype, teaching games, shared curricula, and a Python learner-state substrate. The hire must be comfortable simplifying this surface area while respecting the core rule: an independent verifier—not an LLM explanation or the producing agent—decides whether evidence supports mastery.

## 1. Founding Product Engineer — Learning Platform

### Summary
Own the first public, trustworthy AiDevSchool learner journey from lesson attempt through independently verified progress.

### Expertise & Responsibilities
Build and ship across TypeScript/React/Vite and Python; convert the current local-first engines into a coherent browser-accessible product; integrate curriculum, learner state, feedback, hints/retries, evidence capture, and review scheduling; preserve producer/verifier separation; create pragmatic test, telemetry, deployment, and release workflows; reduce architectural duplication; interview learners and translate findings into small product increments; document decisions and make the codebase easier for subsequent hires and contributors.

### Priorities
1. Ship one narrow public vertical slice: choose a lesson, attempt it, receive feedback, retry, submit evidence, and see verified progress.
2. Preserve the mastery contract: no model or attempt surface may mark mastery without an independent gate.
3. Make the no-code LiteracyDojo journey excellent first while keeping shared contracts usable by the developer track.
4. Establish dependable CI, deployment, observability, privacy, and rollback for the selected production surface.
5. Consolidate or clearly bound overlapping engines rather than expanding the ecosystem by default.
6. Build a fast learner-feedback loop and use evidence to sequence the next lessons and developer-track work.

### Boundaries
Do not independently redefine company mission, mastery policy, or learner safety commitments; do not mark learning outcomes from self-report, model confidence, explanations, or shipped artifacts alone; do not allow the producer to verify its own evidence; do not launch broad rewrites or new engines without an approved product case; do not hand-edit generated learner projections; do not optimize engagement mechanics at the expense of learning integrity; do not make hiring, compensation, legal, or budget commitments.

### Tools & Permissions
Write access to the `dandpb/aidevschool` repository with protected main and reviewed pull requests; local Node 22, pnpm 9+, Python 3.10+, browser/Playwright tooling, and engine-scoped package workflows; deployment preview and production access with least privilege; CI logs, error monitoring, privacy-safe product analytics, and learner-feedback channels; access to approved AI coding tools without production secrets in prompts; permission to propose architecture decisions and implementation tasks, with CEO approval for material scope, vendor spend, or data-policy changes.

### Communication
Write concise, evidence-led updates in plain language; lead with learner impact and verified outcomes; surface assumptions, risks, and tradeoffs early; use small design notes for durable contracts; demo working vertical slices weekly; distinguish clearly between implemented software, emitted evidence, and independently verified mastery.

### Collaboration & Escalation
Reports to the CEO/founder and works closely with curriculum, learning-design, verification, and future growth/support owners. Escalate immediately when a proposed shortcut weakens producer/verifier separation, learner privacy, accessibility, or the attempt-before-solution rule. Escalate product-scope, recurring-cost, security, legal, and production-data decisions to the CEO before commitment. Request an independent reviewer for mastery-gate changes and never self-approve those changes.

## Candidate profile and sourcing

Must-have signals:

- Has personally shipped a web product from ambiguous brief to real users.
- Strong TypeScript/React product engineering plus working Python fluency.
- Can design a thin vertical slice across UI, state, APIs, tests, and deployment.
- Treats evaluation and evidence as software contracts, not prompt-writing details.
- Makes principled simplification decisions in an existing, heterogeneous repository.
- Communicates with learners and can balance speed with educational integrity.

Useful but not mandatory: edtech or developer-tools experience, LLM evaluation systems, accessible interaction design, learning analytics, local-first systems, and early-stage startup experience.

Source through founder networks, relevant open-source communities, targeted outreach to engineers who have shipped edtech/developer tools, and a public role post. Ask every referrer for evidence of a product the candidate personally drove. Run an inclusive funnel: publish the compensation range and work arrangement before outreach, use the same scorecard for every candidate, and provide a paid alternative when the work sample exceeds two hours.

## Selection process and scorecard

1. CEO screen, 30 minutes: motivation, product ownership, communication, constraints, compensation and availability.
2. Technical/product deep dive, 60 minutes: candidate walks through one shipped system, including tradeoffs, failure, instrumentation, and personal contribution.
3. Paid repository work session, two to four hours: inspect AiDevSchool and propose or implement the smallest public learning-loop slice. No speculative production work is used without compensation and agreement.
4. Learning-integrity review, 45 minutes: reason through attempt-before-solution, independent verification, no-code evidence, accessibility, and privacy scenarios.
5. References and mutual close: two references focused on ownership, judgment, pace, and collaboration.

Score each category 1–4 with written evidence before the debrief:

- Product shipping and learner empathy — 25%
- Full-stack implementation depth — 25%
- Systems simplification and repository judgment — 20%
- Evaluation, testing, and evidence integrity — 15%
- Communication and founding-team collaboration — 15%

Advance only when there is no score below 2 and the weighted score is at least 3.0. The CEO owns the final offer decision; the interview panel provides evidence and a recommendation.

## First 30-day outcomes

- Days 1–5: run the primary engines, map the learner loop and generated-data boundaries, reproduce validation commands, and publish a short risk/decision log.
- Days 6–10: recommend the single production surface and define the public vertical slice, success metric, evidence contract, privacy boundary, and release criteria.
- Days 11–20: implement the slice behind a preview deployment with automated checks for attempt, feedback, retry, evidence, and independent verification behavior.
- Days 21–30: test with at least five representative learners across the no-code and developer audiences, resolve launch blockers, document operations, and propose the next four-week roadmap from observed evidence.

Success at day 30 means a founder-reviewable, deployed vertical slice exists; the independent verification boundary is tested; funnel events are privacy-safe and observable; and the team has a prioritized learner-evidence backlog. It does not require broad migration of every engine.

## Proposed roadmap task tree after approval

1. Open and publish the founding-engineer role, including compensation range, location/working model, and application route. Owner: CEO/founder.
2. Build the structured interview kit and repository work-sample rubric from this scorecard. Owner: CEO, with an independent technical reviewer.
3. Define the first public learner vertical slice and choose the production surface. Owner: founding engineer; CEO approves scope.
4. Implement preview deployment and end-to-end learning loop. Owner: founding engineer.
5. Independently review mastery/evidence boundaries and automated tests. Owner: verifier/reviewer separate from implementation.
6. Run five learner sessions and produce a prioritized evidence-backed follow-up backlog. Owner: founding engineer with CEO support.

Implementation tasks 3–6 should not be delegated until the hire is onboarded. Tasks 1–2 should be created only after the founder/board approves this plan and supplies the compensation band and working model, which are intentionally not invented here.

## Approval requested

Approve this hiring thesis, role boundary, selection scorecard, 30-day outcomes, and proposed task tree. After approval, the CEO will create the recruiting and interview-kit child issues. Before publishing the job, the founder must provide the compensation range and location/remote expectations.
