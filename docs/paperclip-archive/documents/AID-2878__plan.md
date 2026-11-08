<!-- issue: AID-2878 | key: plan | doc_id: e5aa9e27-390d-46d8-8497-e9edff6fb3a6 | updated: 2026-09-26 11:44:31.351+00 -->

# Team Leads & Revised Hierarchy — AiDevSchool

(AID-2878)

# Team Leads & Revised Hierarchy — AiDevSchool (AID-2878)

**Stance:** business analysis, proactive problem-solving. **Scope:** current pool only (CEO + 22 agents). **Constraints honored:** no team names altered (teams below use the functional names already present in agent titles); all leads drawn from the current employee pool.

## Current state (problem)

The org is flat: **all 22 agents report directly to the CEO** (verified via live agent directory). The CEO absorbs every routing, review, and escalation decision — the cost ledger shows the CEO carrying ~2,600 subscription runs, an order of magnitude above any other agent. Result: the founder-level bottleneck sits on execution details instead of direction, and same-subsystem agents (e.g., the three engine agents, the two learner-app engineers) have no peer coordination layer.

## Recommended leads per team

| # | Team (existing name) | Recommended Lead | Members (report to lead) |
|---|---|---|---|
| 1 | Quality & Process | **QA Lead** | SDLC Scrum Master, Verifier & Evidence Engineer |
| 2 | Learner App | **Founding Product Engineer** | Learner App Engineer, Learner App & Accessibility Engineer, Learner Analytics Engineer, Full-Stack Feature Engineer |
| 3 | Learning Engine | **Learning Engine Engineer** | Engine Systems Engineer, Engine Hardening Engineer |
| 4 | Curriculum | **Curriculum Content Engineer** | Curriculum Platform Engineer, Content Designer |
| 5 | Platform & Delivery | **Platform & CI Engineer** | Platform & Release Engineer, Product Delivery Engineer, Docs & Readiness Engineer |
| 6 | Design & UX | **UX Designer** | System Designer |
| 7 | Growth | **Growth & Recruiter** | Growth Web Engineer |

The CEO keeps direct reports that are cross-cutting staff functions by role definition (SDLC Scrum Master is assigned to Quality & Process above; System Designer remains the architecture counterpart inside Design & UX).

## Revised hierarchy (textual diagram)

```
CEO
├── Quality & Process ............. QA Lead (lead)
│   ├── SDLC Scrum Master
│   └── Verifier & Evidence Engineer
├── Learner App ................... Founding Product Engineer (lead)
│   ├── Learner App Engineer
│   ├── Learner App & Accessibility Engineer
│   ├── Learner Analytics Engineer
│   └── Full-Stack Feature Engineer
├── Learning Engine ............... Learning Engine Engineer (lead)
│   ├── Engine Systems Engineer
│   └── Engine Hardening Engineer
├── Curriculum .................... Curriculum Content Engineer (lead)
│   ├── Curriculum Platform Engineer
│   └── Content Designer
├── Platform & Delivery ........... Platform & CI Engineer (lead)
│   ├── Platform & Release Engineer
│   ├── Product Delivery Engineer
│   └── Docs & Readiness Engineer
├── Design & UX ................... UX Designer (lead)
│   └── System Designer
└── Growth ........................ Growth & Recruiter (lead)
    └── Growth Web Engineer
```

**Span of control:** CEO direct reports drop **22 → 7**; every lead has 1–4 reports; two levels total (no added layering beneath leads).

## Justification per recommendation

1. **QA Lead → Quality & Process.** Already carries the lead title and the heaviest non-CEO workload in the company (381 subscription runs, ~14.8B input tokens — the largest quality-verification throughput on record). QA, verification evidence, and scrum process form one feedback loop; consolidating them under the strongest operator formalizes what already works.
2. **Founding Product Engineer → Learner App.** Highest delivery volume among engineers (239 subscription runs) with breadth across app surfaces. The app-specific engineers (App, Accessibility, Analytics) keep subsystem ownership; the lead owns sequencing and integration.
3. **Learning Engine Engineer → Learning Engine.** Role-title match with the core lesson-engine subsystem and sustained deep context (3.9M input tokens). Peers are specialists — Engine Systems (internals) and Engine Hardening (robustness) — who need exactly this kind of subsystem owner.
4. **Curriculum Content Engineer → Curriculum.** Content is the team's center of gravity and the company mission's core (short, practical lessons). Platform Engineer covers curriculum tooling; Content Designer covers lesson media/format — both naturally downstream of content decisions.
5. **Platform & CI Engineer → Platform & Delivery.** Currently the most active platform agent (2.2M recent output tokens; live run at analysis time). CI, release, delivery, and docs/readiness are one ship pipeline — co-locating them shortens the loop from merge to documented release.
6. **UX Designer → Design & UX.** Senior design practitioner with sustained, broad activity (15.8M input tokens; runs spanning onboarding to research syncs). Pairs with System Designer so UX and system architecture stay aligned inside one design function.
7. **Growth & Recruiter → Growth.** The only CMO-role agent in the pool — growth lead by definition; Growth Web Engineer is the build counterpart.

## Execution checklist

- ☑ Leads identified for all 7 teams (from current pool only)
- ☑ Hierarchy adjustments documented (22→7 CEO reports; textual diagram above)
- ☑ Justifications included (workload/role evidence per lead)
