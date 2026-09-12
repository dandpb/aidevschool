---
type: concept
title: "Product readiness vs production readiness"
created: 2026-08-21
updated: 2026-08-21
tags:
  - research
  - customer-readiness
status: stable
related:
  - "[[Research - Repo Customer Readiness]]"
sources:
  - "[[Cortex - Production Readiness Checklist]]"
  - "[[Selleo - Product Launch Checklist]]"
  - "[[Local - Product-Readiness Audit 2026-08-21]]"
---

# Product readiness vs production readiness

Two distinct axes of "customer ready", often conflated:

- **Product readiness**: features meet market needs; critical user journeys
  work with evidence (Source: [[Selleo - Product Launch Checklist]]).
- **Production readiness**: the organization can *operate* the product safely —
  secure, reliable, observable, and owned (Source: [[Cortex - Production
  Readiness Checklist]]).

A product can be product-ready and production-unready at the same time.
Production readiness adds: monitoring/alerting, SLOs and error budgets, tested
rollback and disaster recovery, on-call ownership, runbooks, and incident
escalation paths.

## Application to aidevschool

The repo's `docs/product-readiness/` system operationalizes the first axis
(journey claims with Playwright evidence, tiers, freshness rules) but not the
second: there is no monitoring, no SLOs, no on-call, no rollback for user
data, and no incident owner (Source: [[Local - Product-Readiness Audit
2026-08-21]]). Under the Selleo No-Go criteria, missing monitoring, recovery
path, and incident owner each independently justify a No-Go for public launch.

A third axis sits above both for paid customers: **commercial/legal
readiness** — accounts, billing, privacy policy, terms, and regulatory
compliance (see [[Student Data Privacy Compliance]]).
