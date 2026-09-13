# Intent: strict ISO 8601 `ts` + append-only `game` channel in @aidevschool/evidence

Author: Paperclip AID-1678 (assigned to Engine Hardening Engineer) ·
Change-id: AID-1678-evidence-ts-iso-game-append ·
Status: accepted (issue scope; behavior change ⇒ GO de domínio Learning Engine Engineer antes do merge)

> One source of truth: the AID-1678 issue body. Title (quoted): "fix: residual de
> BUG_AUDIT #34/#34-bis no @aidevschool/evidence — `ts` ISO 8601 estrito +
> append-only do canal `game` (mudança de comportamento; requer GO de domínio)".
> The issue carries the full origin/risk/evidence/acceptance record (BUG_AUDIT
> 2026-07-19 #33/#34 residuals revalidated on main 75cbafbc during AID-1673 R3).

## Problem

Two residuals of BUG_AUDIT_2026-07-19 #33/#34 survive on main 75cbafbc:

1. **#34 residual — `ts` non-ISO parseable is ACCEPTED.**
   `engines/shared/teaching-evidence/evidenceEnvelope.ts:100-103` uses
   `Number.isNaN(Date.parse(ts))` as an ISO 8601 proxy. `Date.parse("July 10, 2026")`
   → valid ⇒ `validateEvidenceEnvelope` accepts the exact shape BUG_AUDIT #34 cites.
2. **#33 residual — `game` channel overwrites.**
   `engines/shared/teaching-evidence/evidenceTransport.ts:79-81` writes a
   single-record slot via `Reflect.set(target, "__gameEvidence", record)`, violating
   the append-only contract the audit demanded. Git archaeology: the append fix
   existed in `52aaf72ee` (2026-07-08) and regressed in `a18f54839` (2026-07-09).
   Mitigant (verified again on this branch): no production caller routes through
   the `game` channel — `emitEvidence` only selects it for
   `meta.windowKey === "__gameEvidence"`, and no game passes that key; no external
   reader of `window.__gameEvidence` exists outside the package's own tests.
   Canonical producers stamp `ts` with `new Date().toISOString()`, which stays valid.

Blast radius of both fixes is therefore nil for live consumers; the evidence
envelope is the golden-rule primitive, so validating less than the declared
contract weakens the deterministic completion gate.

## Plan

Files (real paths, in order):

1. `engines/shared/teaching-evidence/evidenceEnvelope.ts` — add a strict ISO 8601
   format regex and AND it with the existing `Date.parse` check (regex rejects
   `July 10, 2026` / `2026/07/10`; `Date.parse` keeps rejecting impossible
   calendars like `2026-13-45T99:99:99Z`).
2. `engines/shared/teaching-evidence/evidenceTransport.ts` — `case "game"` becomes
   append-only with legacy single-record normalization
   (`[...(Array.isArray(prev) ? prev : prev ? [prev] : []), record]` — the exact
   pattern of the historical fix `52aaf72ee` and of the live pixelquest/voxeldojo
   cases, plus legacy-object wrap).
3. `engines/shared/teaching-evidence/tests/evidenceEnvelope.test.ts` — extend the
   BUG_AUDIT #34 rejection block: `"July 10, 2026"`, `"2026/07/10"` rejected;
   `"2026-09-13"` (date-only ISO) and offset form accepted.
4. `engines/shared/teaching-evidence/tests/evidenceTransport.test.ts` — replace the
   reachability-only pin for the `game` channel with the append-only shape pin
   (two emits ⇒ `[first, second]`; legacy non-array normalized; update the file-top
   NOTE and the two `__gameEvidence` single-record assertions in the postMessage
   block to the array shape).
5. This intent file.

Test edits touch the AID-1673 suite: the commit carries the
`SDLC-ALLOW-TEST-EDIT: AID-1678` trailer; the owner acceptance is recorded in the
AID-1678 issue body (Mudança proposta item 3) and its GO gate. Assertions are
strengthened, never weakened.

## Proof

```bash
cd engines/shared/teaching-evidence && npx vitest run      # full suite green
# mutation M-iso: drop the regex conjunct  ⇒ suite must fail (ts cases)
# mutation M-append: restore Reflect.set overwrite on "game" ⇒ suite must fail
```

Also runs in CI via the dedicated voxeldojo-job step wired by AID-1673
(`.github/workflows/ci.yml`). Consumers unaffected (no `game`-channel caller;
`toISOString()` stamps remain valid).

## Out of scope

No pedagogical behavior change (validation/transport strictness only); no
migration of the dormant `game` channel's would-be readers (none exist); merge is
single-writer FPE after domain GO (Learning Engine Engineer).
