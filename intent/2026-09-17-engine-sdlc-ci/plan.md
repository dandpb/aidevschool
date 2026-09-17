# Fix CI run 35220657782

User requested all findings in the linked CI execution be corrected on feature/engine-sdlc.

## Findings and bounded changes
- literacyDojo: formatter/import ordering in two analytics files. Apply configured formatter only.
- Python complexity: refactor five functions in learner/gate/standards.py into cohesive loading, metric, verifier and evidence-validation helpers. Preserve exact gate decisions and diagnostics; do not change numeric thresholds or baseline.
- SDLC credential path: rename historical non-secret browser environment probe to browser-probe.json; update references and package manifest.
- Cross-engine integration: old test parses emitter arrays as literals although vocabulary now comes from canonical JSON. Update verification to evaluate current exported values, retaining equality checks.
- Supervisor: test compares all future curriculum against fixed historical commit, absent in shallow CI. Replace the obsolete task-time assertion with a meaningful runtime immutability contract, subject to review and owner test-edit authorization.
- Ten existing protected test edits inherited in the branch need actual owner acceptance/AID under docs/sdlc/README.md, not removal of the guard. No fabricated trailers or approvals.

## Proof
Retain failed CI logs under .scratch/ci-35220657782. Run existing Python gate/evidence tests before and after; complexity gate with unchanged max/baseline; literacyDojo lint/test/build; analytics Node contract suite; supervisor suite; SDLC guard self-test and diff check. Independent review before commit/push. Follow new GitHub CI to completion after authorized edits.

## Boundaries
No canonical learner state edits, test weakening, complexity baseline increase, disabling checks, unrelated cleanup or fabricated approvals. Record any owner authorization for existing test edits before applying those edits.

## Owner authorization
On 2026-09-17 the owner replied "sim" to the explicit request approving the two proposed stale-test fixes and the ten inherited test migrations reviewed without loss of coverage. This authorizes those existing-test edits. The CI-required AID reference is still awaiting identification; none has been invented.

The owner then instructed: "to fazendo sem o paperclip direto ... mas cria uma issue no github .. coloca as alteracao feitas como descricao". Actual approval record: https://github.com/dandpb/aidevschool/issues/472. CI accepts GH-<positive issue number> alongside AID for owner-approved trailers; same human acceptance and reviewer requirements remain. Synthetic tests cover valid GH test/derived approvals, malformed IDs and credential isolation. Commit trailer: SDLC-ALLOW-TEST-EDIT: GH-472.
