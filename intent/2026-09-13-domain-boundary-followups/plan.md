# Accepted scope and execution plan

Authorization: owner's `1-4` reply selects the preceding concrete recommendations.

1. Add learner/substrate/tests/test_gate_evidence_class.py using the existing
   no-code fixture and code-gate fixtures; record the failing run before fixing.
2. Update learner/substrate/gate.py success metadata and wording by gate kind.
3. Update CONTEXT-MAP.md, learner/CONTEXT.md, learner/substrate/interface.md,
   docs/handbook/{01_architecture,08_learner_substrate,09_glossary}.md and
   engines/codexDojo/ecosystem/MANIFEST.md for the four accepted boundaries.
4. Run `/tmp/aidevschool-domain-boundaries-venv/bin/python -m pytest learner/substrate/tests/test_gate_evidence_class.py -q`,
   then the same interpreter with `-m pytest learner/substrate/tests learner/gate/tests -q`.
   Expected: new regression red before fix, both suites green after fix.
5. Inspect documentation against actual no-code, browser adapter, commit and
   projection paths; run `git diff --check`. Record evidence and REVIEW.md
   passes. Obtain fresh-context independent verification of this change only.

Risks: code/no-code terminology must not imply weaker receipt checks; existing
stored no-code records are not migrated. Projection publication remains
synchronous and not a multi-file transaction. No live state regeneration,
UI change, existing-test edit or unrelated work is included.

Environment adjustment: system Python lacks pytest and the existing .venv
interpreter symlink is unusable here. Use an isolated /tmp venv with project
dev dependencies. `rtk` is unavailable, so commands run directly.
