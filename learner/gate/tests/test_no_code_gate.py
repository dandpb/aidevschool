"""Canonical no-code gate (ADR-0004): promotion of AI Literacy units to mastered.

The independent literacy verifier (``learner.gate.literacy_verifier``) only
JUDGES evidence and emits a receipt; it never writes canonical state. These
tests prove the loop closes here: a declared ``gate_kind: no_code`` unit in
``evaluating`` state, with a written attempt and an independent receipt whose
``mastery_eligible`` is true, is promoted to ``mastered`` through
``commit_gate_transition`` — without mutation/coverage (the code gate) and
without the producer ever writing ``mastered``.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

import pytest
import yaml

from learner.gate.literacy_verifier import (
    VERIFIER_SOURCE,
    literacy_evidence_digest,
    verify_literacy_evidence,
)
from learner.gate.no_code import verify_and_gate_no_code
from learner.gate.tests.literacy_verifier_records import make_literacy_record
from learner.substrate import _AGENT_OWNERSHIP_ROLES, load_canonical, validate

REPO_ROOT = Path(__file__).resolve().parents[3]

TODAY = date(2026, 8, 13)


def make_no_code_root(tmp_path: Path, **record_overrides: Any) -> dict[str, Any]:
    """Build a minimal tmp ecosystem: corpus symlink, attempt, evidence, receipt, state."""
    (tmp_path / "curriculum").mkdir(parents=True, exist_ok=True)
    (tmp_path / "curriculum" / "ai-literacy").symlink_to(
        REPO_ROOT / "curriculum" / "ai-literacy", target_is_directory=True
    )

    attempt = tmp_path / "learner" / "attempts" / "U00-ai-literacy-l02-attempt-1.md"
    attempt.parent.mkdir(parents=True, exist_ok=True)
    attempt.write_text(
        "pedi à IA um resumo, recebi o texto, apliquei na lição l02.\n",
        encoding="utf-8",
    )

    record = make_literacy_record(**record_overrides)
    evidence_path = tmp_path / "learner" / "evidence" / "ai-literacy" / "l02-a1.json"
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(record), encoding="utf-8")

    verdict = verify_literacy_evidence(record, root=tmp_path)
    receipt_path = tmp_path / "learner" / "verifier_receipts" / "l02-a1.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(
        json.dumps(verdict.to_receipt_dict(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    unit = {
        "id": "U00-ai-literacy-l02",
        "project": "ai-literacy",
        "title": "AI Literacy l02 — pedir bem",
        "state": "evaluating",
        "retry_count": 0,
        "retry_limit": 3,
        "gate_kind": "no_code",
        "attempt_file": "learner/attempts/U00-ai-literacy-l02-attempt-1.md",
        "evidence_file": "learner/evidence/ai-literacy/l02-a1.json",
    }
    state = {
        "version": 2,
        "system": "agora-continuum",
        "learner": {
            "id": "test",
            "level": "beginner",
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
        "agent_ownership": {role: f"agent-{role}" for role in _AGENT_OWNERSHIP_ROLES},
        "units_log": [
            {
                "unit_id": unit["id"],
                "concept": unit["title"],
                "kind": "concept",
                "project": unit["project"],
                "mastered": False,
                "attempt_file": unit["attempt_file"],
                "evidence_file": unit["evidence_file"],
                "reviews": [{"date": date(2026, 8, 10), "event": "presented"}],
            }
        ],
        "streak": {
            "current": 0,
            "longest": 0,
            "last_gate_date": None,
            "freezes": {"equipped": 2, "max": 2},
        },
    }
    state_path = tmp_path / "learner" / "learning_state.yaml"
    state_path.write_text(yaml.safe_dump(state, sort_keys=False), encoding="utf-8")
    return {
        "state": state,
        "state_path": state_path,
        "evidence_path": evidence_path,
        "receipt_path": receipt_path,
        "record": record,
        "verdict": verdict,
    }


def test_no_code_unit_promotes_to_mastered_via_canonical_transition(tmp_path: Path):
    env = make_no_code_root(tmp_path)
    assert env["verdict"].mastery_eligible is True  # receipt says eligible

    decision = verify_and_gate_no_code(
        tmp_path,
        env["evidence_path"],
        receipt_path=env["receipt_path"],
        today=TODAY,
    )

    assert decision.ok, decision.errors
    assert decision.passed is True
    assert decision.gate_outcome == "pass_first_try"
    assert decision.rating == "good"

    persisted = load_canonical(env["state_path"])
    assert persisted["active_unit"]["state"] == "mastered"

    entry = persisted["units_log"][0]
    assert entry["mastered"] is True
    assert entry["gate_kind"] == "no_code"  # ADR-0004: the entry carries the label

    review = entry["reviews"][-1]
    assert review["event"] == "gate"
    assert review["gate_outcome"] == "pass_first_try"
    assert review["gate_kind"] == "no_code"
    assert review["evidence_verifier_source"] == VERIFIER_SOURCE
    assert review["evidence_digest"] == literacy_evidence_digest(env["record"])
    # The no-code class never touches the code-gate metrics.
    assert "mutation_score" not in review
    assert "coverage_core" not in review

    # The substrate invariant gate accepts the new evidence class end to end.
    assert validate(persisted, tmp_path) == []


def test_no_code_promotion_does_not_require_mutation_or_coverage(tmp_path: Path):
    """The receipt carries no mutation/coverage fields and promotion still works:
    proof the code gate (mutation >= 0.65, coverage >= 0.80) is not consulted."""
    env = make_no_code_root(tmp_path)
    receipt = json.loads(env["receipt_path"].read_text(encoding="utf-8"))
    assert "mutation_score" not in receipt
    assert "coverage_core" not in receipt

    decision = verify_and_gate_no_code(
        tmp_path,
        env["evidence_path"],
        receipt_path=env["receipt_path"],
        today=TODAY,
    )
    assert decision.ok and decision.passed


def test_no_code_promotion_rejects_ineligible_receipt(tmp_path: Path):
    """A receipt with mastery_eligible: false records a fail — never mastery."""
    env = make_no_code_root(tmp_path)
    receipt = json.loads(env["receipt_path"].read_text(encoding="utf-8"))
    receipt["mastery_eligible"] = False
    receipt["verdict"] = "FAIL"
    env["receipt_path"].write_text(json.dumps(receipt), encoding="utf-8")

    decision = verify_and_gate_no_code(
        tmp_path,
        env["evidence_path"],
        receipt_path=env["receipt_path"],
        today=TODAY,
    )
    assert decision.ok
    assert decision.passed is False
    assert decision.gate_outcome == "fail"
    assert decision.rating == "again"

    persisted = load_canonical(env["state_path"])
    assert persisted["active_unit"]["state"] != "mastered"
    assert persisted["units_log"][0]["mastered"] is False


def test_no_code_rejects_producer_claiming_mastery(tmp_path: Path):
    """A receipt with producer_writes_mastered: true is rejected fail-closed."""
    env = make_no_code_root(tmp_path)
    receipt = json.loads(env["receipt_path"].read_text(encoding="utf-8"))
    receipt["producer_writes_mastered"] = True
    env["receipt_path"].write_text(json.dumps(receipt), encoding="utf-8")

    decision = verify_and_gate_no_code(
        tmp_path,
        env["evidence_path"],
        receipt_path=env["receipt_path"],
        today=TODAY,
    )
    assert decision.ok is False
    assert any("producer_writes_mastered" in error for error in decision.errors)
    persisted = load_canonical(env["state_path"])
    assert persisted["active_unit"]["state"] == "evaluating"


def test_no_code_rejects_digest_mismatch(tmp_path: Path):
    """Receipt bound to different evidence is rejected (tamper resistance)."""
    env = make_no_code_root(tmp_path)
    receipt = json.loads(env["receipt_path"].read_text(encoding="utf-8"))
    receipt["evidence_digest"] = "0" * 64
    env["receipt_path"].write_text(json.dumps(receipt), encoding="utf-8")

    decision = verify_and_gate_no_code(
        tmp_path,
        env["evidence_path"],
        receipt_path=env["receipt_path"],
        today=TODAY,
    )
    assert decision.ok is False
    assert any("evidence_digest" in error for error in decision.errors)


def test_no_code_gate_rejects_code_units(tmp_path: Path):
    """The no-code gate refuses units without gate_kind: no_code — the two
    evidence classes never substitute for each other."""
    env = make_no_code_root(tmp_path)
    state = env["state"]
    del state["active_unit"]["gate_kind"]
    env["state_path"].write_text(yaml.safe_dump(state, sort_keys=False), encoding="utf-8")

    decision = verify_and_gate_no_code(
        tmp_path,
        env["evidence_path"],
        receipt_path=env["receipt_path"],
        today=TODAY,
    )
    assert decision.ok is False
    assert any("gate_kind" in error for error in decision.errors)
