"""AID-3710 F1 / AID-3736 — multi-record NDJSON x receipt-binding coverage.

HOLD PO 939e653f/748111cf: requiring verifier receipts for game-class mastery
must not block the documented Pixel EVIDENCE_CONTRACT artifact (one record per
attempt line; records for other units share the file). These tests pin the
restored contract WITHOUT touching the protected existing test file:

- selection: the gate grades the active unit's latest record;
- binding: the receipt binds that record's canonical digest, and the
  substrate's receipt-bound recheck accepts the multi-record file while it
  still contains the digest-matching record;
- anti-forgery: no receipt -> NOT ELIGIBLE (fail-closed, AID-3710 F1); a
  receipt over any other record's digest never satisfies the gate; a
  producer-embedded ``verifier`` block and a corrupt line stay rejected.

Helpers are imported from the sibling ``test_gate`` module (no package
``__init__``: pytest prepends this directory to ``sys.path``).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from learner.gate import verify_and_gate
from learner.gate.evidence_io import bound_evidence_violations
from learner.gate.security import canonical_evidence_digest
from learner.substrate import load_and_validate

import test_gate as tg

TODAY = tg.TODAY
OTHER_UNIT = {
    "unit_id": "U-02_key_value_store",
    "project": "02_key_value_store",
}


@pytest.fixture
def root(tmp_path: Path) -> Path:
    (tmp_path / "learner" / "attempts").mkdir(parents=True)
    (tmp_path / "learner" / "attempts" / "attempt-1.md").write_text(
        "# attempt", encoding="utf-8"
    )
    return tmp_path


def _write_state(root: Path, **unit_overrides) -> Path:
    state_path = root / "learner" / "learning_state.yaml"
    state_path.write_text(
        yaml.safe_dump(tg.make_state(root, **unit_overrides), sort_keys=False),
        encoding="utf-8",
    )
    return state_path


def _two_record_ndjson(root: Path) -> Path:
    return tg.write_ndjson(
        root / "evidence.ndjson",
        [tg.make_ndjson_record(**OTHER_UNIT), tg.make_ndjson_record()],
    )


class TestBoundEvidenceMultirecord:
    def test_matching_record_backs_the_review(self, root: Path):
        active = tg.make_ndjson_record()
        path = _two_record_ndjson(root)
        digest = canonical_evidence_digest(active)
        assert bound_evidence_violations(path, digest, root) == []

    def test_no_matching_record_is_rejected(self, root: Path):
        path = tg.write_ndjson(
            root / "evidence.ndjson",
            [tg.make_ndjson_record(encounter_id="encounter-other")],
        )
        digest = canonical_evidence_digest(tg.make_ndjson_record())
        violations = bound_evidence_violations(path, digest, root)
        assert any("does not match the canonical digest" in v for v in violations)

    def test_matching_record_with_embedded_verifier_block_is_rejected(
        self, root: Path
    ):
        # "verifier" is excluded from the canonical digest, so the explicit
        # block check is what catches a producer-embedded verdict.
        active = tg.make_ndjson_record(verifier={"verdict": "PASS"})
        path = tg.write_ndjson(root / "evidence.ndjson", [active])
        digest = canonical_evidence_digest(active)
        violations = bound_evidence_violations(path, digest, root)
        assert any("producer-controlled 'verifier' block" in v for v in violations)

    def test_corrupt_line_is_rejected(self, root: Path):
        path = root / "evidence.ndjson"
        path.write_text(
            json.dumps(tg.make_ndjson_record()) + "\nnot-json\n", encoding="utf-8"
        )
        digest = canonical_evidence_digest(tg.make_ndjson_record())
        violations = bound_evidence_violations(path, digest, root)
        assert any("is not parseable JSON or NDJSON" in v for v in violations)


class TestMultirecordEndToEnd:
    def test_gates_latest_matching_record_with_receipt(self, root: Path):
        # Selection + binding together: other-unit records are ignored, the
        # active unit's latest record gates to mastery on its digest-bound
        # receipt, and the persisted review records that record's timestamp.
        ndjson_path = root / "evidence.ndjson"
        state_path = _write_state(root, evidence_file=str(ndjson_path))
        active = tg.make_ndjson_record()
        path = tg.write_ndjson(
            ndjson_path, [tg.make_ndjson_record(**OTHER_UNIT), active]
        )
        receipt_path = tg.write_verifier_receipt(root, active)
        decision = verify_and_gate(
            root, path, today=TODAY, verifier_receipt_path=receipt_path
        )
        assert decision is not None and decision.ok and decision.passed

        persisted = yaml.safe_load(state_path.read_text(encoding="utf-8"))
        assert persisted["active_unit"]["state"] == "mastered"
        gate_review = persisted["units_log"][-1]["reviews"][-1]
        assert gate_review["evidence_ts"] == active["ts"]

    def test_persisted_multirecord_state_revalidates(self, root: Path):
        ndjson_path = root / "evidence.ndjson"
        state_path = _write_state(root, evidence_file=str(ndjson_path))
        path = _two_record_ndjson(root)
        receipt_path = tg.write_verifier_receipt(root, tg.make_ndjson_record())
        decision = verify_and_gate(
            root, path, today=TODAY, verifier_receipt_path=receipt_path
        )
        assert decision is not None and decision.ok and decision.passed
        assert load_and_validate(state_path)["active_unit"]["state"] == "mastered"

    def test_multirecord_without_receipt_is_not_eligible(self, root: Path):
        # AID-3710 F1 fail-closed: multi-record shape does not soften the
        # receipt requirement, and other-unit records never satisfy the gate.
        state_path = _write_state(root)
        original = state_path.read_text(encoding="utf-8")
        path = _two_record_ndjson(root)
        decision = verify_and_gate(root, path, today=TODAY)
        assert decision is not None and not decision.ok
        assert any("digest-bound verifier receipt" in e for e in decision.errors)
        assert state_path.read_text(encoding="utf-8") == original

    def test_multirecord_receipt_for_other_unit_record_is_not_eligible(
        self, root: Path
    ):
        # The receipt must bind the gated (active-unit) record — a receipt
        # over any other record in the file never satisfies the gate.
        state_path = _write_state(root)
        original = state_path.read_text(encoding="utf-8")
        other = tg.make_ndjson_record(**OTHER_UNIT)
        path = tg.write_ndjson(root / "evidence.ndjson", [other, tg.make_ndjson_record()])
        receipt_path = tg.write_verifier_receipt(root, other)
        decision = verify_and_gate(
            root, path, today=TODAY, verifier_receipt_path=receipt_path
        )
        assert decision is not None and not decision.ok
        assert any("evidence_digest does not match" in e for e in decision.errors)
        assert state_path.read_text(encoding="utf-8") == original
