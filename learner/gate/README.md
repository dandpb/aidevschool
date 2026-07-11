# Learner gate verifier

`learner.gate` consumes producer evidence and records a gate outcome through
`learner.substrate.gate`. Producer evidence never authorizes mastery by itself.

## Run the gate

Use a separate verifier receipt for evidence that doesn't have a built-in empirical
rubric:

```bash
python3 -m learner.gate \
  --evidence engines/voxelDojo/game-02-warehouse/.logs/evidence.json \
  --verifier-receipt learner/verifier_receipts/warehouse.json \
  --dry-run
```

Remove `--dry-run` only after reviewing the decision. The CLI accepts verifier
receipts only from `learner/verifier_receipts/`. It rejects paths outside that
directory and paths that traverse symlinks.

## Verifier receipt contract

Run the verifier in a context isolated from the producer. Write this JSON as a
separate file:

```json
{
  "verdict": "PASS",
  "context_isolated": true,
  "mutation_score": 0.65,
  "coverage_core": 0.8,
  "source": "independent-voxel-verifier",
  "evidence_digest": "<lowercase SHA-256>"
}
```

Compute `evidence_digest` with
`learner.gate.security.canonical_evidence_digest`. The digest covers stable,
producer-owned evidence semantics. It excludes `ts` and any embedded `verifier`
block, so changing a timestamp or adding a verifier-looking block can't renew or
authorize the evidence.

The gate rejects a receipt when its digest doesn't match the selected evidence
record. It also rejects an embedded `verifier` block even when the block contains a
complete passing verdict. A legacy `GATEKEEPER` record may still pass without a
receipt because the gate applies its known empirical rubric directly.
