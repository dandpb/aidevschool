---
type: synthesis
title: "Research: Repo Customer Readiness"
created: 2026-08-21
updated: 2026-08-21
tags:
  - research
  - customer-readiness
status: developing
related:
  - "[[Product vs Production Readiness]]"
  - "[[Student Data Privacy Compliance]]"
sources:
  - "[[Local - Product-Readiness Audit 2026-08-21]]"
  - "[[Selleo - Product Launch Checklist]]"
  - "[[Cortex - Production Readiness Checklist]]"
  - "[[Promise Legal - EdTech Student Data Privacy]]"
  - "[[Macher - LGPD Dados de Menores]]"
---

# Research: Repo Customer Readiness

## Overview

The repo already has a sophisticated internal readiness system
(`docs/product-readiness/`) that measures **customer journeys with evidence** —
but it measures local, facilitator-guided journeys, not product operation.
Audited against external customer-readiness criteria (SaaS launch readiness,
production readiness, edtech privacy law in the US and Brazil), the repo is
missing the entire operational, commercial, and legal layer required for real
paying customers. Additionally, the latest internal assessment's granted tiers
are currently invalidated by the system's own freshness rule.

## Key Findings

### Estado interno (evidência local)

- The internal model defines tiers `customer-ready` / `validated-journey` /
  `experimental` with Playwright evidence and a freshness policy (Source:
  [[Local - Product-Readiness Audit 2026-08-21]]). Confidence: high.
- The v4 assessment (2026-08-20) granted `customer-ready` to 4 of 8 use cases,
  but **6 of 8 are now `stale`** per the repo's own generated matrix — the
  granted tiers are not currently in force. Confidence: high.
- The internal model's own registered gaps include **no visible support
  escalation destination** in the product. Confidence: high.

### O que falta — operacional (production readiness)

- **No observability**: analytics sink defaults to no-op (ADR-0009); no error
  tracking; production errors are invisible (Source: [[Local - Product-
  Readiness Audit 2026-08-21]], [[Cortex - Production Readiness Checklist]]).
  Confidence: high.
- **No incident ownership**: no on-call, no runbooks for customer-facing
  operation, no escalation path. Under Selleo's criteria, this alone is a
  No-Go condition (Source: [[Selleo - Product Launch Checklist]]). Confidence:
  high.
- **Deploy is manual** (Netlify CLI), CI has no deploy job, and only one
  engine (literacyDojo) has a verified public URL. 4 of 5 user-facing engines
  are dev-only. Confidence: high.
- **No user data durability**: progress lives in browser IndexedDB; no sync,
  export, or backup. Clearing site data erases learner progress. Confidence:
  high.

### O que falta — comercial

- **No accounts/auth/multi-user**: learner is hardcoded; the only backend is a
  deliberately unauthenticated read-only spike (ADR-0008, status Proposed).
  Confidence: high.
- **No billing**: zero payment/subscription code or dependencies anywhere.
  Confidence: high.
- **No public support channel** and onboarding assumes a human facilitator.
  Confidence: high.
- **No LICENSE file** at repo root — default all-rights-reserved, blocking
  customer use and distribution. Confidence: high.

### O que falta — legal/regulatório

- **No privacy policy, terms of use, or consent flows** — a single mention of
  LGPD/GDPR in one plan document, nothing published (Source: [[Local -
  Product-Readiness Audit 2026-08-21]]). Confidence: high.
- If targeting Brazilian minors: LGPD art. 14 (parental consent, best
  interest) and ECA Digital (Lei 15.211/2025, in force 2026-03-17, ANPD
  enforcement, age verification) apply (Source: [[Macher - LGPD Dados de
  Menores]]). Confidence: high for LGPD, medium for ECA Digital specifics.
- If targeting US schools: FERPA school-official DPAs, COPPA verifiable
  parental consent (under 13), and SOPIPA-class state laws (no ads/profiling,
  deletion on request) are procurement prerequisites (Source: [[Promise Legal
  - EdTech Student Data Privacy]]). Confidence: high.
- If targeting US public education: ADA Title II digital accessibility (WCAG
  2.1 AA) compliance deadline April 2026 applies to digital learning tools.
  Confidence: medium (search results, not independently fetched).

## Key Entities

- **ANPD**: Brazilian data protection authority; enforces LGPD and ECA Digital.
- **FTC / ICO**: US and UK regulators with recent enforcement against
  children's-data violations (TikTok, Disney).
- **SDPC**: Student Data Privacy Consortium; its National DPA is a de-facto US
  procurement standard.

## Key Concepts

- [[Product vs Production Readiness]]: the repo covers the first axis
  (journeys with evidence) and lacks the second (operate safely).
- [[Student Data Privacy Compliance]]: overlapping regimes impose direct
  vendor obligations; the repo's local-first architecture is a privacy
  advantage but documents and consent flows are absent.

## Contradictions

- The v4 assessment grants `customer-ready` tiers, but the generated matrix
  marks 6/8 use cases `stale` — by the repo's own `policy.yaml:32-41`
  freshness rule, nothing customer-ready is currently in force (Source:
  [[Local - Product-Readiness Audit 2026-08-21]]).
- The assessment rationale mentions "dispositioned medium/low gaps" but no
  medium-severity gap exists in `evidence/results.ndjson`.
- ADR-0009 (analytics) is "Accepted" and instrumented, but the default sink is
  no-op and no endpoint exists — production telemetry is effectively zero.
- The codexDojo OS README documents production mission URLs as
  `*.example.test` placeholders while the readiness inventory lists a "hosted
  mission" use case.

## Open Questions

- **Who is the customer?** B2C self-serve learner, parent, school district, or
  facilitator-led cohort — each implies a different subset of the gaps above.
  This decision gates almost everything else.
- Does "customer ready" mean a public self-serve launch, or a paid pilot with
  a facilitator? The latter needs far less (the repo is close to it).
- ECA Digital applicability: does the target audience include under-18s in
  Brazil? Requires dedicated legal review of Lei 15.211/2025 and Decreto
  12.880/2026.
- Is the local-first, no-account architecture a deliberate product stance
  (privacy differentiator) or a staging step toward accounts/sync (VISION
  marks them "pendentes")?
- Monetization model: undefined — billing gap cannot be sized without it.
- ADA Title II / WCAG scope: which jurisdictions and institution types are in
  scope for the first customers?

## Suggested gap-closure order (derived, not from sources)

1. Decide the customer and jurisdiction (answers the open questions).
2. Add LICENSE, privacy policy, and terms — cheapest blockers, all absent.
3. Revalidate the stale readiness matrix (due 2026-09-20 anyway).
4. Close the registered support-escalation gap (a visible help destination).
5. Add export/backup of local learner data (protects against progress loss).
6. Only then: accounts/sync (ADR-0008), telemetry endpoint, billing.

## Sources

- [[Local - Product-Readiness Audit 2026-08-21]]: internal audit, 2026-08-21
- [[Selleo - Product Launch Checklist]]: Selleo, 2026-08-04
- [[Cortex - Production Readiness Checklist]]: Cortex, 2026-01-14
- [[Promise Legal - EdTech Student Data Privacy]]: Promise Legal, 2026-07-10
- [[Macher - LGPD Dados de Menores]]: Macher Tecnologia, 2026-05-20
- Search-level only (not fetched, medium/low confidence): ECA Digital
  coverage (fadc.org.br, 2026-03-19; direitodesenhado.app, 2026-07-30);
  ADA Title II digital accessibility (ascode.osu.edu, 2025-04-23;
  carnegiehighered.com, 2026-01-07)
