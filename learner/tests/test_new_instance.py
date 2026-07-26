"""Tests for new_instance — gap-#4 trivial replication."""
from __future__ import annotations

import shutil
from pathlib import Path

import yaml

from learner.new_instance import create_instance

REPO = Path(__file__).resolve().parents[2]
CANONICAL = REPO / "learner" / "learning_state.yaml"


def test_new_instance_resets_progress_and_backs_up(tmp_path):
    state_path = tmp_path / "learning_state.yaml"
    shutil.copy2(CANONICAL, state_path)  # seed with Daniel's state

    before = yaml.safe_load(state_path.read_text())
    assert before["learner"]["id"] == "daniel-barreto"
    assert len(before.get("units_log", [])) > 0  # has inherited mastery

    result = create_instance("Jane Doe", "jane-doe", "TypeScript", state_path)

    after = yaml.safe_load(state_path.read_text())
    assert after["learner"]["id"] == "jane-doe"
    assert after["learner"]["name"] == "Jane Doe"
    assert after["units_log"] == []  # no inherited mastery
    assert after["streak"]["current"] == 0
    assert after["active_unit"]["state"] == "idle"
    assert Path(result["backup"]).is_file()  # backup of previous state
    backup = yaml.safe_load(Path(result["backup"]).read_text())
    assert backup["learner"]["id"] == "daniel-barreto"  # backup is the old state


def test_template_has_required_fields(tmp_path):
    state_path = tmp_path / "fresh.yaml"
    create_instance("Test", "test-id", "Go", state_path)
    state = yaml.safe_load(state_path.read_text())
    assert state["version"] == 2
    assert "state_machine" in state
    assert "empirical_gates" in state
    assert state["learner"]["active_language"] == "Go"
