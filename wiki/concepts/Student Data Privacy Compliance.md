---
type: concept
title: "Student data privacy compliance (FERPA / COPPA / SOPIPA / LGPD / ECA Digital)"
created: 2026-08-21
updated: 2026-08-21
tags:
  - research
  - customer-readiness
  - privacy
  - compliance
status: developing
related:
  - "[[Research - Repo Customer Readiness]]"
sources:
  - "[[Promise Legal - EdTech Student Data Privacy]]"
  - "[[Macher - LGPD Dados de Menores]]"
---

# Student data privacy compliance

Educational products that touch learner data fall under overlapping privacy
regimes that create **direct obligations on the vendor**, not only on schools.

## Regimes by jurisdiction

- **US — FERPA**: vendors become "school officials" when processing education
  records under contract; data use limited to the authorized educational
  function; requires signed data sharing agreements (Source: [[Promise Legal -
  EdTech Student Data Privacy]]). Confidence: high.
- **US — COPPA**: verifiable parental consent before collecting data from
  children under 13; implies age-gating and consent flows in product
  architecture. FTC tightened the rule in 2025. Confidence: high.
- **US — state laws**: SOPIPA (California, model for 20+ states) bans targeted
  ads, profiling, and sale of student data; requires reasonable security and
  deletion on request. ~150 laws across 47 states. Confidence: high.
- **Brazil — LGPD art. 14**: best-interest-of-the-child principle; specific
  parental consent; controller answers for the operator's failures, so buyers
  audit vendors (Source: [[Macher - LGPD Dados de Menores]]). Confidence:
  high.
- **Brazil — ECA Digital (Lei 15.211/2025)**: in force since 2026-03-17 with
  ANPD enforcement; requires reliable age verification and privacy by default
  for digital products likely used by minors. Confidence: medium (search
  results, primary legal review pending).

## Common technical requirements across regimes

- Data flow mapping (fields, subprocessors, regions, downstream uses)
- Data minimization by default
- Encryption in transit/at rest, access controls, audit logging
- Verifiable parental consent and age verification
- Granular data deletion (per student/school) and retention limits
- No targeted advertising or non-educational profiling
- DPA templates and procurement-ready security documentation

## Application to aidevschool

The repo currently has none of these as product capabilities: no privacy
policy, no consent flows, no age verification, no deletion/export, and user
progress persists only in browser storage (Source: [[Local - Product-Readiness
Audit 2026-08-21]]). The local-first architecture is actually a strong
privacy-by-design foundation (no server-side student data = smaller compliance
surface), but the legal documents and consent flows are still required the
moment real users — especially minors — are onboarded.
