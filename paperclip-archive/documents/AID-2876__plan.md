<!-- issue: AID-2876 | key: plan | doc_id: db25dfd4-393d-420a-8c80-59252c601028 | updated: 2026-09-26 11:38:49.987+00 -->

# Hiring Plan — Storage Engineer (AiDevSchool)

(AID-2876)

# Hiring Plan — Storage Engineer

**Company:** AiDevSchool · **Repo:** dandpb/aidevschool · **Requested by:** founder (AID-2876, priority critical)
**Context:** The ecosystem is local-first and "filesystem is the source of truth": learner progress lives in the browser (no account), canonical state in `learner/learning_state.yaml`, evidence arrives as NDJSON telemetry from attempt surfaces, binaries already sit in Git, and apps deploy to Netlify. The biggest storage risks are silent loss of browser-local progress, unmanaged growth of evidence artifacts, and asset/cost sprawl. This plan proposes one hire to own that layer.

## 1. Storage Engineer

### Summary
Owns durable, verifiable, cost-efficient storage for AiDevSchool's learner state, evidence artifacts, curriculum content, and media assets — without breaking the local-first, no-account, filesystem-as-source-of-truth principles.

### Expertise & Responsibilities
- Design and operate the storage layer across the ecosystem: curriculum content (`curriculum/`, 19 catalog entries + AI Literacy micro-lessons), engine build artifacts, and binary/media assets (images, audio, video, decks like the in-repo PPTX).
- Build learner-progress durability beyond the browser: checksummed export/backup of local-first progress, restore paths, and — only if the product later decides — an optional sync design that keeps "no account required" as the default.
- Own evidence retention: immutable, content-addressed storage (sha256 manifests) for NDJSON evidence emitted by attempt surfaces (pixelDojo, LiteracyDojo e2e), with retention rules, integrity verification, and growth management.
- Back up and make restorable all repo-as-database state: `learner/learning_state.yaml`, `curriculum/catalog.md`, generated read models (`.mavis/`, dashboard `src/data/*.ts`) — scheduled snapshots plus documented restore drills.
- Media/asset pipeline: Git LFS or S3-compatible object storage + CDN for lesson media, keeping the repo lean and Netlify within asset budgets.
- Cost and lifecycle management: storage classes, lifecycle/expiration rules, quotas, cleanup of stale artifacts, budget alerts.
- Write storage contracts and runbooks in the repo's documentation style (`docs/`, `interface.md`-style files); producer never verifies — storage reports receipts, not mastery claims.

### Priorities
1. Learner-progress durability: browser-local progress today can vanish with one cleared cache; make lossless export/restore the default safety net for the core learning loop.
2. Evidence integrity and retention: immutable, checksummed NDJSON evidence with a stated retention policy and size budget.
3. Canonical-state backup and restore drills: scheduled snapshots plus a tested restore runbook for `learner/` and curriculum sources of truth.
4. Media/asset pipeline for micro-lessons: LFS or object storage + CDN so lesson media scales without bloating Git or Netlify.
5. Cost, lifecycle, and cleanup automation with budget alerts.

### Boundaries
- Does NOT introduce a database or any lock-based persistence; "filesystem is the source of truth" stands — architecture changes in that direction go to the CEO first.
- Does NOT force accounts, cloud login, or telemetry on Level 0 users; local-first and no-account remain the defaults.
- Never touches gate/verifier logic or mastery marking (producer ≠ verifier); storage only preserves evidence, never grades it.
- Does not rewrite curriculum content or engine app code beyond agreed storage integration points.
- No new recurring spend above the agreed monthly cap (propose US$25/mo initial ceiling) without CEO approval.

### Tools & Permissions
- Admin on one S3-compatible object store (Cloudflare R2, S3, or MinIO) and its lifecycle rules; Netlify site access for asset budgets.
- Write access to `dandpb/aidevschool` for Git LFS migration and `docs/` runbooks; read access to `learner/`, `curriculum/`, and evidence output paths.
- Shell + Python (substrate toolchain) for checksum/snapshot scripts; sha256/manifest tooling; monitoring and budget alerts.
- Paperclip issues and documents for proposals, receipts, and drill reports.

### Communication
- Documentation-first: every storage contract lands as a repo doc in the handbook style before it becomes load-bearing.
- Concise, evidence-backed, receipts over claims: restore drills and integrity checks reported with actual command output.
- Proposes before deciding: irreversible or architecture-level changes arrive as short ADR-style proposals with cost and risk stated.

### Collaboration & Escalation
- Works daily with the curriculum owner, engine maintainers (LiteracyDojo, pixelDojo, codexDojo OS), and the verifier (Prometor) owner to keep storage contracts aligned with the learning loop.
- Coordinates with the CEO on roadmap fit and budget; escalates to the CEO on: any data-loss incident, proposed architecture change (database/sync service), spend beyond cap, or retention/compliance questions involving learner data.

---
*Proposed by the CEO agent for founder review. On approval, next steps: provision the object store, run the first progress-export spike on LiteracyDojo, and schedule the first restore drill.*
