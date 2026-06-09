# MINIMAXDOJO

## OVERVIEW

`minimaxDojo/` is the 14-agent tutoring core for the Agora Continuum: state machine,
empirical gates, prompts, docs, whiteboard, and governance.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Start using the dojo | `INDEX.md`, `docs/QUICK_START.md` | Orientation and entry flow. |
| Architecture | `README.md`, `docs/00_architecture.md` | High-level system model. |
| Agent contracts | `agents/*/`, `prompts/per_agent/` | Keep persona and prompt changes aligned. |
| State machine | `docs/02_state_machine.md`, `core/state_machine/` | Docs are canonical; core is spec surface. |
| Empirical gates | `docs/04_empirical_gates.md`, `core/gates/` | Verification threshold source. |
| Learner config | `config/learner.yaml` | Local tutor-core defaults and thresholds. |
| Whiteboard | `whiteboard/` | Local profile, trail, event log, decisions. |

## CONVENTIONS

- The root `learner/` remains the ecosystem-wide source of truth; this engine's `whiteboard/`
  is the tutor-core operating model and must not silently fork global learner state.
- `core/`, `src/`, `tests/`, `exercises/`, and `reports/` are mostly spec/reserved surfaces unless
  files inside them say otherwise.
- Agent changes usually require touching both `agents/<id>/` and `prompts/per_agent/<name>.md`.
- Event/log artifacts are audit records. Append when recording new events; do not rewrite history
  unless explicitly correcting a bad local note.
- Prometor/verifier closes gates; content-producing agents do not.

## ANTI-PATTERNS

- Do not mark a unit `mastered` because the prose looks convincing.
- Do not let Socrates-style help skip the learner's attempt and exact confusion point.
- Do not change gate thresholds without checking `docs/04_empirical_gates.md` and
  `config/learner.yaml` together.
