# Specification

- Catch start, attempt and completion failures separately, retain the relevant screen, answers and feedback, and explain that the operation may already have been recorded. Do not retry automatically or promise idempotency.
- Coordinate in-screen mutations while each operation is pending, preserve keyboard focus during the wait and on failure, and announce progress. No claim covers focus after successful submission, refresh, external navigation, multiple tabs or operations started elsewhere.
- Verify pre-write failure, post-write uncertainty, repeat actions, answers, feedback, keyboard and independent review.
