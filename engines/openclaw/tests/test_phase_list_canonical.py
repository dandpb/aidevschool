"""Regression guard: the openclaw cycle-phase list stays a closed set.

Audit ref: ``docs/TECH_DEBT_AUDIT_2026-07-08.md`` item 20 noted that
``scheduler.py`` template listed a nonexistent ``diagnostic`` phase that did
not exist in the actual state machine. At HEAD the openclaw ``Phase`` enum
contains exactly the six canonical cycle phases (``spec``, ``spec-done``,
``impl-done``, ``review-done``, ``benchmark-done``, ``cycle-complete``) and
no ``diagnostic`` value exists. The canonical state machine in
``learner/learning_state.yaml`` uses a different vocabulary (presentation
states: ``presenting``, ``practicing``, ``evaluating``, ``mastered``) — the
two are intentionally disjoint because they model different things.

This test pins both invariants:

1. The openclaw ``Phase`` enum is a closed, documented set.
2. The YAML's ``state_machine.learning_states`` + ``artifact_states`` does
   not contain ``diagnostic`` (or any other phantom state).

If a future change adds a phase to the openclaw cycle plan, the test fails
on the closed-set assertion — forcing an explicit update to the constant
list and a clear comment. If the YAML ever leaks a ``diagnostic`` state,
this test fails on the YAML-load assertion.
"""

from __future__ import annotations

import unittest
from pathlib import Path

import yaml


# Canonical cycle-phase vocabulary for the openclaw Phase enum. When the
# enum grows, this tuple must grow with it AND the comment explaining the
# change must call out the audit ref.
_OPENCLAW_CYCLE_PHASES: tuple[str, ...] = (
    "spec",
    "spec-done",
    "impl-done",
    "review-done",
    "benchmark-done",
    "cycle-complete",
)


def _learning_state_yaml() -> Path:
    return Path(__file__).resolve().parents[3] / "learner" / "learning_state.yaml"


class TestPhaseListCanonical(unittest.TestCase):
    """Openclaw cycle phases and YAML state machine are kept in sync (closed sets)."""

    def test_openclaw_phase_enum_is_closed_set(self) -> None:
        from engines.openclaw.runner.pipeline_status import Phase

        actual = tuple(p.value for p in Phase)
        self.assertEqual(
            actual,
            _OPENCLAW_CYCLE_PHASES,
            f"openclaw Phase enum drifted from the canonical cycle list. "
            f"Expected {_OPENCLAW_CYCLE_PHASES}, got {actual}. If this change "
            f"is intentional, update _OPENCLAW_CYCLE_PHASES in this test and "
            f"reference docs/TECH_DEBT_AUDIT_2026-07-08.md item 20.",
        )

    def test_no_diagnostic_phase_in_openclaw_enum(self) -> None:
        from engines.openclaw.runner.pipeline_status import Phase

        for member in Phase:
            self.assertNotIn(
                "diagnostic",
                member.value,
                f"openclaw Phase.{member.name} ({member.value!r}) contains "
                "'diagnostic' — the audit (item 20) flagged this as a "
                "nonexistent state. Keep the cycle phases a closed set.",
            )

    def test_no_diagnostic_phase_in_yaml_state_machine(self) -> None:
        """YAML's state_machine must not leak a ``diagnostic`` presentation state.

        The audit said the template listed a ``diagnostic`` phase that
        didn't exist in the actual state machine. This guard fails if the
        YAML ever re-introduces it.
        """
        state = yaml.safe_load(_learning_state_yaml().read_text(encoding="utf-8"))
        state_machine = state.get("state_machine", {})
        learning = list(state_machine.get("learning_states", []))
        artifact = list(state_machine.get("artifact_states", []))
        all_states = learning + artifact
        self.assertNotIn(
            "diagnostic",
            all_states,
            f"learner/learning_state.yaml state_machine leaked a 'diagnostic' "
            f"state: learning={learning}, artifact={artifact}. The audit "
            f"(item 20) flagged this as a nonexistent phase; remove it.",
        )

    def test_yaml_state_machine_is_closed_set(self) -> None:
        """The substrate's presentation states are a closed, documented set."""
        state = yaml.safe_load(_learning_state_yaml().read_text(encoding="utf-8"))
        state_machine = state.get("state_machine", {})
        learning = list(state_machine.get("learning_states", []))
        artifact = list(state_machine.get("artifact_states", []))

        # Canonical, ordered presentation states. The cycle-phase list in
        # ``_OPENCLAW_CYCLE_PHASES`` above is intentionally different — it
        # models the *cycle* (spec → impl → review → ...), this models the
        # *learner presentation* (presenting → mastered).
        expected_learning = ["presenting", "practicing", "evaluating", "mastered"]
        expected_artifact = ["producing", "verifying", "done"]

        self.assertEqual(
            learning,
            expected_learning,
            f"YAML state_machine.learning_states drifted: expected "
            f"{expected_learning}, got {learning}. Update the canonical list "
            f"in this test and reference the ADR / audit.",
        )
        self.assertEqual(
            artifact,
            expected_artifact,
            f"YAML state_machine.artifact_states drifted: expected "
            f"{expected_artifact}, got {artifact}. Update the canonical list "
            f"in this test and reference the ADR / audit.",
        )


if __name__ == "__main__":
    unittest.main()
