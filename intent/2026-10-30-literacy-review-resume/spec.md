# Specification

- For activities in a due lesson-review session, successful and unsuccessful attempts record practice, scores, XP rules, evidence and analytics as before, but do not advance `nextReviewAt` or the effective review stage. When `reviewStage` is absent and intervals exist, materialize the equivalent stage derived from the pre-attempt passes, including on failed attempts. Reloading an incomplete due review leaves it due.
- A completed review still advances its existing schedule exactly through the existing completion logic. Initial lessons and module challenges retain their current scheduling: module challenges also use `context: review` for evidence, so context alone must not identify a due review session.
- No learner canonical state, mastery, curriculum or evidence schema changes. Validate both state-store and legacy adapter paths, review completion, and checkpoint behavior.
- When completing via the legacy progress repository, read its current progress before saving so recent attempts are not replaced with a stale state-store snapshot.
