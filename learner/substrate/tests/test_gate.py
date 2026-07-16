from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

import yaml

from learner.substrate.gate import (
    GateEvidenceReceipt,
    commit_gate_transition,
    transition_gate,
)


def make_state(tmp_path: Path) -> dict[str, Any]:
    attempt = tmp_path / "learner" / "attempts" / "attempt.md"
    attempt.parent.mkdir(parents=True, exist_ok=True)
    attempt.write_text("attempt", encoding="utf-8")
    evidence = tmp_path / "evidence.json"
    evidence.write_text(
        json.dumps(
            {
                "verifier": {
                    "verdict": "PASS",
                    "mutation_score": 0.65,
                    "coverage_core": 0.8,
                    "context_isolated": True,
                }
            }
        ),
        encoding="utf-8",
    )
    unit = {
        "id": "U-test",
        "project": "01_test",
        "title": "Test unit",
        "state": "evaluating",
        "retry_count": 0,
        "retry_limit": 3,
        "attempt_file": str(attempt),
        "evidence_file": str(evidence),
    }
    return {
        "version": 2,
        "system": "agora-continuum",
        "learner": {
            "id": "test",
            "level": "intermediate",
            "aidi": {
                "current": 0.2,
                "threshold_amber": 0.6,
                "threshold_red": 0.75,
                "measurement_source": "self_reported",
                "history": [],
            },
        },
        "empirical_gates": {
            "learning": {
                "requires_attempt_before_solution": True,
                "mastery_source": "executable_evidence",
            }
        },
        "active_unit": unit,
        "next_action": {"owner": "verifier", "action": "gate"},
        "units_log": [
            {
                "unit_id": unit["id"],
                "project": unit["project"],
                "mastered": False,
                "attempt_file": unit["attempt_file"],
                "evidence_file": unit["evidence_file"],
                "reviews": [],
            }
        ],
        "streak": {
            "current": 0,
            "longest": 0,
            "last_gate_date": None,
            "freezes": {"equipped": 2, "max": 2},
        },
    }


def make_receipt() -> GateEvidenceReceipt:
    return GateEvidenceReceipt(
        timestamp="2026-07-11T00:00:00Z",
        digest="a" * 64,
        run_id="run-test",
        attempt_id="learner/attempts/attempt.md",
        attempt_digest="b" * 64,
        scenario_id="scenario-test",
    )


def test_transition_gate_is_pure(tmp_path: Path) -> None:
    state = make_state(tmp_path)

    transitioned = transition_gate(
        state,
        receipt=make_receipt(),
        passed=True,
        gate_outcome="pass_first_try",
        rating="good",
        today=date(2026, 7, 11),
        root=tmp_path,
    )

    assert state["active_unit"]["state"] == "evaluating"
    assert transitioned["active_unit"]["state"] == "mastered"


def test_commit_gate_transition_writes_only_requested_path(tmp_path: Path) -> None:
    state = make_state(tmp_path)
    state_path = tmp_path / "learner" / "learning_state.yaml"
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(yaml.safe_dump(state, sort_keys=False), encoding="utf-8")

    transitioned = commit_gate_transition(
        state,
        receipt=make_receipt(),
        passed=False,
        gate_outcome="fail",
        rating="again",
        today=date(2026, 7, 11),
        path=state_path,
    )

    persisted = yaml.safe_load(state_path.read_text(encoding="utf-8"))
    assert transitioned["active_unit"]["retry_count"] == 1
    assert persisted["active_unit"]["retry_count"] == 1
