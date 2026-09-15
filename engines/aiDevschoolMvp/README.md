# aiDevschoolMvp — AI DevSchool chat-tutor MVP

SKILL.md chat tutor for the 24-concept track "AI Fluency Foundations", taught
in 5–10 minute sessions to exactly one learner. The canonical entry point is
[`aidevschool/SKILL.md`](aidevschool/SKILL.md); all scoring, state changes,
scheduling, and progress reporting are delegated to the bundled scripts under
`aidevschool/scripts/` — the skill itself never decides pass/fail and never
edits state files.

This engine has no package-manager surface. Tests live in `tests/` and run via
the repo-root Python suites (`make test` from the repo root).

## Authority boundary

The tutor's `state.json`, `plan.json` and `ledger.jsonl` describe its own
24-concept journey. `MASTERED` means **MVP Mastery**: a result under this
tutor's G1–G4 gates. It does not update `learner/learning_state.yaml` or grant
canonical mastery. The MVP's gap-ladder review scheduling is separate from
canonical FSRS and from LiteracyDojo's local skill reviews.

Integration requires an explicit future decision about identities and evidence;
there is no automatic conversion of MVP completion into canonical mastery.
See the [context map](../../CONTEXT-MAP.md) and
[learner glossary](../../learner/CONTEXT.md). This boundary does not migrate or
change the tutor's existing state, curriculum, gates or review schedule.
