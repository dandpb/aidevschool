from dataclasses import replace
from datetime import datetime, timezone
import hashlib
from pathlib import Path

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.evaluate import current_decision, evaluate_candidate
from product_readiness_tools.fingerprint import manual_fingerprint, source_fingerprint
from product_readiness_tools.load import load_domain
from product_readiness_tools.models import (
    Assessment,
    AssessmentId,
    ArtifactDigest,
    DecisionOutcome,
    ExecutorKind,
    Gap,
    GitSha,
    RunId,
    RepoPath,
    ScenarioOutcome,
    ScenarioResult,
    Severity,
    Sha256Digest,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"
GIT_SHA = GitSha("c22abf39a8b87715c5254a52b60756bf1fa48d5b")


def _passing_results(gaps: tuple[Gap, ...] = ()) -> tuple[ScenarioResult, ...]:
    domain = load_domain(READINESS_ROOT)
    use_case = domain.use_cases[0]
    source = source_fingerprint(domain, use_case, REPO_ROOT)
    manual = manual_fingerprint(domain, use_case)
    artifact_path = RepoPath("docs/product-readiness/student-guide.md")
    artifact = ArtifactDigest(
        artifact_path,
        Sha256Digest(hashlib.sha256((REPO_ROOT / artifact_path).read_bytes()).hexdigest()),
    )
    return tuple(
        ScenarioResult(
            schema_version=1,
            scenario_id=scenario_id,
            run_id=RunId(f"run-{scenario_id}"),
            git_sha=GIT_SHA,
            executed_at=datetime(2026, 8, 20, 12, tzinfo=timezone.utc),
            executor=ExecutorKind.MIXED,
            outcome=ScenarioOutcome.PASS,
            source_fingerprint=source,
            manual_fingerprint=manual,
            artifacts=(artifact,),
            gaps=gaps,
        )
        for scenario_id in use_case.scenario_ids
    )


def test_evaluate_candidate_blocks_severe_gap() -> None:
    # Given otherwise passing results with a high-severity gap
    domain = load_domain(READINESS_ROOT)
    gap = Gap("retry-broken", Severity.HIGH, "Retry is unavailable", None, None)

    # When the candidate is evaluated
    decision = evaluate_candidate(domain, domain.use_cases[0], _passing_results((gap,)), REPO_ROOT)

    # Then the intended tier is blocked without an override
    assert decision.outcome is DecisionOutcome.BLOCKED
    assert decision.granted_tier is None


def test_evaluate_candidate_allows_dispositioned_medium_gap() -> None:
    # Given passing results with an owned, dispositioned medium gap
    domain = load_domain(READINESS_ROOT)
    gap = Gap("copy-friction", Severity.MEDIUM, "Copy is unclear", "literacyDojo", "revise after pilot")

    # When the candidate is evaluated
    decision = evaluate_candidate(domain, domain.use_cases[0], _passing_results((gap,)), REPO_ROOT)

    # Then the decision is conditional follow-up at the intended tier
    assert decision.outcome is DecisionOutcome.CONDITIONAL_FOLLOW_UP
    assert decision.granted_tier == domain.use_cases[0].intended_tier


def test_current_decision_marks_expired_assessment_stale() -> None:
    # Given an assessment whose explicit expiry has passed
    domain = load_domain(READINESS_ROOT)
    results = _passing_results()
    candidate = evaluate_candidate(domain, domain.use_cases[0], results, REPO_ROOT)
    assessment = Assessment(
        1,
        AssessmentId("expired"),
        "independent-readiness-review",
        datetime(2026, 8, 20, tzinfo=timezone.utc),
        datetime(2026, 8, 20, tzinfo=timezone.utc).date(),
        GIT_SHA,
        (candidate,),
    )

    # When status is evaluated after expiry
    decision = current_decision(
        replace(domain, results=results, assessments=(assessment,)),
        domain.use_cases[0],
        REPO_ROOT,
        datetime(2026, 8, 21, tzinfo=timezone.utc),
    )

    # Then freshness is reported separately as stale
    assert decision.outcome is DecisionOutcome.STALE
