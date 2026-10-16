# Spec: reconcile four Dev journey catalog divergences

Change-id: 2026-10-15-gh-375-catalog · Status: accepted
From: [intent.md](intent.md); owner-provided plan accepted on 2026-10-15.

## Requirements

1. Catalog summary distinguishes two certifications from three additional
   partially implemented Node-verified projects (05/12/18).
2. Project 02 records the Wave 1 33 tests and 89.4/92.26/100/89.4 v8 coverage;
   05/12/18 record respectively 10/7/10 historical tests, with 12's
   91.2/83.33/96.42/91.2 coverage. Every number is dated and SHA-pinned.
3. All four status files state that `go-impl/` and `rust-impl/` were removed in
   `1b0a309`, retain `phase: cycle-complete`, and preserve Node scope limitations.
4. Regenerate every changed projection with `python3 -m learner.substrate`.
   No generated files are edited by hand.
5. Dashboard `scaffoldedCount` is 14. `masteredCount` is derived from canonical
   `units_log`, not the five implemented backlog rows; canonical state is untouched.
6. Required catalog verifier, substrate checks/tests, and SDLC diff guard pass.
   A fresh-context verifier reviews the change before PR publication.

## Design and policy

Edit the canonical catalog and project-local status docs; use the existing
substrate adapters unchanged. Update the two owner-authorized assertions and
manifest mapping. Follow root/curriculum/learner/engine AGENTS.md, CLAUDE.md,
REVIEW.md, and the ai-native-sdlc skill. Keep producer and verifier separate.

## Concerns and boundary

Wave 1 is historical evidence, not a current readiness certification. The
current Node sources of 05/12 changed after that baseline; any local rerun is
kept separate in the verification receipt. No source implementation, learning
gate, canonical mastery, or published readiness assessment changes.
