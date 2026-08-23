# aiDevschoolMvp — AI DevSchool chat-tutor MVP

SKILL.md chat tutor for the 24-concept track "AI Fluency Foundations", taught
in 5–10 minute sessions to exactly one learner. The canonical entry point is
[`aidevschool/SKILL.md`](aidevschool/SKILL.md); all scoring, state changes,
scheduling, and progress reporting are delegated to the bundled scripts under
`aidevschool/scripts/` — the skill itself never decides pass/fail and never
edits state files.

This engine has no package-manager surface. Tests live in `tests/` and run via
the repo-root Python suites (`make test` from the repo root).
