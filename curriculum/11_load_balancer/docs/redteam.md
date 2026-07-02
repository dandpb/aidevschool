# Red Team: Load Balancer

> **Cycle:** 11_load_balancer · **Generated:** 2026-07-02 · **Persona:** skeptical senior engineer, kill-mandate
> DoD §7: *"redteam.md signed (or with a list of mitigations)."*

## Adversarial objective

Assume the implementation is wrong. Try to break it *before* it becomes an official cycle. The
red-team pass examines the code-review findings for exploitable edge cases and races, and
attempts to refute the "functionally equivalent" claim across the go, rust, node runtimes.

## Findings

- **[CRITICAL]** > Severity scale: Critical, Major, Minor, Educational.
- **[MAJOR]** - **[Major][All] TLS termination is absent.** RF-011 requires certificate/key loading and HTTPS listener behavior. All three run plain HTTP 
- **[MAJOR]** - **[Major][Node] `maxConnections` exists in config but is never enforced.** Backend concurrency limits are part of RF-002/RNF-007, but sele
- **[MAJOR]** - **[Major][All] Consistent-hash routing is missing.** RF-008 requires stable-key routing, but `RoutingAlgorithm` is only round-robin/least-
- **[MAJOR]** - **[Major][All] Sticky sessions are missing.** RF-010 and the session admin endpoint contract are not implemented: no cookie assignment, no
- **[MAJOR]** - **[Major][All] Retry policy is missing.** RF-013 requires retry on another eligible backend for retry-safe conditions before response head

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
