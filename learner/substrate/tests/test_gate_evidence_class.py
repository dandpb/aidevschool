"""Evidence class labels survive a verified gate transition."""

from datetime import date
from pathlib import Path

import pytest
import yaml

from learner.gate.no_code import verify_and_gate_no_code
from learner.gate.tests.test_no_code_gate import TODAY, make_no_code_root
from learner.substrate import load_canonical, validate
from learner.substrate.gate import transition_gate
from learner.substrate.tests.test_gate import make_receipt, make_state


@pytest.mark.parametrize("legacy_gate", [False, True])
def test_no_code_success_names_its_evidence_class(tmp_path: Path, legacy_gate: bool) -> None:
    env = make_no_code_root(tmp_path)
    if legacy_gate:
        env["state"]["active_unit"]["empirical_gate"] = {
            "require_executable_evidence": True,
            "min_coverage": 0.0,
            "mutation_min": 0.0,
        }
        env["state_path"].write_text(yaml.safe_dump(env["state"]), encoding="utf-8")

    decision = verify_and_gate_no_code(
        tmp_path, env["evidence_path"], receipt_path=env["receipt_path"], today=TODAY,
    )
    assert decision.ok, decision.errors
    assert decision.passed
    state = load_canonical(env["state_path"])
    assert state["active_unit"]["empirical_gate"] == {"require_executable_evidence": False}
    assert "independently verified no-code evidence" in state["next_action"]["action"]
    assert state["units_log"][0]["reviews"][-1]["gate_kind"] == "no_code"
    assert validate(state, tmp_path) == []


def test_code_success_retains_executable_evidence_contract(tmp_path: Path) -> None:
    original = make_state(tmp_path)
    state = transition_gate(
        original, receipt=make_receipt(), passed=True, gate_outcome="pass_first_try",
        rating="good", today=date(2026, 7, 11), root=tmp_path,
    )
    assert state["active_unit"]["empirical_gate"] == original["active_unit"]["empirical_gate"]
    assert "mastered with executable evidence" in state["next_action"]["action"]
