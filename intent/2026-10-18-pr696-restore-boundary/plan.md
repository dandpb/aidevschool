# Constrain PR #696 offline restore

Authorized by the delegated request to correct eligible useful PRs, on head
`e0795a620e8e381a4966312240892f33280e1397`, reconciled on 2026-10-18 with no
new comments. Independent review reproduced destination traversal and acceptance
of an unsupported manifest schema during restore.

Require a recognized manifest shape/schema and confined relative logical/blob
paths before restore writes anything. Reuse the same metadata validator for
verify. Reject paths through symlinks; use a fresh temporary output file in the
destination directory so a preexisting predictable `.tmp` link cannot receive
bytes. Preserve partial recovery of individually valid blobs, as required by the
existing test, and preserve deterministic builds and offline operation.

Add new synthetic negative tests before implementation. Keep every existing test
unchanged. A separate known bug remains in release URL generation: the build
uses `blobs/<digest>.ext` although actual GitHub Release Assets use
`blobs.<digest>.ext`. The current protected test explicitly expects the former;
changing that expectation needs specific owner acceptance, which is not inferred
from the generic instruction. No upload, release, deploy, credentials or access
changes. Independent review of the exact final delta is required; native
countersign and normal merge gates remain required.
