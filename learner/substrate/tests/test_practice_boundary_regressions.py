"""Synthetic regressions for the scheduling receipt/commit boundary."""

from copy import deepcopy
from datetime import date
import hashlib
import json
from unittest.mock import patch

import pytest

from engines.minimaxDojo.core.fsrs_bridge import record_practice_conclusion
from engines.minimaxDojo.tests.test_fsrs_integration_e2e import build_fixture
from learner.substrate.practice import (
    PracticeReceiptError, bound_practice_receipt_violations,
    transition_practice_conclusion, verify_practice_conclusion,
)
from learner.substrate.tests.test_practice_gate import (
    load_practice, make_receipt, make_state,
)


def test_identical_conclusion_is_idempotent_for_card_and_receipt(tmp_path) -> None:
    root = build_fixture(tmp_path)
    path = root / "learner/learning_state.yaml"
    receipt = make_receipt(load_practice())
    first = record_practice_conclusion(deepcopy(receipt), today=date(2026, 10, 17), root=root, state_path=path, refresh=False)
    second = record_practice_conclusion(deepcopy(receipt), today=date(2026, 10, 17), root=root, state_path=path, refresh=False)
    assert first["state"] == second["state"]
    assert first["card_after"] == second["card_after"]
    assert len(list((root / "learner/practice_receipts").glob("*.json"))) == 1


def test_custom_state_root_never_refreshes_repo_canonical_views(tmp_path) -> None:
    root = build_fixture(tmp_path)
    with patch("learner.substrate.sync") as sync:
        record_practice_conclusion(make_receipt(load_practice()), today=date(2026, 10, 17), root=root, state_path=root / "learner/learning_state.yaml")
    sync.assert_not_called()


@pytest.mark.parametrize("field,value", [("schema", "arbitrary"), ("schema", None), ("version", 999), ("version", True)])
def test_declared_schema_and_version_are_required(field, value) -> None:
    practice = load_practice()
    receipt = make_receipt(practice, **{field: value})
    with pytest.raises(PracticeReceiptError):
        verify_practice_conclusion(receipt, practice)


@pytest.mark.parametrize("value", [[], {}, ["met"]])
def test_nontextual_assessment_verdict_has_typed_rejection(value) -> None:
    practice = load_practice()
    receipt = make_receipt(practice)
    receipt["assessments"][next(iter(receipt["assessments"]))]["verdict"] = value
    with pytest.raises(PracticeReceiptError):
        verify_practice_conclusion(receipt, practice)


@pytest.mark.parametrize("payload", [{}, {"schema": "arbitrary", "version": 999}])
def test_digest_alone_does_not_validate_receipt_shape(tmp_path, payload) -> None:
    path = tmp_path / "receipt.json"
    raw = json.dumps(payload).encode()
    path.write_bytes(raw)
    assert bound_practice_receipt_violations(path, hashlib.sha256(raw).hexdigest(), tmp_path)


def test_rejected_state_does_not_leave_a_receipt(tmp_path) -> None:
    practice = load_practice()
    state = make_state(tmp_path)
    state["learner"]["id"] = ""
    with pytest.raises(PracticeReceiptError):
        transition_practice_conclusion(state, receipt=make_receipt(practice), practice=practice, today=date(2026, 10, 17), root=tmp_path)
    assert list(tmp_path.rglob("*.json")) == []
