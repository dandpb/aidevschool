# Producer evidence and review

Accepted task: `.tasks/context-authority.md`; frozen proofs:
`.checks/context-authority.md`. Expected-name reconciliation was accepted and
recorded in `reconciliation.md`. Existing main commits 2f89358/4abb418 supply
the pipeline writers, common serialization and CLI provenance output.

## Commands and results

Use `PATH=/mnt/mac/aidevschool/.venv-linux/bin:$PATH` and interpreter
`/mnt/mac/aidevschool/.venv-linux/bin/python`; system Python has no pytest.
`rtk` is absent in this environment, so commands run directly.

- `-m pytest engines/openclaw/tests/test_provenance.py
  engines/miniMaxEvolutionEngine/tests/test_context_authority.py -v`:
  **22 passed in 4.88s**, individually named in `proofs.txt`.
- Same proofs before implementation: **20 failed, 2 passed**, `red.txt`.
- After adopting upstream and reconciling names, before completing this patch:
  **12 failed, 10 passed**, `red-after-upstream.txt`.
- `-m pytest engines/openclaw/tests engines/miniMaxEvolutionEngine/tests
  engines/miniMaxEvolutionEngine/.claude/commands/devschool/tests -q`:
  **176 passed in 9.82s**, `regression.txt`.
- `git diff --check`: exit 0.

## REVIEW.md and simplify

Correctness: criteria 1–10 map to C1–C12. Missing versus invalid provenance is
explicit; supervisor digest/write still share dump_status. Checkpoint, failed
verification and preview preserve their existing boundaries. Producers now
propose the phase instead of declaring it independently.

Evidence: red-before-green proofs; integration checks cover main/hook and the
supervisor authorization path. No test from the main baseline was edited by
this completion patch. Fresh-context verification follows the implementation
commit and owns the final verdict.

Conventions/security: no changes to real learner state, curriculum content,
MVP runtime/ledger or generated projections. Manifest and operating contracts
updated. Provenance is metadata, not identity authentication. No new dependency,
global lock or autonomous phase introduced.

Simplify: reuse the existing Grade enum, dump_status and all writers; add one
shared validation function. Keep descriptions of MVP authority in existing
map/glossaries instead of adding another state model.
