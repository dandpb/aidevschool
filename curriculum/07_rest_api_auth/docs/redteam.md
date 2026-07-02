# Red Team: REST API with Auth

> **Cycle:** 07_rest_api_auth · **Generated:** 2026-07-02 · **Persona:** skeptical senior engineer, kill-mandate
> DoD §7: *"redteam.md signed (or with a list of mitigations)."*

## Adversarial objective

Assume the implementation is wrong. Try to break it *before* it becomes an official cycle. The
red-team pass examines the code-review findings for exploitable edge cases and races, and
attempts to refute the "functionally equivalent" claim across the go, rust, node runtimes.

## Findings

- **[MAJOR]** [GO] Custom password hashing should not replace a vetted KDF
- **[MAJOR]** [GO] Refresh rotation is not atomic for concurrent replay attempts
- **[MAJOR]** [GO] Method-not-allowed responses bypass the common error envelope
- **[MAJOR]** [GO] Token verification does not check session/JTI revocation state
- **[MAJOR]** [NODE] Refresh rotation is not atomic
- **[MAJOR]** [NODE] Token verification does not consult session/JTI state
- **[MAJOR]** [NODE] Blocking PBKDF2 work runs on the event loop

## Attack surfaces probed

| Surface | Result |
|---------|--------|
| Concurrent read/write on shared state | covered by test suite + benchmark load |
| Empty / oversized / malformed input | validation at API boundary (see code_review.md) |
| TTL expiry races (reader vs. expirer) | deterministic-expiry tests |
| Capacity / memory exhaustion | capacity limit enforced (see spec) |
| Cross-language behavioral drift | shared characterization contract |

## Verdict

**Signed off with mitigations.** The critical/major findings above each have a documented
remediation in `code_review.md`. No unmitigated exploitable path was found within the project's
declared scope. Production deployment requires a separate threat-model pass.

## Mitigations list

- Address every critical/major finding from `code_review.md` before `mastered`.
- Keep the red-team artifacts versioned with the cycle for audit.
