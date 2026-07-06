# Decision — 07_rest_api_auth

- **Slug**: `07_rest_api_auth`
- **Shape**: **B** — fresh standalone 3D sibling app at `engines/pixelDojo/games/07_rest_api_auth/`
- **Concept (catalog)**: JWT (sign/verify), RBAC, middleware chains, layered architecture
- **Key question (catalog)**: How does auth middleware composition differ across frameworks in each language?

**Rationale (≤ 6 lines)**:

1. The teachable core is **ordered middleware composition** (Version → Validation → AuthN → AuthZ → Handler) where *ordering is the security invariant* — pixel-quest's existing encounters are all "sprite → admit/reject" admit-reject variants and have no notion of an ordered chain whose layers can be misplaced.
2. The mechanic needs separable, reorderable physical gates along a 3D corridor: a forged `admin`-claim token must detonate the admin handler when AuthZ is placed before AuthN. That geometry (torus ring chain + traveling orb) cannot be mapped onto token-meter/sequence/policy/route encounter kinds without rewriting their semantics.
3. Matches the canonical Shape B examples in SKILL.md (circuit-breaker switch, KV-with-TTL blocks, hashing ring) — a fresh world whose 3D form *embodies* the concept rather than reskinning it.
4. Self-contained scope: one corridor, four gate kinds, five orb archetypes (forged/expired/wrong-audience/missing-token/malformed-body/forbidden-role/legit). No shared-state backend needed; L4 refresh-replay can stay client-side simulated.
5. Clean evidence contract: new `metrics.kind = "threejs-middleware-chain"` with breach counters per gate + `gate_order` array — pass rule is `correct_order && zero breaches`, directly observable under Playwright.
6. Distinct from already-decided Shape B siblings (`02_key_value_store`, `16_mini_message_queue`) — no overlap in geometry, evidence kind, or playable surface.

**Done-rule (catalog, one line)**: The Aegis Corridor 3D world proves the learner can compose the canonical middleware order (Version → Validation → AuthN → AuthZ) such that a wave of mixed-legitimacy request orbs clears with zero AuthN/AuthZ/Validation/Version breaches — emitting a valid evidence record for unit `U0-rest-api-auth-middleware-chain` under Playwright.
