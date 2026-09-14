from __future__ import annotations

import copy
import json
from typing import Any

import pytest

from learner.gate.no_code_checklist import (
    VERIFIER_SOURCE,
    load_no_code_checklist,
    no_code_checklist_digest,
    verify_no_code_checklist,
)


def make_checklist(**overrides: Any) -> dict[str, Any]:
    checklist: dict[str, Any] = {
        "schema_version": 1,
        "source": "no-code-learner",
        "unit_id": "00_ai_in_practice",
        "attempt_id": "00_ai_in_practice-attempt-1",
        "checklist": [
            {
                "claim": "a IA afirmou que o concurso exige diploma superior",
                "verification": "verifiquei no edital oficial do concurso, seção 3.1, item b",
                "result": "confirmado",
            },
            {
                "claim": "a IA afirmou que o prazo de inscrição vai até 30/09",
                "verification": "verifiquei a data na página oficial do órgão organizador",
                "result": "refutado",
            },
            {
                "claim": "a IA afirmou que a taxa de inscrição é R$ 80",
                "verification": "verifiquei o valor no boleto emitido pela página oficial",
                "result": "confirmado",
            },
        ],
    }
    checklist.update(overrides)
    return checklist


def test_valid_checklist_passes_structurally_but_never_mastery() -> None:
    verdict = verify_no_code_checklist(make_checklist())

    assert verdict.verdict == "PASS"
    assert verdict.source == VERIFIER_SOURCE
    assert verdict.context_isolated is True
    assert len(verdict.evidence_digest) == 64
    assert verdict.items_total == 3
    assert verdict.items_confirmado == 2
    assert verdict.items_refutado == 1
    assert verdict.errors == ()
    # The golden rule: this PASS is structural only.
    assert verdict.mastery_eligible is False
    receipt = verdict.to_receipt_dict()
    assert receipt["mastery_eligible"] is False
    assert receipt["promoter_countersign_required"] is True
    assert receipt["producer_writes_mastered"] is False
    assert receipt["max_producer_claim"] == "completed"


def test_refuted_items_are_valid_falsification_outcomes() -> None:
    checklist = make_checklist()
    for item in checklist["checklist"]:
        item["result"] = "refutado"

    verdict = verify_no_code_checklist(checklist)

    assert verdict.verdict == "PASS"
    assert verdict.items_refutado == 3


def test_missing_or_non_object_checklist_fails_closed() -> None:
    missing = verify_no_code_checklist(None)
    assert missing.verdict == "FAIL"
    assert "missing checklist" in missing.errors
    assert missing.mastery_eligible is False

    not_object = verify_no_code_checklist([1, 2, 3])
    assert not_object.verdict == "FAIL"
    assert "checklist must be a JSON object" in not_object.errors


@pytest.mark.parametrize(
    "mutation",
    ["unknown_field", "missing_field", "bad_schema_version", "bad_source", "bad_unit"],
)
def test_envelope_must_stay_closed(mutation: str) -> None:
    checklist = make_checklist()
    if mutation == "unknown_field":
        checklist["verdict"] = "PASS"  # producer cannot embed a verdict
    elif mutation == "missing_field":
        checklist.pop("attempt_id")
    elif mutation == "bad_schema_version":
        checklist["schema_version"] = 2
    elif mutation == "bad_source":
        checklist["source"] = "literacydojo"
    else:
        # ADR-0004: the no-code gate never covers units 01-18.
        checklist["unit_id"] = "02_key_value_store"

    verdict = verify_no_code_checklist(checklist)

    assert verdict.verdict == "FAIL"
    assert verdict.errors


def test_too_few_items_fails_closed() -> None:
    checklist = make_checklist()
    checklist["checklist"] = checklist["checklist"][:2]

    verdict = verify_no_code_checklist(checklist)

    assert verdict.verdict == "FAIL"
    assert any("at least 3 items" in error for error in verdict.errors)


@pytest.mark.parametrize("field", ["claim", "verification", "result"])
def test_item_fields_are_closed_and_bounded(field: str) -> None:
    checklist = make_checklist()
    item = checklist["checklist"][0]
    if field == "claim":
        item["claim"] = "ok"
    elif field == "verification":
        item["verification"] = "confiei"
    else:
        item["result"] = "parece certo"
    checklist["checklist"][0] = item if field != "claim" else item

    verdict = verify_no_code_checklist(checklist)

    assert verdict.verdict == "FAIL"
    assert any(f"item 0 {field}" in error for error in verdict.errors)


def test_extra_item_key_fails_closed() -> None:
    checklist = make_checklist()
    checklist["checklist"][0]["confidence"] = "high"

    verdict = verify_no_code_checklist(checklist)

    assert verdict.verdict == "FAIL"
    assert any("item 0 must have exactly" in error for error in verdict.errors)


def test_duplicate_items_fail_closed() -> None:
    checklist = make_checklist()
    checklist["checklist"][1] = copy.deepcopy(checklist["checklist"][0])

    verdict = verify_no_code_checklist(checklist)

    assert verdict.verdict == "FAIL"
    assert any("duplicates" in error for error in verdict.errors)


def test_digest_is_stable_and_item_sensitive() -> None:
    original = make_checklist()
    altered = copy.deepcopy(original)
    altered["checklist"][0]["verification"] = "verifiquei em outra fonte oficial"

    assert no_code_checklist_digest(original) == no_code_checklist_digest(
        make_checklist()
    )
    assert no_code_checklist_digest(original) != no_code_checklist_digest(altered)


def test_load_rejects_unreadable_and_oversized_artifacts(tmp_path) -> None:
    from learner.gate.evidence_io import EvidenceParseError

    missing = tmp_path / "missing.json"
    with pytest.raises(EvidenceParseError):
        load_no_code_checklist(missing)

    broken = tmp_path / "broken.json"
    broken.write_text("{not json", encoding="utf-8")
    with pytest.raises(EvidenceParseError):
        load_no_code_checklist(broken)

    array = tmp_path / "array.json"
    array.write_text("[]", encoding="utf-8")
    with pytest.raises(EvidenceParseError):
        load_no_code_checklist(array)

    huge = tmp_path / "huge.json"
    huge.write_text("x" * 70000, encoding="utf-8")
    with pytest.raises(EvidenceParseError):
        load_no_code_checklist(huge)


def test_cli_exit_codes_and_receipt(tmp_path, capsys) -> None:
    from learner.gate.no_code_checklist import main, write_no_code_receipt

    artifact = tmp_path / "checklist.json"
    artifact.write_text(json.dumps(make_checklist()), encoding="utf-8")
    receipt_path = tmp_path / "receipt.json"

    assert main(["--evidence", str(artifact), "--write-receipt", str(receipt_path)]) == 0
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert receipt["verdict"] == "PASS"
    assert receipt["mastery_eligible"] is False
    assert receipt["promoter_countersign_required"] is True
    assert receipt["evidence_digest"] == no_code_checklist_digest(make_checklist())
    capsys.readouterr()  # drop the PASS receipt output before the FAIL run

    broken = tmp_path / "broken.json"
    broken.write_text("{}", encoding="utf-8")
    assert main(["--evidence", str(broken)]) == 1
    stdout_receipt = json.loads(capsys.readouterr().out)
    assert stdout_receipt["verdict"] == "FAIL"
    assert stdout_receipt["mastery_eligible"] is False

    missing = tmp_path / "nope.json"
    assert main(["--evidence", str(missing)]) == 1

    # The receipt writer round-trips the verdict dict atomically.
    verdict = verify_no_code_checklist(make_checklist())
    written = write_no_code_receipt(verdict, tmp_path / "sub" / "r2.json")
    assert json.loads(written.read_text(encoding="utf-8"))["verdict"] == "PASS"
