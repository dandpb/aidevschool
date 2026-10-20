"""Historical receipt identity and replay response must refer to the same event."""

from datetime import date
import hashlib
import json

from engines.minimaxDojo.core.fsrs_bridge import record_practice_conclusion
from engines.minimaxDojo.tests.test_fsrs_integration_e2e import build_fixture
from learner.substrate import validate
from learner.substrate.practice import transition_practice_conclusion
from learner.substrate.tests.test_practice_gate import load_practice, make_receipt, make_state


def test_replaying_an_older_conclusion_reports_its_own_rating(tmp_path):
    root = build_fixture(tmp_path)
    first_receipt = make_receipt(load_practice())
    first = record_practice_conclusion(first_receipt, today=date(2026, 10, 17), root=root, refresh=False)
    second_receipt = make_receipt(load_practice(), attempt=2, concluded_at="2026-10-18T12:00:00+00:00")
    second = record_practice_conclusion(second_receipt, today=date(2026, 10, 18), root=root, refresh=False)
    replay = record_practice_conclusion(first_receipt, today=date(2026, 10, 18), root=root, refresh=False)
    assert replay["state"] == second["state"]
    assert replay["card_after"] == second["card_after"]
    assert (replay["rating"], replay["outcome"]) == (first["rating"], first["outcome"])


def test_digest_bound_history_cannot_substitute_another_practice(tmp_path):
    practice = load_practice()
    state = transition_practice_conclusion(make_state(tmp_path), receipt=make_receipt(practice), practice=practice, today=date(2026, 10, 17), root=tmp_path)
    unit = state["units_log"][-1]
    path = tmp_path / unit["evidence_file"]
    receipt = json.loads(path.read_text())
    receipt.update(practice_id="pg-d02", content_version="pg-d02@synthetic")
    raw = json.dumps(receipt).encode()
    path.write_bytes(raw)
    digest = hashlib.sha256(raw).hexdigest()
    review = unit["reviews"][-1]
    review.update(evidence_digest=digest, evidence_attempt_digest=digest, evidence_run_id=f"sha256:{digest}")
    assert validate(state, tmp_path)
