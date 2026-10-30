# Specification

- Allow at most one verification request in flight per mounted result screen, including same-event retry clicks.
- Keep the retry control focusable and guarded while waiting; announce progress and show the latest returned error or receipt without changing verification or canonical progress semantics.
- Verify delayed failure, repeated activation, focus and deliberate retry; use isolated fake clients, not a real verifier or invented production verdicts. External navigation and remount are outside the guard.
