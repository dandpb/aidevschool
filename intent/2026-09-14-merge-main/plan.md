# Merge plan

1. Check local diffs and existing branch ancestry. Revalidate the local no-code
   patch with `python -m pytest learner/substrate/tests learner/gate/tests -q`.
2. Validate OS analytics with engine `npm run lint`, `npm run test` and
   `npm run build`; use its unchanged lockfile if native dependencies are missing.
3. Commit the local domain follow-ups with their original evidence, the OS
   analytics change, and documentation/plans in coherent local commits.
4. Merge feat/context-authority into main. Resolve any map/glossary/manifest
   conflict by retaining both independently scoped sets of additions.
5. Run authority and no-code integration proofs at merged HEAD; independent
   reviewer verifies merge preservation and pending analytics behavior. Run
   applicable SDLC guards and record actual git status without claiming the
   unrelated local platform state is clean.

Prior authorization/evidence: intent/2026-09-13-domain-boundary-followups;
.design/analytics-emitter-consolidation.md; context-authority branch's
.tasks/context-authority.md and .checks/context-authority.verified.md.
