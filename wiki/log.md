# Wiki Log

## [2026-08-21] autoresearch | Docs vs Code Drift
- Rounds: 1 (auditoria local + web mínima para verificação de links)
- Sources found: 1 internal audit
- Pages created: [[Research - Docs vs Code Drift]], [[Documentation Drift]], [[Local - Docs vs Code Drift Audit 2026-08-21]]
- Synthesis: [[Research - Docs vs Code Drift]]
- Key finding: ~20 drift items found between docs and real code/config; high-severity ones in VISION.md, ESTADO_REAL_2026-08-17.md, CONSOLIDACAO_2026-08-17.md, engines/codexdojo-os-prototype/README.md, and engines/pixelDojo/README.md.

---

## [2026-08-21] autoresearch | Repo Customer Readiness
- Rounds: 2
- Sources found: 5 filed (1 internal audit + 4 external) + 2 search-level (ECA Digital, ADA Title II)
- Pages created: [[Research - Repo Customer Readiness]], [[Product vs Production Readiness]], [[Student Data Privacy Compliance]], [[Local - Product-Readiness Audit 2026-08-21]], [[Selleo - Product Launch Checklist]], [[Cortex - Production Readiness Checklist]], [[Promise Legal - EdTech Student Data Privacy]], [[Macher - LGPD Dados de Menores]]
- Synthesis: [[Research - Repo Customer Readiness]]
- Key finding: the repo measures local facilitator-guided journeys well but lacks the entire operational (observability, deploy, data durability), commercial (accounts, billing, support, LICENSE), and legal (privacy policy, LGPD/ECA Digital, FERPA/COPPA) layer for real customers — and its latest readiness grants are stale under its own freshness policy.

---

## [2026-09-26] docs-readiness | Agentic Factory Field Guide
- Rounds: 1 (compilation of the 22 POC receipts from FACTORY-STRESS, umbrella AID-2681)
- Sources found: friction-log (rev 14) + improvements-backlog docs on AID-2681; receipts AID-2682..AID-2702; PRs #550/#551
- Pages created: [[Field Guide - Agentic Factory Stress 2026-09-26]]
- Synthesis: [[Field Guide - Agentic Factory Stress 2026-09-26]]
- Key finding: the rail carries all tested lanes (docs-only, content lesson, e2e item, a11y custom proof, 40-way concurrency); open P0s are gate re-derivation + mandatory PR binding; receipt reflow and contract-checks-in-CI are the top adoption gaps.
