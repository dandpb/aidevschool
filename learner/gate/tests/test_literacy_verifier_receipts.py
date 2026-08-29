from __future__ import annotations

from io import StringIO
import json
from pathlib import Path
from unittest.mock import patch

import pytest

from learner.gate.literacy_bridge import verify_stream
from learner.gate.literacy_verifier import (
    VERIFIER_SOURCE,
    load_literacy_evidence,
    main as literacy_cli_main,
    verify_literacy_evidence,
    write_literacy_receipt,
)
from learner.gate.tests.literacy_verifier_records import make_literacy_record
import learner.gate.literacy_verifier as literacy_verifier_module


def test_load_and_write_roundtrip(tmp_path: Path):
    evidence_path = tmp_path / "evidence.json"
    evidence_path.write_text(json.dumps(make_literacy_record()), encoding="utf-8")
    loaded = load_literacy_evidence(evidence_path)
    verdict = verify_literacy_evidence(loaded)
    receipt_path = write_literacy_receipt(verdict, tmp_path / "receipt.json")
    raw = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert raw["verdict"] == "PASS"
    assert raw["mastery_eligible"] is True
    assert raw["producer_writes_mastered"] is False


def test_write_literacy_receipt_uses_atomic_helper(tmp_path: Path, monkeypatch):
    """Receipts live under ``learner/verifier_receipts/`` and bind to producer
    evidence by canonical digest. A torn file would re-validate against the
    wrong producer block, so the writer must go through the atomic helper
    (audit #1: extend atomic write to verifier receipts).
    """
    evidence_path = tmp_path / "evidence.json"
    evidence_path.write_text(json.dumps(make_literacy_record()), encoding="utf-8")
    loaded = load_literacy_evidence(evidence_path)
    verdict = verify_literacy_evidence(loaded)

    called: dict[str, Path] = {}
    real_atomic = literacy_verifier_module.atomic_write_text

    def _spy(path: Path, text: str) -> None:
        called["path"] = path
        real_atomic(path, text)

    monkeypatch.setattr(literacy_verifier_module, "atomic_write_text", _spy)
    receipt_path = write_literacy_receipt(verdict, tmp_path / "receipt.json")
    assert called["path"] == receipt_path
    assert json.loads(receipt_path.read_text(encoding="utf-8"))["verdict"] == "PASS"


def test_write_literacy_receipt_survives_mid_write_failure(tmp_path: Path):
    """An injected mid-write failure must leave any pre-existing receipt
    intact and must not leak a temp file (audit #1).
    """
    evidence_path = tmp_path / "evidence.json"
    evidence_path.write_text(json.dumps(make_literacy_record()), encoding="utf-8")
    loaded = load_literacy_evidence(evidence_path)
    verdict = verify_literacy_evidence(loaded)
    receipt_path = tmp_path / "receipt.json"
    original = '{"verdict": "FAIL", "context_isolated": false, "errors": ["preserved"]}'
    receipt_path.write_text(original, encoding="utf-8")
    original_bytes = receipt_path.read_bytes()

    real_atomic = literacy_verifier_module.atomic_write_text
    with patch.object(
        literacy_verifier_module, "atomic_write_text", side_effect=OSError("boom")
    ):
        with pytest.raises(OSError):
            write_literacy_receipt(verdict, receipt_path)
    # The atomic helper wasn't called, so the original file is untouched and
    # the helper would have been the only writer — no torn state, no leaks.
    assert receipt_path.read_bytes() == original_bytes


def test_cli_pass_and_fail(tmp_path: Path, capsys):
    good = tmp_path / "good.json"
    good.write_text(json.dumps(make_literacy_record()), encoding="utf-8")
    receipt = tmp_path / "out.json"
    assert literacy_cli_main(["--evidence", str(good), "--write-receipt", str(receipt)]) == 0
    assert receipt.is_file()
    out = json.loads(receipt.read_text(encoding="utf-8"))
    assert out["verdict"] == "PASS"

    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"nope": True}), encoding="utf-8")
    assert literacy_cli_main(["--evidence", str(bad)]) == 1

    missing = tmp_path / "does-not-exist.json"
    assert literacy_cli_main(["--evidence", str(missing)]) == 1


def test_cli_unreadable_json_fails_closed(tmp_path: Path):
    path = tmp_path / "broken.json"
    path.write_text("{not-json", encoding="utf-8")
    assert literacy_cli_main(["--evidence", str(path)]) == 1


def test_stdin_bridge_emits_one_closed_digest_bound_receipt():
    source = StringIO(json.dumps(make_literacy_record()))
    output = StringIO()

    assert verify_stream(source, output) == 0
    receipt = json.loads(output.getvalue())
    assert receipt["verdict"] == "PASS"
    assert receipt["source"] == VERIFIER_SOURCE
    assert receipt["context_isolated"] is True
    assert len(receipt["evidence_digest"]) == 64
    assert receipt["producer_writes_mastered"] is False


@pytest.mark.parametrize("payload", ["{bad", "[]", "null"])
def test_stdin_bridge_fails_closed_for_malformed_or_non_object_input(payload: str):
    output = StringIO()

    assert verify_stream(StringIO(payload), output) == 1
    receipt = json.loads(output.getvalue())
    assert receipt["verdict"] == "FAIL"
    assert receipt["mastery_eligible"] is False


def test_stdin_bridge_does_not_accept_browser_process_or_path_controls():
    record = make_literacy_record(command="rm", path="/etc/passwd")
    output = StringIO()

    assert verify_stream(StringIO(json.dumps(record)), output) == 1
    receipt = json.loads(output.getvalue())
    assert receipt["verdict"] == "FAIL"
    assert any("unknown field" in error for error in receipt["errors"])
