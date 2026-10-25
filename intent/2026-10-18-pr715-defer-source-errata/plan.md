# Integration correction plan

1. Reconcile PR head/activity and main. The inspected head is a240561c; integrate
   already accepted main 82936ac5 (#713) without changing that implementation.
2. Record failing adapter and catalog/projection probes before restoring the two
   sources named in spec.md. Update `SEQUENCIA-fontes-2026-10-18.md` to record
   deferral, retaining the historical `SEQUENCIA.md` and all W2 source bytes.
3. Run the same probes after the fix and the two existing source-adapter Node
   test files. Assert exact main identity of restored sources and identity of
   W2 files, contracts, adapters and existing tests with the inspected head
   (apart from files already accepted via main). Do not repeat unrelated gates.
4. Review/simplify this diff for correctness, evidence, conventions and hygiene;
   request a separate verifier's review of the exact final commit and proofs.
5. Re-read remote head/activity immediately before a normal fast-forward push.
   Update the body factually without inventing producer provenance or approval.
   Watch the new CI and preserve the PR until all normal gates are satisfied.

Proof commands: both `pg-d0{3,4}-source-adapter.mjs --check`; Python
`load_guided_practice_catalog` and `load_mission_catalog`; read-only OS
`projectDevGuidedPractices`; `node --test` for the two existing adapter test
files. The pre-existing rejection checks are the regression checks for this fix.

## Producer verification

Before restoration, both adapter checks and the Python catalog probe exited 1
on source-hash drift. The OS projection alone returned successfully, but used
the errata versions, incompatible with the accepted contracts; that return
code was not evidence of source-contract compatibility.

After restoration: both adapter checks and catalog probe exited 0 (4 guided
practices, 43 missions, contentVersion `2026-10-17.1`); all three OS dev
projection versions equal their frozen contracts. The two existing adapter
suites passed 56/56. Restored sources are byte-identical to main 82936ac5;
W2 YAML/bindings and all adapter/contract/test files are unchanged by this fix.
`git diff --check` passed. Manual simplification/review found no redundant
implementation: the functional delta only restores accepted source bytes.
The `/simplify` command is not available in this execution environment.
