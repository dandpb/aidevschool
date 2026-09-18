Leia em português: [HARNESS-GUIDE.pt-BR.md](HARNESS-GUIDE.pt-BR.md)

# SDLC Quest v1.3 — execution, gates and evidence

## Integration status

Provided reference: https://github.com/dandpb/harness-toolkit
The repository could not be read in this revision. No API, command, license, format or guarantee of harness-toolkit was verified. The HTML and the runner are the Quest's own implementations, not a confirmed real integration.

## In-game use

1. Open the execution hub.
2. Try to jump straight to packaging or declare everything ready: the engine must refuse.
3. Discover: pick problem, outcome, scope and open question; run the gate.
4. Plan: pick the five criteria, including the negative ones; run it.
5. Implement: materialize a candidate. The original version contains a tenant bug.
6. Verify: run the full suite. Inspect baseline, candidate and mutant.
7. Fix the candidate for ID-and-tenant lookup; rerun implementation and verification.
8. Review: pick the current teaching opinion, with no blocker; run it.
9. Validate package: the five previous receipts must be current. Export the JSON.
10. Change the code after green and watch the receipts go stale. Production stays denied.

## What actually runs

The HTML runs local JavaScript functions over fictional data. The full suite produces 15 assertions across three versions. It must fail the baseline and the mutant, and approve the correct candidate. It calls no agents, GitHub, npm, CI or the toolkit.

In the source package, run: `node tools/quest-gate.cjs`. This own runner rebuilds the HTML, runs rules tests and browser journeys, and records logs, hashes and exit codes. It requires Node, Python, Playwright and Chromium; missing dependencies are failures, not approvals. Nothing is installed automatically.

## Proposed mapping; not a toolkit API

- tlc-discover → intent/decisions → input validation.
- tlc-plan → criteria/checks → matrix validation.
- tlc-implement → candidate review → verifier execution.
- the-judge → findings/opinion → pendings and the review link.
- External runner → logs/exit codes/identity → traceable execution evidence.
- Protected infra → identity/independent approval → merge/release authorization.

## To complete the real integration

Verify the repository's README, commit, license, executable, states, input/output formats and tests. Then implement an adapter over the interface actually found, without inferring commands. Validate missing step, failure/timeout, stale evidence, policy change, budget and executor unavailability. Check permissions outside the workspace.

## Limits

Completing steps does not prove the correctness of every requirement. Local JSON can be edited. The backup restores entries, not execution. There was no independent review. There is no production authorization. The local runner is not a sandbox and does not control an attacker with access to your files.
