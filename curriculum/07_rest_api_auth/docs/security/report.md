# Security Report: REST API with Auth

> **Cycle:** 07_rest_api_auth · **Generated:** 2026-07-02
> DoD §7: *"security/report.md with no critical findings."*

## Scope

Static review of the go, rust, node implementations against the spec. This is a
single-node, in-memory system (no external dependencies, no persistence, no network ingress
beyond localhost unless the project's concept is an auth/network service — see `spec.md`).
Threat model: input-validation failures, unsafe deserialization, boundary checks, and any
authn/authz logic specific to the project.

## Findings

- [ ] [GO] Custom password hashing should not replace a vetted KDF
- [ ] [GO] Refresh rotation is not atomic for concurrent replay attempts
- [ ] [GO] Token verification does not check session/JTI revocation state
- [ ] [GO] Tests do not cover expired/wrong-audience/wrong-signature JWT variants
- [ ] [NODE] Token verification does not consult session/JTI state
- [ ] [NODE] Replay audit metadata records the mutated status, not previous status
- [ ] [NODE] Config source omits password iterations in `main.ts`
- [ ] [NODE] Runtime validation hand-written today; schema validation is the next step

## Verdict

**⚠️ findings flagged — review mitigations below.**

## Mitigations

- Treat all client input as untrusted; validate at the serialization boundary before it touches
  internal state.
- If the project persists data or listens on a non-localhost interface, add secret management,
  TLS, and rate-limiting before any deployment beyond the lab.
- Re-run this review against any production-facing variant — the lab scope explicitly excludes
  supply-chain and infra threats.
