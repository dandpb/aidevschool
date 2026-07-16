# MINIMAXDOJO

## OVERVIEW

`minimaxDojo/` is the 14-agent tutoring core for the Agora Continuum: state machine,
empirical gates, prompts, docs, whiteboard, and governance. It is not the runnable dashboard.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Start using the dojo | `INDEX.md`, `docs/QUICK_START.md` | Orientation and entry flow. |
| Architecture | `README.md`, `docs/00_architecture.md` | High-level system model. |
| Agent roster and prompts | `agents/README.md`, `prompts/per_agent/` | Roster is an index; per-agent prompt files are canonical. |
| State machine | `docs/02_state_machine.md`, `core/state_machine/` | Docs are canonical; core is spec surface. |
| Empirical gates | `docs/04_empirical_gates.md`, `core/gates/` | Verification threshold source. |
| Learner config | `config/learner.yaml` | Single seam for numeric tutor-core thresholds. |
| Whiteboard | `whiteboard/` | Local profile, trail, event log, decisions. |
| Tests | `tests/` | Contract checks for config seam, gates, events, state machine. |

## CONVENTIONS

- The root `learner/` remains the ecosystem-wide source of truth; this engine's `whiteboard/`
  is the tutor-core operating model and must not silently fork global learner state.
- `core/` is executable reference code and `tests/` is its contract suite; `exercises/` and
  `reports/` remain reserved until local files define them.
- `prompts/per_agent/<name>.md` is the canonical prompt; `agents/README.md` is only the roster.
- Prompts and docs must reference numeric thresholds with `⟨config: path⟩`; do not hardcode values
  that live in `config/learner.yaml`.
- Event/log artifacts are audit records. Append when recording new events; do not rewrite history
  unless explicitly correcting a bad local note.
- Prometor/verifier closes gates; content-producing agents do not.

## COMMANDS

```bash
make test-core  # from the repository root
```

## ANTI-PATTERNS

- Do not mark a unit `mastered` because the prose looks convincing.
- Do not let Socrates-style help skip the learner's attempt and exact confusion point.
- Do not change gate thresholds without checking `docs/04_empirical_gates.md` and
  `config/learner.yaml` together.
- Do not duplicate prompt bodies inside `agents/README.md`.
