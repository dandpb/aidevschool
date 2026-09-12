---
type: source
title: "Promise Legal: EdTech Student Data Privacy — FERPA, COPPA & State Laws"
source_type: legal-analysis
author: Promise Legal
date_published: 2026-07-10
url: https://blog.promise.legal/startup-central/edtech-student-data-privacy-compliance/
confidence: high
key_claims:
  - "FERPA's school official exception creates direct obligations for edtech vendors, not just schools"
  - "COPPA requires verifiable parental consent before collecting data from children under 13"
  - "Nearly 150 state student privacy laws across 47 US states regulate vendors directly"
---

# Promise Legal: EdTech Student Data Privacy Compliance

Legal analysis of the three-layer US regulatory stack for edtech vendors:
FERPA, COPPA, and state laws (SOPIPA, NY Ed Law 2-d).

## Key claims

- **FERPA school official exception** (34 CFR § 99.31(a)(1)(i)(B)): a vendor
  processing student records becomes a "school official" and cannot use data
  for anything beyond the authorized educational function, cannot redisclose
  it, and must operate under the school's direct control. Requires a signed
  data sharing agreement addressing § 99.33(a). (Confidence: high)
- **COPPA** (16 CFR Part 312): verifiable parental consent before collecting
  personal information from children under 13; FTC's 2025 amendments tightened
  requirements. Implies age-gating, parental consent flows, data minimization,
  and limits on third-party disclosures built into product architecture.
  (Confidence: high)
- **SOPIPA** (California, model for 20+ states): prohibits targeted
  advertising, profiling for non-educational purposes, and selling student
  data; requires reasonable security procedures and deletion of student data
  on request. (Confidence: high)
- **Procurement reality**: districts routinely demand signed DPAs, SDPC
  National Data Privacy Agreement participation, evidence of security
  practices, and data flow documentation — vendors who cannot produce these
  quickly lose deals. (Confidence: high)

## Recommended pre-sale build list

1. Map data flows (every field, subprocessor, region, downstream use).
2. Data minimization by default.
3. Reasonable security: encryption in transit/at rest, RBAC, audit logging,
   incident response plan.
4. Ban targeted advertising and profiling.
5. Prepare a DPA template in advance.
6. Granular data deletion capability (per student/school/district, including
   subprocessors).
7. Age-gating and COPPA consent flows if children under 13 use the product.

## Relevance to aidevschool

The repo has zero legal documents (no privacy policy, no terms) and no data
deletion/export capability — user progress lives in browser IndexedDB. If the
product ever targets US schools, every item on this list is currently missing.
