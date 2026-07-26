from __future__ import annotations

import pytest

from learner.gate.literacy_verifier import VERIFIER_SOURCE, verify_literacy_evidence
from learner.gate.tests.literacy_verifier_records import make_literacy_record


def test_valid_pass_record_yields_pass_and_mastery_eligible():
    verdict = verify_literacy_evidence(make_literacy_record())
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
    assert any("missing required field" in error for error in verdict.errors)


def test_wrong_source_fails_closed():
    verdict = verify_literacy_evidence(make_literacy_record(source="pixelquest"))
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False


def test_verifier_required_must_be_true():
    verdict = verify_literacy_evidence(make_literacy_record(verifierRequired=False))
    assert verdict.verdict == "FAIL"
    assert any("verifierRequired" in error for error in verdict.errors)


def test_inconsistent_pass_claim_fails():
    verdict = verify_literacy_evidence(
        make_literacy_record(**{"pass": True, "score": 0.2})
    )
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("score" in error for error in verdict.errors)


def test_honest_fail_is_valid_envelope_but_not_mastery():
    verdict = verify_literacy_evidence(
        make_literacy_record(
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
        make_literacy_record(
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
        make_literacy_record(deterministicChecks={"fabricated": True})
    )
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("deterministicChecks" in error for error in verdict.errors)


def test_altered_answer_is_recomputed_and_rejected():
    verdict = verify_literacy_evidence(
        make_literacy_record(answer={"outputId": "out-a", "criterionIds": []})
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
    verdict = verify_literacy_evidence(make_literacy_record(**{field: value}))
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any(message in error for error in verdict.errors)


def test_prompt_builder_fails_closed_without_persisting_free_text():
    record = make_literacy_record(
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
        make_literacy_record(deterministicChecks={"note": "x" * 250})
    )
    assert verdict.verdict == "FAIL"
    assert any("free text" in error for error in verdict.errors)
