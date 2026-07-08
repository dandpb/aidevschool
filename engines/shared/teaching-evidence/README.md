# teaching-evidence

Deep evidence-emitter module for teaching games.

- **Interface:** `emitEvidence({ meta, pass, metrics, reviewSlice? })`
- **Owns:** envelope fields, dual channel (window global + `EVIDENCE` console line),
  `review_context` derived from substrate review slice.
- **Does not own:** learner-state transitions (verifier + substrate).

Canonical source: `emit.ts` in this directory.

Live import path for voxelDojo games (same implementation, tree-local for Vite):

`engines/voxelDojo/shared/evidence.ts`

Keep the two files in sync when changing the envelope.
