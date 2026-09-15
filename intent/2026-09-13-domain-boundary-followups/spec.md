# Specification

1. The context map and architecture/substrate handbook describe the implemented
   no-code gate separately from browser verification and canonical persistence.
2. A successful no-code transition records `require_executable_evidence: false`,
   no coverage/mutation thresholds, and a next action naming independently
   verified no-code evidence. Existing code-gate semantics remain unchanged.
3. The substrate interface documents build-before-write, per-file atomicity,
   partial publication failure, drift detection and recovery with sync. Keep
   synchronous publication; asynchronous persistence is outside the accepted
   recommendation and would require a separate architecture decision.
4. Context language and the public interface distinguish local engagement streak
   from verified learning streak without renaming stored fields or changing rules.

No new approval concern: this implements the four recommendations selected by
the owner. New regression tests are allowed; existing tests remain untouched.
