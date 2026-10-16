# C22 / C25 runtime producer report

This is a QA producer record, not the final whole-feature verification or acceptance.

## Results

| Criterion | Observed outcome | Limit |
|---|---|---|
| C22 miniMaxEvolutionEngine | **Five-phase cycle unverified.** Native status, diagnostic, interruption/recovery and a verified spec ran. Independent implementation verification failed and correctly prevented advancement. | Review, benchmark, optimization and live optional autonomy were not completed. |
| C22 advertised native entry | **Blocked variant:** hyphen names are not registered by the observed Claude CLI. Colon names worked. | Separate draft intent; no runtime/manual/test fix made. |
| C25 OpenClaw | **Observed pass:** real CLI on synthetic disposable copies, including negatives, preview, partial advance, resume and a repeat after MME. | Simulate-grade file checklist only; no AI, compilation or mastery claim. Final independent review remains with root. |

## Isolation and source

Managed disposable tree: `/Users/danielbarreto/.codex/worktrees/readiness-mme-runtime/aidevschool`, base `0a2e2dbeda5e41b00642a5280e40a0d8102d1102`. Its four MME substrate symlinks resolve internally. `langwatch ingest context` was invoked there; the host reports telemetry unconfigured.

Only candidate production carry was `learner/gate/canonical_gate.py` and `learner/gate/evidence_io.py`; each was hash-checked byte-identical to parent and PR657 `817b9872`. MME/OpenClaw production source files remained unchanged. `isolation-and-source.json` and `shared-runtime-source-hashes.json` retain the source/config hashes.

Private checkout content fingerprint: `4ed598b7bfa6a42cf94e4479568f28fd967915c67a62e07918f1202e3fbc72ca` (`private-tree-manifest.json`, tracked, missing tracked and permitted untracked paths). Source learner manifests confirm **250/250 parent files and 246/246 default-tree files unchanged**. Private fixture setup and derived-view regeneration are separate from those protected trees.

The disposable tree is retained for root cleanup/restoration while the host is under heavy load. No process remains associated with its native sessions. Its original private backup files are not needed as evidence; the required synthetic fixtures, role traces and reports are copied here. No commit, push, PR, deployment, new key or external schedule was created.

## C22 native observations

Observed runtime: Claude Code `2.1.301`, native `claude-opus-5-5` and `claude-sonnet-5-5` per the engine's role routing, Node `v22.23.2`. Existing account authentication succeeded; account identifiers and credentials are not included. Native calls used empty strict MCP configuration and the private `PYTHONPATH`. After the initial global interpreter lacked `dotenv`, the already configured `gh-375/venv/bin` was placed on child PATH. An assertion confirmed imported learner/engine modules resolve in the private tree. Child analytics credentials were blank.

1. `/devschool-status` returned exit 0 but explicitly said the name was not installed. The initialization inventory contains `devschool:status`, `devschool:diagnose`, `devschool:cycle`, etc., with no corresponding hyphen names. The model read fixture YAML manually. `/devschool:status` worked without authority writes.
2. Diagnosis without an attempt correctly stopped. A clearly synthetic external QA attempt then ran 8 native tests. A fresh Sonda (`ad06a0abd959b5397`, Sonnet) independently reran it and recommended unblocking. The orchestrator changed only the private fixture from practicing to evaluating and opened its implementation gate; no mastery. The initial QA seed lacked units-log membership after evaluation; adding a non-mastered entry via the existing `make_state` fixture helper repaired that setup omission without changing gate, unit state or pipeline. Explicit substrate regeneration then passed.
3. The initial cycle/spec call produced an artifact and started a new verifier, then our **180-second compound QA bound** interrupted it. This was not a product SLO failure. State stayed in spec. Status and explicit reconcile did not advance it, and its process group was empty. The root operator later explicitly authorized continuation with a 600-second compound bound.
4. Fresh spec verifier `a702cbd6c473a2ce3` returned FAIL on three contradictions. No status save or automatic retry occurred. The original artifact and FAIL remain in `mme-spec-verifier-fail/`.
5. Exactly one explicitly authorized Curator retry (`a0b2d40ac0f9e9947`) ran, followed by a new foreground verifier. Its PASS preceded `save_status`: **spec-done, grade verified, advanced_by /devschool-spec**. Prior FAIL/history were preserved.
6. `dev-node` (`a85de44a3008204e1`, Sonnet) and fresh verifier (`a70374124cc1cac74`, Opus) completed in separate foreground contexts. The verifier reran syntax checks and all 20 tests, observed 100% coverage, and compared 800,000 calls against its independent model. It nevertheless returned **FAIL**: deleting the negative-time guard survives every producer test because earlier `allow(0)` calls let the backward-time guard mask the missing check. This is a discriminating gate refusal, not evidence of an engine defect. The orchestrator stopped without retry or `impl-done`; source learner remained unchanged. `mme-final-fixture/` retains the exact implementation, reports and FAIL receipt.

MME's last native state was **spec-done / verified**, learner evaluating, non-mastered. The private tree was subsequently reset to a separate synthetic OpenClaw case; the MME halt snapshot is preserved before that reset.

A distinct supervisor-only recovery case interrupted foreground polling after it published one request, inspected pending status, explicitly blocked it, inspected blocked status, explicitly resumed, and inspected resumed status. It never dispatched a model or advanced a phase. Its wrapper received SIGINT (exit -2); ledger/request artifacts and authority hashes show the pending request was preserved and the lease released. This is recovery-control evidence, not the live five-phase or autonomy proof. Autonomy stayed disabled; no enabling config was created.

## Entrypoint draft and remaining boundary

`intent/2026-10-15-mme-native-entrypoints/intent.md` is an **unaccepted draft**. It records the hyphen/colon registration mismatch and the direct source-preflight failure from the documented engine cwd without `PYTHONPATH` (`ModuleNotFoundError: engines`). It names runtime recommendation/outbox/parser consumers and pinned tests. Positive native calls here supplied a documented QA accommodation, so they do not prove a clean documented launch.

The Node-only default versus later three-language/HTTP benchmark contracts remains a **source warning**; those later phases were not executed and no failure is attributed to them. No extra languages or HTTP surface were added to force a pass.

## C25 replay interface

New source recipe:

```text
<configured-python> intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/agent-runtime-openclaw.py --source-root <complete-candidate-root> --output-dir <NEW-output-directory> --timeout 30
```

It uses the invoking interpreter for inner CLIs; creates a full temporary copy excluding Git metadata, dependency/build/runtime output and local secrets; verifies private module root and relevant internal symlinks; seeds through existing `phase_plan`/`save_status` APIs; executes every case afresh; retains synthetic inputs, raw CLI output, status and digests; and removes its copy. It never loads an old report as a result. Stdout is one compact JSON object with `status`, `runtimeStatus`, `reportPath`; exits are 0 pass, 1 blocked, 2 unverified.

`openclaw-recipe-replay-v2/report.json` is exit 0, four cases passing, source learner unchanged, copy confirmed removed. `openclaw-recipe-missing-runtime/report.json` proves the exit-2 missing-runtime interface. An earlier recipe path-normalization false positive is retained in the original replay directory as harness history, not a product failure. The fix was resolving the temporary root before comparing `/var` and `/private/var` paths.

The actual CLI cases demonstrated gate/missing/undersized rejection, preview byte identity for the complete durable fixture, `spec → impl-done` after two bounded events, and continuation without a phase override to `cycle-complete` with `grade=simulate` / `advanced_by=openclaw-checklist`. The private managed tree also passed preview/full checklist after the MME experiment with a separately reset fixture. No canonical real learner was changed.

## Evidence and completion

`report.json` is the machine summary. `native-role-identities.json`, `native-traces-index.json` and `native-traces/` preserve independently locatable native contexts and tool execution, with thinking blocks removed and emails/keys redacted. Invocation JSON files retain exact argv, cwd, timing, exits, timeouts and authority hashes. `process-completion.json` confirms all eight native invocations were awaited, no running marker remains and no process matches their unique session IDs. The root must dispatch the final independent whole-feature verifier; this report supplies no whole-feature verdict.
