# Intent: align miniMax native command names and documented launch directory

Author: C22 product-readiness runtime observation, explicit root operator request · Change-id: 2026-10-15-mme-native-entrypoints · Status: draft

## Problem

An operator following the miniMaxEvolutionEngine README opens Claude Code in the engine directory and is told to run `/devschool-status`, `/devschool-diagnose` and `/devschool-cycle`. On the observed Claude Code 2.1.301 runtime, the native initialization record registers `devschool:status`, `devschool:diagnose`, `devschool:cycle` and the other directory-qualified commands. No hyphen form is registered. A real `/devschool-status` request returned exit 0, but the model explicitly reported that the command was not installed and read the YAML files manually. This is a semantic entrypoint failure, not a nonzero CLI exit.

The runtime recommendation is also emitted by `os_adapter.py:63` and the SessionStart hook. Supervised outbox requests in `supervisor/plans.py:11-27` carry the hyphen names. Current tests pin those strings, so changing only the README would leave the runtime recommendations inconsistent.

There is a separate launch-directory issue: the slash-command preflight in `.claude/commands/devschool/status.md:7` runs `python3 -m engines.miniMaxEvolutionEngine.os_adapter`. From the documented engine cwd, with `PYTHONPATH` absent, that command returns exit 1 with `ModuleNotFoundError: No module named 'engines'`. The SessionStart hook already resolves the repository root; the slash-command preflight does not. The positive QA native sessions explicitly supplied `PYTHONPATH=<disposable repository root>`; they do not prove a clean documented launch works.

Current evidence is retained under `.scratch/readiness-implementation-20261015/qa-mme/`: `mme-native-status.stdout` contains the actual registered-command inventory and unavailable-hyphen response; `mme-native-colon-status.stdout` contains the positive colon request; `mme-documented-cwd-preflight.json` contains the clean-cwd import failure; `mme-hyphen-references.txt` lists the consumers. Source anchor: `0a2e2dbeda5e41b00642a5280e40a0d8102d1102`, plus the separately recorded candidate gate carry set. No fix was made during QA.

## Proposed outcome

Following the documented local launch path resolves the actual installed commands and reads canonical status successfully without an undocumented `PYTHONPATH` accommodation. The status adapter, hook, command-to-command recommendations and supervised outbox use one consistent naming contract. Existing independent-verifier, learning-gate, provenance and recovery semantics continue to apply.

## Affected users and systems

- miniMax operators using the README and `docs/handbook/06_engine_miniMaxEvolutionEngine.md`.
- `engines/miniMaxEvolutionEngine/CLAUDE.md`, command descriptions, role/skill recommendations and `.claude/hooks/briefing.sh`.
- Runtime consumers `os_adapter.py`, `supervisor/plans.py`, and `supervisor/autonomous.py:77` (which currently derives the source filename with `removeprefix('/devschool-')`).
- Tests in `tests/test_os_adapter.py`, `tests/test_supervisor.py`, `tests/test_supervisor_lifecycle.py` and command/provenance contract tests that intentionally pin naming.

## Constraints

- This is an unaccepted intent draft; no implementation, protected-test edit, commit, push, deployment or PR is authorized by this file.
- Keep the existing source command bodies, roles, model routing, separate verifier contexts, learning gate and disabled-by-default autonomy. Do not add cross-phase autonomy or automatic redispatch.
- Treat durable `advanced_by` values as provenance compatibility data: decide their migration separately from displayed command names.
- Preserve YAML authority and internal substrate symlinks. Prove both repository-root and documented engine-cwd launches using actual native command registration and execution.
- The generated synthetic spec/implementation FAILs observed during C22 are evidence of the independent gate refusing bad artifacts. They are not evidence of an engine defect and are outside this intent.

## Open questions

1. Normalize recommendations/outbox to the installed colon names, or deliberately register compatibility aliases? Choose one contract before changing source or pinned tests.
2. Should existing outbox records and `advanced_by=/devschool-*` provenance remain readable without rewriting history?
3. Which shared root-resolution helper should command preflights use so the documented cwd requires no environment workaround?
4. Which bounded native probe will fail before the fix and pass after it, while retaining a fresh verifier and preserving real learner state?
