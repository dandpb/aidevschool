from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.load import load_domain
from product_readiness_tools.models import (
    Assessment,
    AssessmentId,
    DecisionOutcome,
    GitSha,
    ReadinessDecision,
    ReadinessTier,
    RunId,
    UseCaseId,
)
from product_readiness_tools.validate import validate_domain


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"

ELEVATED_USE_CASE = UseCaseId("dojotoday-daily-guidance")
LATEST_ASSESSMENT_ID = AssessmentId("2026-09-07-79bf72c-ready-r4-regrant-v35")


def _pre_bump_assessment(domain_runs: tuple, decision: ReadinessDecision) -> Assessment:
    return Assessment(
        schema_version=1,
        assessment_id=AssessmentId("2026-08-20-pre-bump-history"),
        assessor_context="independent-readiness-review",
        verified_at=datetime(2026, 8, 20, 22, 0, tzinfo=timezone.utc),
        revalidate_by=datetime(2026, 9, 20).date(),
        git_sha=GitSha("c8a961cf2bce79faca6fe4c6928c2bc0fb2044a8"),
        decisions=(decision,),
    )


def _pre_bump_runs(domain) -> tuple[RunId, ...]:
    scenario_ids = next(
        use_case.scenario_ids for use_case in domain.use_cases if use_case.id == ELEVATED_USE_CASE
    )
    return tuple(
        result.run_id
        for result in domain.results
        if result.scenario_id in set(scenario_ids) and result.executed_at.year == 2026 and result.executed_at.month == 8
    )


def test_elevated_history_superseded_by_regrant_needs_no_migration() -> None:
    # Given the canonical domain (intended tier already elevated, latest v35 re-grant)
    domain = load_domain(READINESS_ROOT)
    intended = next(use_case.intended_tier for use_case in domain.use_cases if use_case.id == ELEVATED_USE_CASE)
    assert intended is ReadinessTier.CUSTOMER_READY

    # And a pre-bump historical decision still granting the superseded tier with its own runs
    pre_bump = _pre_bump_assessment(
        domain.results,
        ReadinessDecision(
            ELEVATED_USE_CASE,
            DecisionOutcome.PASS,
            ReadinessTier.VALIDATED_JOURNEY,
            (),
            _pre_bump_runs(domain),
        ),
    )
    superseded_domain = replace(domain, assessments=domain.assessments + (pre_bump,))

    # When it is validated, then no wrong-tier error demands a manual migration
    assert validate_domain(superseded_domain, REPO_ROOT) == ()


def test_tier_bump_without_regrant_fails_closed_on_latest_decision() -> None:
    # Given a bumped intended tier with no fresher re-grant than v35
    domain = load_domain(READINESS_ROOT)
    use_case = next(item for item in domain.use_cases if item.id == ELEVATED_USE_CASE)
    assert use_case.intended_tier is ReadinessTier.CUSTOMER_READY
    bumped = tuple(
        replace(item, intended_tier=ReadinessTier.VALIDATED_JOURNEY) if item.id == ELEVATED_USE_CASE else item
        for item in domain.use_cases
    )
    bumped_domain = replace(domain, use_cases=bumped)

    # When it is validated, then exactly the latest decision is flagged
    errors = validate_domain(bumped_domain, REPO_ROOT)
    wrong_tier = tuple(error for error in errors if "grants the wrong tier" in error)
    assert len(wrong_tier) == 1
    assert str(LATEST_ASSESSMENT_ID) in wrong_tier[0]
    assert ELEVATED_USE_CASE in wrong_tier[0]


def test_superseded_decisions_keep_outcome_tier_coherence() -> None:
    # Given a superseded decision that is internally incoherent
    domain = load_domain(READINESS_ROOT)
    pre_bump = _pre_bump_assessment(
        domain.results,
        ReadinessDecision(
            ELEVATED_USE_CASE,
            DecisionOutcome.STALE,
            ReadinessTier.VALIDATED_JOURNEY,
            (),
            _pre_bump_runs(domain),
        ),
    )
    superseded_domain = replace(domain, assessments=domain.assessments + (pre_bump,))

    # When it is validated, then the coherence rule still binds superseded history
    errors = validate_domain(superseded_domain, REPO_ROOT)
    assert any(
        f"assessment {pre_bump.assessment_id} grants a tier for {ELEVATED_USE_CASE} despite {DecisionOutcome.STALE}"
        in error
        for error in errors
    )


def test_superseded_decisions_keep_run_references() -> None:
    # Given a superseded decision referencing an unknown run
    domain = load_domain(READINESS_ROOT)
    runs = _pre_bump_runs(domain)
    assert runs
    pre_bump = _pre_bump_assessment(
        domain.results,
        ReadinessDecision(
            ELEVATED_USE_CASE,
            DecisionOutcome.PASS,
            ReadinessTier.VALIDATED_JOURNEY,
            (),
            runs + (RunId("2026-08-20T00:00:00Z-unknown-run"),),
        ),
    )
    superseded_domain = replace(domain, assessments=domain.assessments + (pre_bump,))

    # When it is validated, then the audit-trail link still binds superseded history
    errors = validate_domain(superseded_domain, REPO_ROOT)
    assert any(
        f"assessment {pre_bump.assessment_id} references unknown run 2026-08-20T00:00:00Z-unknown-run" in error
        for error in errors
    )
