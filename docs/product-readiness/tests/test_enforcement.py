from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.enforcement import unsupported_candidate_reasons
from product_readiness_tools.models import (
    DecisionOutcome,
    ReadinessDecision,
    RunId,
    ScenarioId,
    UseCaseId,
)


def test_automated_candidate_may_refresh_an_independently_proven_claim() -> None:
    # Given a candidate blocked only because CI producer evidence is not independent
    scenario_id = ScenarioId("current-scenario")
    decision = ReadinessDecision(
        use_case_id=UseCaseId("current-claim"),
        outcome=DecisionOutcome.BLOCKED,
        granted_tier=None,
        reasons=(f"scenario {scenario_id} lacks independent evidence",),
        result_run_ids=(RunId("producer-run"),),
    )

    # When claim enforcement checks the candidate against its expected scenarios
    reasons = unsupported_candidate_reasons(decision, (scenario_id,))

    # Then it accepts the producer refresh without treating it as a new assessment
    assert reasons == ()


def test_candidate_cannot_omit_a_published_claim_scenario() -> None:
    # Given a candidate missing evidence for a scenario in a published claim
    scenario_id = ScenarioId("missing-scenario")
    reason = f"missing promoted result for {scenario_id}"
    decision = ReadinessDecision(
        use_case_id=UseCaseId("current-claim"),
        outcome=DecisionOutcome.BLOCKED,
        granted_tier=None,
        reasons=(reason,),
        result_run_ids=(),
    )

    # When claim enforcement checks the candidate
    reasons = unsupported_candidate_reasons(decision, (scenario_id,))

    # Then the missing producer coverage remains blocking
    assert reasons == (reason,)


def test_candidate_may_omit_an_independent_only_scenario() -> None:
    # Given a published scenario that has no producer automation
    scenario_id = ScenarioId("independent-only-scenario")
    decision = ReadinessDecision(
        use_case_id=UseCaseId("current-claim"),
        outcome=DecisionOutcome.BLOCKED,
        granted_tier=None,
        reasons=(f"missing promoted result for {scenario_id}",),
        result_run_ids=(RunId("producer-run"),),
    )

    # When CI checks a producer-only candidate
    reasons = unsupported_candidate_reasons(decision, (scenario_id,))

    # Then the unchanged promoted independent evidence remains authoritative
    assert reasons == ()
