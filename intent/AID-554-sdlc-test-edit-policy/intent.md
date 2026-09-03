# Intent: SDLC guardrail policy for legitimate test-fixture edits (ratify the per-wave trailer)

Author: Paperclip AID-554 (QA observation 1 in the AID-553 GO verdict `00d71cb6`; owner
FPE, issue dispatched for execution 2026-09-02) · Change-id: AID-554-sdlc-test-edit-policy
· Status: accepted (issue gate passed — scope and acceptance criteria in the issue body;
final A/B policy sign-off requested from the CEO via issue interaction before merge)

> One source of truth: the AID-554 issue body. Decision asked:
> "Opção A — **Allowlist no guard** (recomendada na abertura) · Opção B — **Trailer
> SDLC-ALLOW-TEST-EDIT** em commits autorizados · Opção C — deixar como está".
> Done criteria: "Política escolhida + implementação pelo FPE (PR pequeno, CI verde) +
> guard passando nos merges futuros de conteúdo."

## Problem

The CI job `SDLC guardrails (diff)` (AID-537) flags any edit to existing test files.
Content waves legitimately edit synchronized contract fixtures (content_contract /
facade fixtures, migration counts, chapter-continuity smoke). The l21–l23 wave (PR #222,
merge `aa4d6c5b`) landed without an override, so its non-required check run on main is
red — the "persistent red" this issue was filed against — and the policy for future
waves was undecided.

## Evidence gathered since the issue was filed (2026-09-01 → 2026-09-02)

- The trailer mechanism (Option B) already exists — implemented by AID-537 in
  `scripts/sdlc_guard_check.sh` (range-wide trailer `SDLC-ALLOW-TEST-EDIT: AID-<n>`
  suppresses the test-edit check; the cited AID must record owner acceptance).
- It is in routine, green use: PRs #235/#236/#237 (waves l24–l26; trailers AID-581/593/592
  with owner-acceptance trails) all show `SDLC guardrails (diff) = success`; later waves
  (O1 l27–l29, O2 l24–l26 records, O3-C1 `e2a49304`/`ab12db28`) carried trailers and are
  green on main; main HEAD (`a10158d4`) is green.
- The tripwire still catches real unapproved edits: PR #250 head `75294395` failed the
  guard (edited `tests/fakes.ts` + a credential-shaped path) and was restructured to
  comply (`e43e5232`, AID-685/AID-676) rather than trailered — the guard changed the
  shape of the change for the better.
- The motivating red is confined to the pre-policy merge `aa4d6c5b` (PR #222 head
  `4d02ed36`, QA-audited legitimate in AID-553). Historical check runs are immutable;
  every main push since is green.

## Proposed outcome (Option B ratified)

1. Policy decision recorded where the guardrail lives (`docs/sdlc/README.md` §Guardrails):
   authorized content-wave fixture edits use the per-wave owner-approved trailer; **no
   standing path allowlist**. Option A is rejected with reasons (see spec/plan block).
2. The written policy matches demonstrated practice, so "guard passando nos merges futuros
   de conteúdo" is already machine-evidenced by the green trailer-era PRs and main pushes.
3. The pre-policy red on `aa4d6c5b` is documented as immutable history, not open debt.

## Affected users and systems

`docs/sdlc/README.md` (§Guardrails), `intent/AID-554-sdlc-test-edit-policy/` (this chain).
No engine runtime, learner state, curriculum content, hook, script, or workflow change —
this is the decision record plus policy text only.

## Constraints

- Docs-only diff: no test files, no derived paths, no workflow edits → the guard must
  pass on this PR's own diff without any trailer (self-verifying).
- The A/B choice was reserved to the founder/CEO in the issue body; the recommendation
  here (B) inverts the issue's opening hint (A) because ten days of merge evidence did
  not exist when that hint was written. CEO sign-off is requested via a
  `request_confirmation` interaction on AID-554 before merge; if the CEO picks A, this
  PR is superseded by the allowlist implementation under the same issue.
- House pattern (AID-571): PR + CI verde + independent QA verdict pre-merge
  (producer ≠ verifier).

## Open questions

- None for Option B. If the CEO prefers Option A, the open question becomes the exact
  coupling rule ("fixture edit allowed only when the same diff flips catalog/content")
  and its enforcement point (CI wrapper only — the PreToolUse hooks cannot see the diff).
