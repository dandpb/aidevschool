"""Negative cases at the existing evidence and attempt-validation seams."""

import hashlib
import json
from copy import deepcopy
from pathlib import Path

import pytest
import yaml

from curriculum._shared.evidence import inspect
from curriculum._shared.tests.test_verdict_fallback_chain import (
    ATTEMPT_REL, DEFAULT_RECORD, EVIDENCE_REL, PROJECT, write_chain,
)
from learner.gate.evidence_io import canonical_evidence_digest


def rewrite_record(root: Path, state: dict, record: dict) -> None:
    (root / EVIDENCE_REL).write_text(json.dumps(record), encoding="utf-8")
    digest = canonical_evidence_digest(record)
    state["units_log"][0]["reviews"][-1]["evidence_digest"] = digest
    path = root / "learner/verifier_receipts/u0.json"
    receipt = json.loads(path.read_text())
    receipt["evidence_digest"] = digest
    path.write_text(json.dumps(receipt), encoding="utf-8")


def save_state(root: Path, state: dict) -> None:
    (root / "learner/learning_state.yaml").write_text(yaml.safe_dump(state), encoding="utf-8")


@pytest.mark.parametrize("field", ["pass", "ts", "game"])
def test_incomplete_producer_record_never_authorizes_pass(tmp_path, field) -> None:
    write_chain(tmp_path)
    state = yaml.safe_load((tmp_path / "learner/learning_state.yaml").read_text())
    record = deepcopy(DEFAULT_RECORD)
    record.pop(field)
    rewrite_record(tmp_path, state, record)
    save_state(tmp_path, state)
    assert inspect(PROJECT, root=tmp_path).verdict.verdict == "UNKNOWN"


@pytest.mark.parametrize("value", [[], {}, "true", 1, None])
def test_non_boolean_producer_pass_never_authorizes_pass(tmp_path, value) -> None:
    write_chain(tmp_path)
    state = yaml.safe_load((tmp_path / "learner/learning_state.yaml").read_text())
    record = {**DEFAULT_RECORD, "pass": value}
    rewrite_record(tmp_path, state, record)
    save_state(tmp_path, state)
    assert not inspect(PROJECT, root=tmp_path).gate_ready


@pytest.mark.parametrize("kind", ["documentation", "symlink"])
def test_attempt_must_follow_the_canonical_path_contract(tmp_path, kind) -> None:
    write_chain(tmp_path)
    state = yaml.safe_load((tmp_path / "learner/learning_state.yaml").read_text())
    if kind == "documentation":
        relative = "docs/readme.txt"
        path = tmp_path / relative
        path.parent.mkdir(exist_ok=True)
        path.write_text("Synthetic documentation, not a learner attempt.")
    else:
        relative = "learner/attempts/alias.md"
        path = tmp_path / relative
        path.symlink_to(tmp_path / ATTEMPT_REL)
    unit = state["units_log"][0]
    unit["attempt_file"] = relative
    unit["reviews"][-1].update(
        evidence_attempt_id=relative,
        evidence_attempt_digest=hashlib.sha256(path.read_bytes()).hexdigest(),
    )
    save_state(tmp_path, state)
    assert inspect(PROJECT, root=tmp_path).verdict.verdict == "UNKNOWN"


@pytest.mark.parametrize("outcome", ["fail", "unknown", None])
def test_pass_receipt_cannot_override_a_nonpassing_gate(tmp_path, outcome) -> None:
    write_chain(tmp_path)
    state = yaml.safe_load((tmp_path / "learner/learning_state.yaml").read_text())
    state["units_log"][0]["reviews"][-1].update(gate_outcome=outcome, rating="again")
    save_state(tmp_path, state)
    assert inspect(PROJECT, root=tmp_path).verdict.verdict == "UNKNOWN"
