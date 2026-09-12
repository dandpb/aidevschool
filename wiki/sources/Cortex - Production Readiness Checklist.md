---
type: source
title: "Cortex: Production Readiness Review Checklist & Best Practices"
source_type: industry-guide
author: Cortex
date_published: 2026-01-14
url: https://www.cortex.io/post/how-to-create-a-great-production-readiness-checklist
confidence: medium
key_claims:
  - "Production readiness is distinct from product readiness: secure, reliable, observable, owned"
  - "98% of engineering leaders report major fallout from launching unprepared services (Cortex 2024)"
  - "Readiness is a continuous process, not a one-time milestone"
---

# Cortex: Production Readiness Review Checklist

Guide to Production Readiness Reviews (PRRs): a formalized gate where service
owners validate against a shared checklist before launch.

## What it contributes

- **Product readiness ≠ production readiness.** A product can meet market needs
  while being unprepared for operating in production. Production readiness =
  secure, reliable, observable, and owned.
- Checklist categories:
  - Security/compliance: secrets management, dependency scans, access control,
    encryption at rest/in transit, regulatory validation.
  - Observability: logging, dashboards for latency/error rate/throughput,
    actionable alerts, on-call coverage, runbook-linked alerts.
  - Reliability: defined SLOs, error budgets, failure-mode testing, tested
    redundancy/failover.
  - Scalability: load testing, capacity planning, stress testing.
  - Delivery: CI/CD validation, automated deploys, tested rollback, rehearsed
    disaster recovery.
  - Ownership: named service owner, on-call rotation, escalation policy.
  - Runbooks: common failure scenarios, step-by-step remediation.
- 98% of engineering leaders reported major fallout from launching services
  that were not adequately prepared (Cortex 2024 State of Production Readiness).
- Readiness drifts: a service ready three months ago may no longer be ready
  after ownership or dependency changes — continuous validation needed.

## Relevance to aidevschool

The repo has no production service to review (local-first, manual Netlify
deploys), so nearly every PRR category is absent rather than deficient:
no SLOs, no alerting, no on-call, no rollback, no runbooks for customer-facing
operation. The repo's own `docs/product-readiness/` system covers the *product
readiness* axis (journeys with evidence) but not the *production readiness*
axis.
