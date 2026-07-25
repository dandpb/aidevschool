# Learner gate verifier

`learner.gate` consumes producer evidence and records a gate outcome through
`learner.substrate.gate`. Producer evidence never authorizes mastery by itself.

## No-code literacy path (AI Literacy / LiteracyDojo)

LiteracyDojo emits raw `LiteracyEvidenceRecord` envelopes and records at most
local `completed`. Independent judgment lives here — not in the React UI:

```bash
python3 -m learner.gate.literacy \
  --evidence path/to/literacy-evidence.json \
  --write-receipt learner/verifier_receipts/literacy-last.json
```

- Exit `0` only when the independent verdict is `PASS`.
- Missing or invalid evidence **fails closed** (exit `1`, `mastery_eligible: false`).
- Application-report activities may `PASS` as reported completion but never set
  `mastery_eligible`.
- Receipts set `producer_writes_mastered: false` and `max_producer_claim: "completed"`.
- This CLI does **not** write `learner/learning_state.yaml` or LiteracyDojo UI state.

Implementation: `learner/gate/literacy_verifier.py` + CLI `learner/gate/literacy.py`.
Contract: `docs/design/ai-literacy/evidence-contract.md`.

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
