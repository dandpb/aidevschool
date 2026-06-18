# Memory Curation Contract

This contract defines the operational loop that keeps persistent learner state fresh. It pairs with
[MEMORY_MODEL.md](./MEMORY_MODEL.md), which describes the memory layers. Where the model is
descriptive, this contract is operational: it says who curates, when, from what input, into what
output, and how to verify the curation happened.

## Trigger

After each completed learning cycle, once a project's verifier publishes a result. A cycle is
considered complete when step 3 (verifier result) and step 4 (review result) of the Memory Update
Policy in `MEMORY_MODEL.md` have both produced artifacts.

## Owner

The **Memória** agent, acting in the cycle stage "registrar". The registrar is the only role that
writes to the whiteboard layer during curation. A producer never verifies its own work, and a
registrar never invents evidence: it only promotes what the verifier and reviewer already published.

## Input

Cycle artifacts produced by the roles upstream of the registrar:

- `verdict.md` from the verifier (pass/fail plus evidence commands).
- `review.md` from the reviewer (findings, severities, idiomaticity notes).
- Benchmark results (p50/p99, throughput, resource snapshots).
- Journal entries and pitfall observations captured during the attempt.

## Output

Updated whiteboard files. Each output has a narrow contract so the registrar cannot rewrite history
or invent mastery:

- `learner/learner_profile.md`: Dreyfus/Bloom levels move **only** when backed by executable
  evidence from the verifier. Documentation, dashboard, or explanation work never moves a level.
- `learner/pitfalls.md`: one concise reusable mistake per cycle, formatted for spaced review.
- `learner/journal.md`: one generalized lesson per cycle, reusable across projects. Not a transcript.

The profile's `next_action` field is the only field the registrar may update without verifier
evidence, and only when the current value references stale state.

## Status Label

Each curation step carries a status from the manifest's status vocabulary
(`implemented`, `scaffolded`, `planned`, `proposal`, `blocked`):

- Use `implemented` for steps that have executable verification today.
- Use `planned` for automation that is designed but not yet built. The manual curation described in
  this contract is `implemented`; a future fully-automated pipeline is `planned`.

## Evidence Path

Curation evidence is recorded in one of two places:

- `.omo/evidence/memory-curation-{date}.txt` for the raw substrate command output.
- The matching `learner/journal.md` entry for the reusable lesson and its evidence pointers.

The evidence path is append-only. A curation run that produces no new lesson still records its
"no-op" decision with a reason, so the audit trail shows the registrar ran and chose not to write.

## Verification Command

```bash
python3 -m learner.substrate                                  # regenerate derived views
python3 -m unittest discover -s learner/substrate/tests -t .  # validate invariants
```

Both must succeed for a curation run to be marked `implemented`. If the substrate is unavailable
(missing Python dependencies), record the exact error in the evidence file and mark the run
`scaffolded` rather than claiming success.

## Curation Checklist

| Step | Status | Verification |
| --- | --- | --- |
| Extract reusable lessons from cycle artifacts | `implemented` | Journal entry exists and is non-empty |
| Update Dreyfus/Bloom levels | `implemented` | Profile reflects latest evidence only |
| Add pitfalls for spaced review | `implemented` | Pitfalls file has new entry |
| Regenerate derived views | `implemented` | `python3 -m learner.substrate` succeeds |
| Automated curation pipeline | `planned` | Not yet built; manual trigger |

## Guardrails

- A concept never reaches `mastered` from documentation, dashboard, or explanation work alone. The
  learning gate requires a learner attempt plus a verifier result.
- The registrar does not dump raw chat into the journal. Each entry must be a generalization with a
  future use, per the "What To Store" / "What Not To Store" policy in `MEMORY_MODEL.md`.
- Failed attempts are learning evidence and are preserved, not erased.
