"""Isolated stdin/stdout verifiers must not import the canonical fsrs stack."""

from __future__ import annotations

import subprocess
import sys


def _run(script: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        check=False,
    )


def _assert_bridge_skips_canonical_stack(module: str) -> None:
    result = _run(
        f"""
import sys
import {module}
assert "fsrs" not in sys.modules
assert "learner.gate.canonical_gate" not in sys.modules
assert "learner.substrate.scheduling" not in sys.modules
"""
    )
    assert result.returncode == 0, result.stderr


def test_literacy_bridge_import_does_not_load_fsrs_or_canonical_gate() -> None:
    _assert_bridge_skips_canonical_stack("learner.gate.literacy_bridge")


def test_teaching_game_bridge_import_does_not_load_fsrs_or_canonical_gate() -> None:
    _assert_bridge_skips_canonical_stack("learner.gate.teaching_game_bridge")


def test_canonical_cli_still_depends_on_fsrs() -> None:
    """python3 -m learner.gate imports verifier -> canonical_gate -> fsrs."""
    result = _run(
        """
try:
    import learner.gate.verifier
    import sys
    assert "learner.gate.canonical_gate" in sys.modules
    assert "fsrs" in sys.modules
except ModuleNotFoundError as error:
    assert error.name == "fsrs"
"""
    )
    assert result.returncode == 0, result.stderr
