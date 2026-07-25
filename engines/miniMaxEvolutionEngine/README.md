# miniMaxEvolutionEngine

The **runnable Claude Code orchestration motor** for AI DevSchool — the 5-phase software loop
(Spec → Implement → Review → Benchmark → Optimize) plus an adversarial verifier and the learning
gate, implemented as `.claude/` subagents and `/devschool-*` slash commands.

This engine implements the **same protocol** as `engines/minimaxDojo/`, on a different platform:
minimaxDojo is the prompt/spec layer for the MiniMax Agent Team; this engine is the Claude Code
motor. The main Claude Code loop is the Orchestrator — it delegates to subagents and runs the
verifier gate between phases; it never writes implementation code itself.

## Run it

```text
1. Open Claude Code rooted at this directory (engines/miniMaxEvolutionEngine/).
2. /devschool-status      # see the YAML-first pipeline status + learning gate
3. /devschool-diagnose    # if the gate is blocked, run the diagnostic (sonda)
4. /devschool-cycle       # run the full 5-phase loop once unblocked
```

Before any commit: run `/simplify` on the diff, apply the recommendations, then commit.

### Local supervisor

Run supervisor commands from the repository root:

```bash
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor status
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor tick
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor poll --interval-seconds 5
```

`status` is read-only. It reports the canonical project, phase, active unit, selected action, pending
request, lease, retry count, blocker, and latest ledger result. Start there after every interruption;
the reported `action` and `reason` identify whether to wait, resolve pending work, reconcile an
already-advanced phase, or repair canonical state.

`tick` performs one leased reconciliation/decision and publishes at most one supervised phase
request. It does not execute a model. `poll` repeats that boundary in the foreground, rereads
canonical YAML every iteration, and backs off while semantic state is unchanged. Both commands
preserve `learner/learning_state.yaml`; project completion never grants mastery.

#### Execution modes

- **Supervised:** the default `tick` or `poll` writes one allowlisted request to
  `.mavis/school-supervisor/outbox/pending/`. An operator executes the producer and a fresh verifier,
  advances canonical phase state only after verifier PASS, and resolves the request explicitly.
- **Autonomous spec tracer:** `execute <request-id>` or `poll --autonomous` may consume one `spec`
  request only. Copy `autonomous.example.yaml` to the untracked
  `.mavis/school-supervisor/autonomous.yaml`, then explicitly set `enabled: true` and clear its kill
  switch. Configuration, role, tool, timeout, output, concurrency, and budget checks fail closed.
- **Emergency stop:** setting `AIDEVSCHOOL_AUTONOMOUS_KILL=1` prevents or cancels autonomous role
  execution. SessionStart never starts `tick`, `poll`, `execute`, or a model process.

Inspect configuration without dispatch:

```bash
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor autonomous-status
rtk python3 -m engines.miniMaxEvolutionEngine.supervisor poll --autonomous --config .mavis/school-supervisor/autonomous.yaml
```

#### Recovery

Operational history lives outside domain state in `.mavis/school-supervisor/ledger.ndjson`, with
pending, retired, and resolved request documents under `.mavis/school-supervisor/outbox/`. Do not
edit these files by hand.

- `reconcile` repairs an interrupted request whose outcome is already explained by canonical state
  and durable authorization; unexplained divergence blocks safely.
- `complete <request-id>` accepts supervised completion only after canonical phase advancement;
  `fail <request-id> --summary ...` and `block <request-id> --reason ...` preserve the phase.
- `abandon <request-id> --reason ...` retires a planned-but-unpublished request; `resume` clears a
  repaired phase blocker when no request is pending.
- `recover-lease` removes only an expired lease whose process no longer owns its lock. It never
  steals a live lease.

`SIGINT` and `SIGTERM` request a graceful stop instead of exiting in the signal handler. Interrupted
autonomous execution remains fail-closed for explicit operator recovery and is never redispatched
automatically.

Known limits are deliberate: this is a single-workspace, local foreground poll with cooperative
filesystem compare-and-swap, not a daemon, cloud schedule, distributed transaction, or mastery
authority. Autonomous execution is limited to `spec -> spec-done`; implementation, review,
benchmark, and optimization remain supervised until each has an enforceable command sandbox.

Run the isolated Slice 5 tracer with:

```bash
rtk python3 -m pytest engines/miniMaxEvolutionEngine/tests/test_supervisor_tracer.py
```

It fixture-verifies the real tick/outbox/lease/ledger/executor/reconciliation composition for one
autonomous `spec` advancement, learner and evidence boundaries, bounded verifier failure, and
restart recovery. Injected immutable role results make any real model subprocess invocation fail
the test immediately. These tests claim only the exercised local `spec` transition, foreground poll,
and explicit learner/evidence pauses; they do not certify cross-phase autonomy or learner mastery.

## Layout

| Path | Role |
| --- | --- |
| `CLAUDE.md` | The authoritative orchestrator doc (phases, gate, subagents, commands, model routing). |
| `AGENTS.md` | Terse "where to look" + conventions + anti-patterns. |
| `.claude/agents/*.md` | 17 subagent definitions. |
| `.claude/commands/devschool/*.md` | 18 `/devschool-*` slash commands + a `tests/` subdir. |
| `.claude/skills/agora-continuum/SKILL.md` | The learning-gate protocol skill. |
| `.claude/hooks/briefing.sh` | SessionStart hook (injects pipeline + gate state). |
| `supervisor/` | One-shot decision, outbox, lease, ledger, autonomous spec adapter, and foreground poll. |
| `autonomous.example.yaml` | Complete disabled-by-default local autonomous configuration example. |
| `.mavis/school-supervisor/` | Untracked operational ledger, lease, local config, and request lifecycle. |
| `curriculum/`, `learner/`, `docs/`, `.mavis/` | Symlinks to the shared root substrate — do not replace with copies. |

## Conventions

- `learner/pipeline_status.yaml` is the machine authority; Markdown is human narrative only and is
  never parsed as a fallback. The adapter reports the YAML source and never writes either file.
- Never advance the pipeline status before the verifier returns `PASS`.
- The verifier never shares the producer's context (anti-anchoring).
- Never replace the symlinks with copied directories — the root stays the source of truth.
- Recurring cloud schedules are billed — only create them with explicit user confirmation.

## Learn more

- Full reference: [`docs/handbook/06_engine_miniMaxEvolutionEngine.md`](../../docs/handbook/06_engine_miniMaxEvolutionEngine.md)
- Architecture & the two loops: [`docs/handbook/01_architecture.md`](../../docs/handbook/01_architecture.md)
