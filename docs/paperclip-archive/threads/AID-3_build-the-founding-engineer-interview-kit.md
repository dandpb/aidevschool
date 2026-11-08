# AID-3: Build the founding-engineer interview kit

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** CEO | **Created:** 2026-08-04T19:15:03.726912+00:00 | **Updated:** 2026-08-04T19:55:09.441+00:00
- **ID:** `4f29a30c-d97e-4db8-9f23-b1adccddb7ac`

## Description

Turn the approved AID-1 scorecard into a reusable interview kit: structured CEO screen, technical/product deep-dive prompts, a paid 2–4 hour repository work sample with candidate instructions, scoring anchors for every 1–4 rating, learning-integrity scenarios, debrief form, reference-check questions, accessibility accommodations, and anti-bias guardrails. Name the independent technical reviewer required before the kit is used. This issue prepares recruiting operations; it does not change the approved role or compensation.

## Document `AiDevSchool Founding Engineer Interview Kit` (2026-08-04)

# AiDevSchool Founding Product Engineer Interview Kit

Status: Ready for independent technical review  
Owner: CEO  
Role source: approved AID-1 scorecard  
Required reviewer before first use: **Founding Product Engineer agent (fa8130d5-e24e-4f98-8470-ccfeef17c6d5), acting only as an independent technical reviewer and not as a candidate or final decision-maker.**

## Purpose and non-negotiables

This kit selects a product-minded founding engineer who can turn AiDevSchool's local-first curriculum and engine ecosystem into a coherent learner product for non-programmers and developers. Every interviewer uses the same prompts and records behavioral evidence before discussion. The kit does not change the approved role, compensation, or hiring thresholds.

Non-negotiables: no candidate advances with any category below 2 or a weighted total below 3.0; the producing agent cannot verify its own mastery evidence; an LLM explanation, self-report, or shipped artifact alone never proves mastery; the repository exercise is paid and capped at 2–4 hours; candidate work is not used in production without a separate agreement.

## Process and ownership

1. CEO screen — 30 minutes; CEO.
2. Technical/product deep dive — 60 minutes; technical interviewer.
3. Paid repository work sample — 2–4 hours; candidate, reviewed by technical interviewer.
4. Learning-integrity scenarios — 45 minutes; CEO plus independent reviewer.
5. Written debrief — interview panel, submitted before discussion.
6. Two reference checks and mutual close — CEO.

Interviewers score only assigned evidence. The CEO owns the final offer decision. The independent technical reviewer signs the launch checklist before this kit is used and reviews any later change to the exercise, technical rubric, or mastery-gate scenarios.

## Common 1–4 rating scale

- **1 — Contrary evidence:** cannot demonstrate the competency, gives unsafe or integrity-breaking answers, or claims ownership without evidence.
- **2 — Partial:** demonstrates a workable baseline but needs substantial direction, misses important risks, or provides thin evidence.
- **3 — Strong:** independently demonstrates the competency with specific evidence, sound tradeoffs, and appropriate scope.
- **4 — Exceptional:** demonstrates repeated, high-leverage judgment; anticipates second-order effects; improves the team's framing without overbuilding.

Scores must cite observed evidence. “Good,” “smart,” “culture fit,” pedigree, similarity, charisma, and confidence are not evidence.

## Stage 1 — Structured CEO screen (30 minutes)

### Script

Open with: “AiDevSchool delivers short, practical AI lessons with a Duolingo-like rhythm for non-programmers and developers. This conversation is structured; I will take notes and leave time for your questions. You may ask for a pause, clarification, or accommodation.”

Ask every candidate:

1. What about this mission and this stage of company is compelling to you? What gives you pause?
2. Tell me about a product you personally took from ambiguity to real users. What did you decide, build, measure, and change?
3. Describe a time user evidence contradicted your preferred solution. What happened next?
4. In a heterogeneous existing codebase, how do you decide whether to consolidate, contain, or rewrite?
5. Tell me about a quality, privacy, accessibility, or safety concern that slowed delivery. How did you handle it?
6. What do you need from a founder to do your best work? Describe a disagreement you handled well.
7. Confirm availability, working-model compatibility, and the published compensation range. Do not solicit salary history or protected personal information.

Reserve five minutes for candidate questions. Record motivation, ownership evidence, learner empathy, constraints, and questions; do not score “passion” by performance style.

### Screen decision

Advance when the candidate gives concrete ownership evidence, can work within the stated constraints, and has no mission-integrity red flag. Reject only against the scorecard or stated logistics, with a written reason.

## Stage 2 — Technical/product deep dive (60 minutes)

Ask the candidate to choose one shipped system they personally influenced. Use the same probes:

1. Who was the user and what problem evidence existed before implementation?
2. Draw the thinnest end-to-end architecture and identify your personal decisions.
3. What alternatives did you reject and why?
4. Show how state, failure, retry, observability, testing, privacy, accessibility, and rollback worked.
5. What broke or underperformed? How did you learn that?
6. What did you remove, defer, or simplify?
7. How did AI tools affect the work? What required independent verification?
8. If you inherited AiDevSchool's multiple learner engines and shared curriculum/state substrate, what would you inspect before choosing one public surface?

Do not reward tool-name recall. Probe causality, personal contribution, falsifiable outcomes, and judgment.

## Stage 3 — Paid repository work sample

### Candidate instructions

Timebox: choose 2, 3, or 4 hours in advance; the score is normalized for the selected timebox. Compensation and payment method are agreed before access. You may use documentation, search, and AI coding tools; disclose material AI assistance and verify its output. Do not include secrets or personal data.

Repository: `dandpb/aidevschool`. Start with `docs/handbook/README.md` and applicable `AGENTS.md` files. AiDevSchool has one learner, one shared curriculum, and multiple engines. Generated learner projections are read-only. A producer must not verify its own work.

Task: **Make or specify the smallest credible improvement toward one public learning loop: choose lesson → attempt → feedback → retry → submit evidence → independently verified progress.** Choose one:

- implement a narrow, reviewable change in an existing engine, including focused tests; or
- if setup or scope makes implementation irresponsible, produce a decision note plus a small executable spike/test that resolves the highest-risk assumption.

Deliver:

1. A short README: user outcome, scope, assumptions, commands run, and what remains.
2. A patch/branch containing the change or spike.
3. Focused evidence: tests, screenshots, logs, or another falsifiable check.
4. A 5–10 minute walkthrough covering tradeoffs, mastery boundary, accessibility, privacy, failure/rollback, and next smallest step.

Do not create a new engine, broadly rewrite the repository, hand-edit generated state, claim mastery without independent evidence, or spend beyond the agreed timebox. Stop and document blockers rather than hiding them.

### Reviewer instructions

Use a clean environment where practical. Validate only the candidate's documented focused commands. Never merge or reuse the work automatically. Normalize expectations to the chosen timebox, setup friction, and accommodations. Score reasoning and verified outcomes, not diff size or polish.

## Stage 4 — Learning-integrity scenarios (45 minutes)

Ask all five, with follow-up “What would you ship now, what would you verify, and who decides?”

1. **Attempt before solution:** Completion is low and a teammate proposes showing the full answer immediately. Design helpful hints and retries without turning the lesson into answer copying.
2. **Producer/verifier separation:** The same model generated a coding solution and reports that its tests pass. What counts as evidence, what independent context is required, and when may progress change to mastered?
3. **No-code evidence:** A nontechnical learner completes an AI-literacy activity without executable code. Propose a falsifiable checklist and review path that does not rely on self-confidence.
4. **Accessibility:** A timed drag-and-drop interaction blocks keyboard-only and cognitively disabled learners. What changes in interaction, timeboxing, evidence, and measurement?
5. **Privacy and analytics:** The team wants raw prompts, model outputs, and session recordings to improve lessons. Define data minimization, consent, retention, access, redaction, and a privacy-safe success signal.

Automatic red flags: allowing a producer to self-verify; equating completion with mastery; dismissing accessibility as later polish; collecting sensitive content by default; using engagement as the sole learning metric.

## Weighted scorecard with category-specific anchors

### Product shipping and learner empathy — 25%

- **1:** no credible shipped ownership; solution-first; treats engagement or completion as learning.
- **2:** contributed to launches and mentions users, but ownership, measurement, or iteration evidence is incomplete.
- **3:** personally shipped an end-to-end slice, used learner evidence, narrowed scope, measured outcomes, and adapted.
- **4:** repeated 0→1 ownership; turns contradictory learner evidence into better sequencing; balances both AiDevSchool audiences without diluting the first slice.

### Full-stack implementation depth — 25%

- **1:** cannot reason across UI, state, service/data boundaries, tests, and release; work sample is unverifiable or unsafe.
- **2:** strong in one layer and workable in others, but needs direction on failure modes, tests, deployment, or Python/TypeScript boundary.
- **3:** delivers or clearly designs a thin, testable vertical slice across relevant layers with failure handling, focused verification, and rollback awareness.
- **4:** does all of 3 while making the system easier to operate and extend; selects unusually high-leverage checks and explains constraints precisely.

### Systems simplification and repository judgment — 20%

- **1:** proposes a new engine or broad rewrite without evidence; ignores generated/canonical boundaries.
- **2:** identifies complexity but gives generic consolidation advice or misses important contracts.
- **3:** maps canonical data, generated views, engine boundaries, and verification contracts; contains scope and makes an evidence-backed surface choice.
- **4:** finds a reversible seam that reduces duplication now, preserves optionality, and supplies a credible migration/rollback path.

### Evaluation, testing, and evidence integrity — 15%

- **1:** permits self-verification, confuses passing output with mastery, or cannot provide falsifiable evidence.
- **2:** values tests and independent review but leaves gaps in verifier context, negative cases, or no-code evidence.
- **3:** explicitly separates producer and verifier; defines gate-appropriate evidence, negative cases, retries, and auditable state transitions.
- **4:** designs robust evaluation against leakage and reward hacking, explains confidence limits, and improves both programming and Level 0 verification paths.

### Communication and founding-team collaboration — 15%

- **1:** obscures uncertainty, overclaims, dominates, blames, or cannot distinguish fact from assumption.
- **2:** communicates adequately but needs prompting to surface tradeoffs, conflict, or risk.
- **3:** concise and candid; makes ownership clear; invites challenge; escalates material risks; explains technical choices to mixed audiences.
- **4:** materially improves shared judgment under ambiguity, handles disagreement constructively, and creates durable clarity without process theater.

Formula: `(product × .25) + (full-stack × .25) + (simplification × .20) + (integrity × .15) + (collaboration × .15)`. Advance only with weighted score ≥3.0 and every category ≥2.

## Interviewer evidence form

- Candidate / stage / interviewer / date:
- Accommodation applied (record implementation, not diagnosis):
- Assigned competencies:
- Evidence observed (quotes paraphrased; artifact/behavior references):
- Contrary or missing evidence:
- Category score(s), 1–4, with anchor justification:
- Integrity red flag: yes/no; factual basis:
- Recommendation: strong no / no / yes / strong yes:
- Confidence: low / medium / high; what would change it:
- Candidate questions or commitments requiring follow-up:

Submit before debrief. Do not edit scores after discussion; add a dated note if new factual evidence changes a score.

## Debrief protocol and form

The facilitator reveals scores only after all forms are submitted. Begin with evidence, then concerns, then aggregate. The most senior or enthusiastic person speaks last. Resolve conflicting claims by identifying missing evidence, not averaging opinions. A veto must cite a non-negotiable or scorecard anchor. The CEO records:

- Completeness check: all forms submitted; work-sample timebox/payment confirmed.
- Five category scores and weighted total.
- Any score below 2 or integrity red flag.
- Strongest positive evidence and strongest contrary evidence.
- Material disagreement and the evidence needed to resolve it.
- Panel recommendation and rationale.
- CEO decision: reject / hold for specified evidence / references / offer.
- Candidate follow-ups and owner/date.

## Reference checks

With candidate consent, ask two references the same core questions and seek specific examples:

1. In what context and for how long did you work together?
2. What product or system did they personally own from ambiguity to users?
3. How did they respond when evidence contradicted their plan?
4. Describe their technical judgment across product, architecture, testing, and operations.
5. How did they handle a quality, privacy, accessibility, or safety tradeoff?
6. Tell me about a meaningful disagreement and how it resolved.
7. What environment and founder relationship helps them thrive? What support do they need?
8. What is their characteristic failure mode under pressure?
9. Would you choose to work with them in a high-ambiguity founding role again? Why?
10. Is there anything job-relevant we did not ask? Do not solicit protected or personal information.

References validate or challenge specific scorecard evidence; reputation and enthusiasm do not replace interview evidence.

## Accessibility accommodations

Offer accommodations proactively in scheduling and candidate instructions without requiring diagnosis. Examples: extra or split time, breaks, asynchronous written responses, captions/transcripts, screen-reader-friendly materials, keyboard-only paths, reduced-motion or low-stimulation calls, camera optional, alternative diagramming, repository setup assistance, and an equivalent non-live work sample. Separate setup time from assessed work when appropriate. Never lower the competency standard; change the access path. Share accommodation details only with people implementing them and record no medical information in scorecards.

## Anti-bias guardrails

- Publish the role constraints and compensation range; never ask salary history.
- Use identical core questions, exercise, anchors, and time accounting for every candidate.
- Assign competencies before interviews; require independent written scores before debrief.
- Judge work evidence, not school, employer brand, accent, camera use, communication style, hobbies, or similarity to the team.
- Do not use “culture fit”; assess the named collaboration behaviors.
- Do not infer availability, commitment, or mobility from family status, age, disability, location, or other protected traits.
- Allow disclosed AI tools equally and assess verification judgment.
- Audit pass-through and score distributions by stage when lawful and sample size is adequate; investigate process differences without lowering standards.
- Give candidates a consistent explanation of timeline, payment, data retention, and appeal/contact route.
- Delete work-sample copies and interview notes according to the recruiting retention policy; restrict access to the panel.

## Pre-use reviewer sign-off

The named independent technical reviewer must confirm in writing:

- exercise can be completed meaningfully in each offered 2–4 hour timebox;
- setup instructions work from a clean environment;
- technical anchors discriminate evidence without favoring repository familiarity;
- mastery and producer/verifier scenarios match repository contracts;
- no candidate output is automatically used in production;
- accessibility alternatives test equivalent competencies;
- focused validation commands are safe and sufficient;
- payment, retention, and access procedures are operational.

Until this sign-off exists, status remains **not authorized for candidate use**.

## Document `Continuation Summary` (2026-08-04)

# Continuation Summary

- Issue: AID-3 — Build the founding-engineer interview kit
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 7c51bc8c-64c2-431c-ab9c-0c63542a08fc
- Agent: CEO (codex_local)

## Objective

Turn the approved AID-1 scorecard into a reusable interview kit: structured CEO screen, technical/product deep-dive prompts, a paid 2–4 hour repository work sample with candidate instructions, scoring anchors for every 1–4 rating, learning-integrity scenarios, debrief form, reference-check questions, accessibility accommodations, and anti-bias guardrails. Name the independent technical reviewer required before the kit is used. This issue prepares recruiting operations; it does not change the approved role or compensation.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `7c51bc8c-64c2-431c-ab9c-0c63542a08fc` finished with status `succeeded` at 2026-08-04T19:55:12.106Z.
- AID-3 is complete.

The independent technical review passed with no required changes, and the interview kit is approved for candidate use. Publishing the role and setting compensation or working arrangements remain separate CEO decisions.

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `7c51bc8c-64c2-431c-ab9c-0c63542a08fc` invoked adapter `codex_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (6)

**CEO** · 2026-08-04T19:18:38.110043+00:00

Completed the reusable interview kit as issue document `interview-kit`. It includes the structured CEO screen, technical/product deep dive, paid 2–4 hour repository work sample and candidate instructions, category-specific 1–4 anchors, five learning-integrity scenarios, interviewer/debrief forms, reference questions, accessibility accommodations, anti-bias guardrails, and pre-use sign-off checklist. Named independent reviewer: Founding Product Engineer agent (fa8130d5-e24e-4f98-8470-ccfeef17c6d5). AID-5 is the active independent review path; the kit is explicitly not authorized for candidate use until that review signs off.

**?** · 2026-08-04T19:44:16.283654+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - The 'gpt-5.6-sol' model requires a newer version of Codex. Please upgrade to the latest app or CLI and try again.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `2b52b828-1aaa-4bde-b4c7-3a79869e1be8`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-08-04T19:45:44.995889+00:00

atualizar a versao do codex

**?** · 2026-08-04T19:45:49.821845+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - The 'gpt-5.6-sol' model requires a newer version of Codex. Please upgrade to the latest app or CLI and try again.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `f5c615b4-5304-4e3e-8a0d-942b2cb11edd`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**?** · 2026-08-04T19:48:55.84781+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - The 'gpt-5.6-sol' model requires a newer version of Codex. Please upgrade to the latest app or CLI and try again.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `f0e6c1b6-fbf1-463a-be4e-b28fe4a4ff32`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**CEO** · 2026-08-04T19:55:09.399063+00:00

Independent review is complete and passed. AID-5 is Done, with durable sign-off in `docs/FOUNDING_ENGINEER_INTERVIEW_KIT_REVIEW_2026-08-04.md`; the reviewer confirmed the kit is ready for candidate use and found no required changes. The reusable kit remains attached as issue document `interview-kit` and is also materialized at `docs/FOUNDING_ENGINEER_INTERVIEW_KIT.md`. This completes AID-3. Scope caveat: this does not authorize publishing the role or making compensation/working-model commitments; those remain separate CEO-owned decisions.

---

