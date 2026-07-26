"""Tests for the independent no-code literacy verifier (shipped API)."""

from __future__ import annotations

import json
import re
from pathlib import Path
import pytest

from learner.gate.literacy_bridge import verify_stream

from learner.gate.literacy_verifier import (
    DETERMINISTIC_ACTIVITY_TYPES,
    VERIFIER_SOURCE,
    load_literacy_evidence,
    main as literacy_cli_main,
    verify_literacy_evidence,
    write_literacy_receipt,
)

REPO_ROOT = Path(__file__).resolve().parents[3]

def make_record(**overrides):
    base = {
        "schemaVersion": 1,
        "source": "literacydojo",
        "attemptId": "att-000001",
        "lessonId": "l02",
        "lessonVersion": 3,
        "activityId": "l02-a1",
        "activityType": "output_comparison",
        "skillIds": ["entender", "avaliar"],
        "deterministicChecks": {
            "betterOutputId": True,
            "c-fontes": True,
            "c-limites": True,
            "noExtraCriteria": 0,
        },
        "score": 1.0,
        "pass": True,
        "timestamp": "2026-07-25T12:00:00.000Z",
        "verifierRequired": True,
        "answer": {
            "outputId": "out-b",
            "criterionIds": ["c-fontes", "c-limites"],
        },
        "context": "initial",
    }
    base.update(overrides)
    return base


def test_valid_pass_record_yields_pass_and_mastery_eligible():
    verdict = verify_literacy_evidence(make_record())
    assert verdict.verdict == "PASS"
    assert verdict.passed is True
    assert verdict.independent_pass is True
    assert verdict.mastery_eligible is True
    assert verdict.context_isolated is True
    assert verdict.source == VERIFIER_SOURCE
    assert len(verdict.evidence_digest) == 64
    assert verdict.errors == ()
    receipt = verdict.to_receipt_dict()
    assert receipt["producer_writes_mastered"] is False
    assert receipt["max_producer_claim"] == "completed"


def test_missing_evidence_fails_closed():
    verdict = verify_literacy_evidence(None)
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert "missing evidence" in verdict.errors


def test_invalid_envelope_fails_closed():
    verdict = verify_literacy_evidence({"source": "literacydojo", "pass": True})
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("missing required field" in e for e in verdict.errors)


def test_wrong_source_fails_closed():
    verdict = verify_literacy_evidence(make_record(source="pixelquest"))
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False


def test_verifier_required_must_be_true():
    verdict = verify_literacy_evidence(make_record(verifierRequired=False))
    assert verdict.verdict == "FAIL"
    assert any("verifierRequired" in e for e in verdict.errors)


def test_inconsistent_pass_claim_fails():
    verdict = verify_literacy_evidence(
        make_record(**{"pass": True, "score": 0.2})
    )
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("score" in e for e in verdict.errors)


def test_honest_fail_is_valid_envelope_but_not_mastery():
    verdict = verify_literacy_evidence(
        make_record(
            **{
                "pass": False,
                "score": 0.2,
                "deterministicChecks": {
                    "betterOutputId": False,
                    "c-fontes": False,
                    "c-limites": False,
                    "noExtraCriteria": 0,
                },
                "answer": {"outputId": "out-a", "criterionIds": []},
            }
        )
    )
    assert verdict.verdict == "FAIL"
    assert verdict.independent_pass is False
    assert verdict.mastery_eligible is False
    assert verdict.producer_pass_claim is False
    assert verdict.errors == ()


def test_application_activity_never_mastery_eligible():
    verdict = verify_literacy_evidence(
        make_record(
            activityType="application_report",
            **{
                "pass": True,
                "score": 1.0,
                "deterministicChecks": {"reported": True},
            },
        )
    )
    assert verdict.verdict == "FAIL"
    assert verdict.independent_pass is False
    assert verdict.mastery_eligible is False


def test_fabricated_checks_cannot_mint_independent_pass():
    verdict = verify_literacy_evidence(
        make_record(deterministicChecks={"fabricated": True})
    )
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("deterministicChecks" in error for error in verdict.errors)


def test_altered_answer_is_recomputed_and_rejected():
    verdict = verify_literacy_evidence(
        make_record(answer={"outputId": "out-a", "criterionIds": []})
    )
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert {"deterministicChecks", "score", "pass"} <= {
        field
        for field in ("deterministicChecks", "score", "pass")
        if any(field in error for error in verdict.errors)
    }


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("lessonId", "l99", "canonical lesson"),
        ("lessonVersion", 999, "lessonVersion"),
        ("activityId", "l02-a99", "activityId"),
        ("activityType", "choice", "activityType"),
        ("skillIds", ["avaliar"], "skillIds"),
    ],
)
def test_canonical_identity_mismatch_fails_closed(field, value, message):
    verdict = verify_literacy_evidence(make_record(**{field: value}))
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any(message in error for error in verdict.errors)


def test_prompt_builder_fails_closed_without_persisting_free_text():
    record = make_record(
        lessonId="l05",
        lessonVersion=2,
        activityId="l05-a1",
        activityType="prompt_builder",
        skillIds=["pedir"],
        deterministicChecks={"objetivo": True},
    )
    record.pop("answer")
    verdict = verify_literacy_evidence(record)
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("free text" in error for error in verdict.errors)


def test_free_text_in_checks_fails_closed():
    verdict = verify_literacy_evidence(
        make_record(deterministicChecks={"note": "x" * 250})
    )
    assert verdict.verdict == "FAIL"
    assert any("free text" in e for e in verdict.errors)


def test_load_and_write_roundtrip(tmp_path: Path):
    evidence_path = tmp_path / "evidence.json"
    evidence_path.write_text(json.dumps(make_record()), encoding="utf-8")
    loaded = load_literacy_evidence(evidence_path)
    verdict = verify_literacy_evidence(loaded)
    receipt_path = write_literacy_receipt(verdict, tmp_path / "receipt.json")
    raw = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert raw["verdict"] == "PASS"
    assert raw["mastery_eligible"] is True
    assert raw["producer_writes_mastered"] is False


def test_cli_pass_and_fail(tmp_path: Path, capsys):
    good = tmp_path / "good.json"
    good.write_text(json.dumps(make_record()), encoding="utf-8")
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


def test_producer_lesson_status_type_has_no_mastered():
    """Structural guard: LiteracyDojo LessonStatus union must not include mastered.

    Reads the shipped progress module source so a future addition of mastered
    to the producer type fails this independent check.
    """
    progress_path = (
        REPO_ROOT
        / "engines"
        / "literacyDojo"
        / "src"
        / "domain"
        / "progress.ts"
    )
    text = progress_path.read_text(encoding="utf-8")
    # The type alias line is the producer contract.
    assert 'export type LessonStatus = "locked" | "available" | "in_progress" | "completed";' in text
    # No assignment of mastered in domain progress.
    assert 'lessonStatus[id] = "mastered"' not in text
    assert 'status: "mastered"' not in text


def _shipped_activity_types_from_evaluation() -> set[str]:
    """Parse evaluateActivity switch cases from the real LiteracyDojo evaluator."""
    eval_path = (
        REPO_ROOT / "engines" / "literacyDojo" / "src" / "domain" / "evaluation.ts"
    )
    text = eval_path.read_text(encoding="utf-8")
    # Only the switch inside evaluateActivity (case "choice": ...).
    return set(re.findall(r'case\s+"([a-z_]+)":', text))


def _shipped_activity_types_from_schema() -> set[str]:
    """Parse activity type consts from curriculum/ai-literacy lesson schema."""
    schema_path = REPO_ROOT / "curriculum" / "ai-literacy" / "schemas" / "lesson.schema.json"
    text = schema_path.read_text(encoding="utf-8")
    return set(re.findall(r'"const":\s*"([a-z_]+)"', text)) & {
        "choice",
        "sort",
        "missing_context",
        "safety_classification",
        "prompt_builder",
        "output_comparison",
        "rubric_review",
    }


def test_deterministic_types_match_shipped_evaluator_and_schema():
    """Verifier type set must equal real content-contract / evaluation.ts types."""
    from_eval = _shipped_activity_types_from_evaluation()
    from_schema = _shipped_activity_types_from_schema()
    assert from_eval == DETERMINISTIC_ACTIVITY_TYPES
    assert from_schema == DETERMINISTIC_ACTIVITY_TYPES
    # Guard against invented types that previously blocked real curriculum.
    for invented in (
        "concept_match",
        "risk_ranking",
        "scenario_choice",
        "checklist",
    ):
        assert invented not in DETERMINISTIC_ACTIVITY_TYPES


def test_invented_activity_type_fails_closed():
    verdict = verify_literacy_evidence(
        make_record(activityType="concept_match", **{"pass": True, "score": 1.0})
    )
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("activityType" in e for e in verdict.errors)


def test_stdin_bridge_emits_one_closed_digest_bound_receipt():
    from io import StringIO

    source = StringIO(json.dumps(make_record()))
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
    from io import StringIO

    output = StringIO()

    assert verify_stream(StringIO(payload), output) == 1
    receipt = json.loads(output.getvalue())
    assert receipt["verdict"] == "FAIL"
    assert receipt["mastery_eligible"] is False


def test_stdin_bridge_does_not_accept_browser_process_or_path_controls():
    from io import StringIO

    record = make_record(command="rm", path="/etc/passwd")
    output = StringIO()

    assert verify_stream(StringIO(json.dumps(record)), output) == 1
    receipt = json.loads(output.getvalue())
    assert receipt["verdict"] == "FAIL"
    assert any("unknown field" in error for error in receipt["errors"])
