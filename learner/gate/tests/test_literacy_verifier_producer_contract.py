from __future__ import annotations

from learner.gate.literacy_verifier import verify_literacy_evidence
from learner.gate.tests.literacy_verifier_records import make_literacy_record


def test_invented_activity_type_fails_closed():
    verdict = verify_literacy_evidence(
        make_literacy_record(activityType="concept_match", **{"pass": True, "score": 1.0})
    )
    assert verdict.verdict == "FAIL"
    assert verdict.mastery_eligible is False
    assert any("activityType" in error for error in verdict.errors)
