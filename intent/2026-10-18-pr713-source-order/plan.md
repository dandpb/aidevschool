# Restore canonical source-manifest order in PR #713

Authorized correction within the delegated PR review. Exact base head:
17d26305a109a897285c10ef408fe9efcf03dc2d. Independent review found that the
new generator inserts rubrica-v1.md before the input files, although the frozen
canonical allowlist and existing pg-d01 discipline place it last. This changes
all three contentVersion values and already contradicts pg-d02's current main
source contract, independently of #710/#715.

Add a new Node stdlib test before the fix, then move only this array entry to
its canonical position. Keep every source byte, source contract, UI, existing
test, generated output, pin and gate unchanged. Map the boundary in MANIFEST.
Verify pg-d02 against its actual frozen contract, all three manifests against
canonical order and their actual bytes, and pg-d01/pg-c01 compatibility through
independent controls. This does not solve source/anchor/extraction reconciliation
of #710/#715, UI composition with #695 or native acceptance/countersign gates.

Independent review found that scripts/*.test.mjs was not selected by Vitest.
Wire the new stdlib suite into the existing npm pretest chain, preserving the
existing generation step and test command, so normal npm test/CI executes it.
Run that actual pretest path and obtain static independent review of the wiring.
