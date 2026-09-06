# Netlify functions (learner/gate staging)

Deploy-time functions staged from the shared trust boundary. Both app surfaces point
Netlify at this directory (`functions = ../../learner/gate/netlify-functions` in
`engines/literacyDojo/netlify.toml` and `engines/codexdojo-os-prototype/netlify.toml`),
so every file here ships on the next deploy of those sites — keep it deliberate.

| Function | Surface | Role |
| --- | --- | --- |
| `literacy-verify.mjs` | literacyDojo standalone | Independent verifier with the **fixed l02 v3 contract** (see below). |
| `dojo-verification-bridge.mjs` | codexdojo-os pilot | Parity projection of the Python gate (teaching-game + literacy bridge, AID-415/449). |
| `dojo-analytics-collector.mjs` | both surfaces | Same-origin analytics ingestion (AID-470/473, AID-913 O1). Never evidence, never gates. |
| `_shared/literacy-corpus.mjs` | (bridge input) | **Generated** projection of `curriculum/ai-literacy/` — do not hand-edit; regenerate with `python3 curriculum/ai-literacy/tools/validate.py --compile-verifier <outdir>`. |

## `literacy-verify.mjs` — fixed l02 v3 contract

The LiteracyDojo standalone site calls this via
`VITE_LITERACY_VERIFIER_URL = "/.netlify/functions/literacy-verify"`. It is the
independent verifier for exactly one activity — `l02` v3 `l02-a1`
(`output_comparison`, skills `entender`/`avaliar`) — and fails closed for anything
else. It recomputes the verdict from the structured answer (never trusts producer
`pass`/`score`/`deterministicChecks`), reports `verifier_version
1-netlify-l02-v3`, and sets `producer_writes_mastered: false` /
`max_producer_claim: "completed"` (producer ≠ verifier). Unlike the bridge, its
contract is deliberately **not** corpus-driven: l02 v3 is pinned until the journey
moves on, so drift in either direction must be a reviewed change.

Contract test (also wired in CI, `ci.yml` codexdojo-os job):

```bash
node --test learner/gate/tests/literacy_verify_netlify.test.mjs
```

Provenance note (AID-941): this function was live in production from 2026-08-31 but
existed only as an untracked stash (`51e503f3`) until it was tracked here,
byte-identical, with live parity re-verified (PASS + fail-closed probes) against
`aidevschool-literacydojo.netlify.app`. Deploys that predate this file being on
`main` must stage it explicitly (see `_work-products/AID-935/WAVE-PROMOTION-65d64bca.md`).
