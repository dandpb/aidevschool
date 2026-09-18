Leia em português: [TLC-GUIDE.pt-BR.md](TLC-GUIDE.pt-BR.md)

# SDLC Quest v1.2 — TLC Workshop Guide

Independent expansion: 16 challenges across four modules, beyond the original 18. It contains no user notes or progress.

## Getting started
Open the self-contained HTML and choose **Enter the workshop**. The suggested order is Discover → Plan → Implement → Judge; each module can also be studied on its own.

## Preserving v1.1 progress
In v1.1, open Settings and download the JSON backup. In v1.2, use Settings → Restore backup and review the preview before confirming. Opening a file with a different name or path may not reuse the previous storage. Importing replaces the current progress; it does not merge two saves.

## Installing outside the browser
The game runs no commands. In your project's terminal, after checking the origin and the installer options:

```sh
npx @tech-leads-club/agent-skills install --skill tlc-discover tlc-plan tlc-implement the-judge
```

This is the command published on the page consulted on 2026-09-16. The installation was not executed or validated in this delivery.

## tlc-discover

**Input:** An idea, project context and decisions still open.

**Output:** A verdict and a design; or a justified decision not to build.

**Where it fits:** Plan + Design. Associated artifact: `.design/retry-webhook.md`.

**Suggested prompt:**

```text
Use tlc-discover to explore the webhook retry. Read the available context and conventions first. Separate facts from product decisions. The build decision is still open: clarify problem, smaller alternatives and expected success before proposing the architecture. Record gaps without inventing metrics.
```

**What you practice:**

- First, find out where we are. A suggested technology does not define the problem. Investigate the situation, commitments and work in progress; a product decision must not be inferred from silence.
- Not every conversation needs another "yes". While the decision is open, the verdict can end, postpone or shrink the work. A recorded commitment does not need a staged approval. High impact and low clarity call for a bounded investigation.
- Prepare a design another agent can understand. The design preserves concrete decisions, boundaries and the reasoning behind choices. Open questions can stay explicit; "decided" is not a synonym for confident text.
- Publishing is output. Solving is outcome. The product outcome is observed after delivery. It should not be artificially turned into a unit test that "proves" a business impact.

Source: https://agent-skills.techleads.club/skills/tlc-discover/

## tlc-plan

**Input:** A decision: ticket, design, PRD, RFC or conversation.

**Output:** A task with criteria, boundary, decisions and unresolved questions.

**Where it fits:** Design + Build. Associated artifact: `.tasks/retry-webhook.md`.

**Suggested prompt:**

```text
Use tlc-plan on .design/retry-webhook.md. Read the source in full and confront it with the code. Define vertical slices and observable criteria with concrete values. Run the surface walk and record the nine dimensions in Swept, without inventing new requirements. Tell apart open, blocks build and blocks go-live. Generate .tasks/retry-webhook.md.
```

**What you practice:**

- A slice someone can observe. A vertical slice crosses the layers needed to deliver a behavior. Creating structure can be valid preparation, but does not by itself prove the promised capability.
- The nine dimensions cannot become nine assumptions. The sweep finds gaps; it does not authorize creating requirements. Concurrency needs proof of simultaneous calls, not just a sequential duplicate test. n/a requires a reason about the change itself, such as an empty-screen state on a slice with no screen.
- The right number in the right layer. A technical criterion must name behavior and observable values. Percentiles and rates are properties of samples; service targets require an appropriate measurement.
- Task is not a synonym for pull request. tlc-plan starts from one task per source. Slices, tasks and PRs have different roles: observable outcome, unit of work and unit of review.

Source: https://agent-skills.techleads.club/skills/tlc-plan/

## tlc-implement

**Input:** Decided work, criteria and a clear scope.

**Output:** Implementation, checklist and an independent verification report.

**Where it fits:** Build + Verify. Associated artifact: `.checks/retry-webhook.md`.

**Suggested prompt:**

```text
Use tlc-implement on .tasks/retry-webhook.md. Declare the project profile and generate .checks/retry-webhook.md before editing. Tie each check to executable proofs, without weakening tests. When the whole feature is done, the orchestrator must trigger a fresh verifier over the full range. Without that capability, record the independent verification as pending; do not simulate it. Do not push or deploy without explicit authorization.
```

**What you practice:**

- Choose the profile without hiding its limits. light is the documented default; standard adds coverage analysis and test policy; ui adds confrontation with binding visual sources. The profiles are not three names for the same guarantee.
- Break the implementation, not the test. For this bug, the regression must detect the previous version and accept the fix. A mutant that returns null for everything checks whether the positive cases also matter. This is a reduced query proof, not of the full API.
- The verifier is not the last implementer. In the skill, the orchestrator triggers a fresh verifier after all batches, covering the feature base up to HEAD. A disabled handoff does not remove the separation between author and verifier.
- Pass the state, not just the story. The next executor receives checklist and diff, closed limits and new decisions. The handoff happens at a coherent boundary; it must not hide an unfinished slice behind a green suite.

Source: https://agent-skills.techleads.club/skills/tlc-implement/

## the-judge

**Input:** A PR/diff and the repository's real checks.

**Output:** Traceable findings and APPROVE, COMMENT or REQUEST_CHANGES.

**Where it fits:** Verify + the Publish gate. Associated artifact: `findings.json`.

**Suggested prompt:**

```text
Use the-judge to review this PR in English. Run the available checks, read the diff and validate each finding with file:line or consulted official documentation. Consolidate the review and use the verdict matching the severities. In re-reviews, keep IDs, carryover and the convergence contract. Without a PR or authentication, state the blockage; do not say you published a review.
```

**What you practice:**

- Tribunal: what really deserves a finding? Every published finding needs evidence. Tooling already reports deterministic failures; the reviewer concentrates comments on confirmed problems that require judgment. A pre-existing failure goes to the summary; it does not become a defect introduced by the PR.
- Three verdicts, not a perfection grade. A blocker leads to REQUEST_CHANGES. Without a blocker, one should-fix leads to COMMENT. Without either, APPROVE can coexist with nits. A review verdict grants no credentials and performs no merge.
- No new findings does not mean no pendings. Stable IDs and the Resolution table preserve history. Carryover includes previous pendings in the verdict. Looking only at the new-findings list can hide a still-open risk.
- Exit the loop for the right reason. the-judge's contract limits the same finding set to three rounds. Pendings are fixed, converted to follow-up by agreement, or escalated. A real blocker does not disappear through fatigue.

Source: https://agent-skills.techleads.club/skills/the-judge/

## The two labs

**Proofs:** five assertions over three versions of the query. The execution file holds the local results. The .checks examples describe the criteria but attest no execution.

**Review:** a selection of findings and a verdict over a fictional diff. findings.json is explicitly simulated; no official script was run and no review was published.

## Limits that still hold

the-judge does not replace independent verification or authorization infrastructure. APPROVE is not a perfection grade, merge or deploy. The three-round limit demands resolution, agreement or escalation, not forced approval. The original campaign keeps teaching release and maintenance.

## Attribution

Independent educational adaptation of SDLC Quest, with fictional scenarios. Skill content: Tech Leads Club, CC BY 4.0. Consulted on 2026-09-16. Names, paths and contracts preserved where indicated; examples and mechanics were created for this game. This is not an official product and it runs no agents, npx, GitHub or deploys.
https://creativecommons.org/licenses/by/4.0/
