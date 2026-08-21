from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from .evaluate import current_decision
from .models import (
    DecisionOutcome,
    ReadinessDecision,
    ReadinessDomain,
    ScenarioId,
)


def candidate_path(directories: tuple[Path, ...]) -> Path | None:
    candidates = tuple(
        path
        for directory in directories
        if directory.is_dir()
        for path in sorted(directory.rglob("product-readiness-report.json"))
    )
    return candidates[0] if candidates else None


def unsupported_candidate_reasons(
    decision: ReadinessDecision,
    scenario_ids: tuple[ScenarioId, ...],
    producer_scenario_ids: tuple[ScenarioId, ...],
) -> tuple[str, ...]:
    """Return candidate defects beyond the expected producer/assessor boundary."""
    if decision.outcome is not DecisionOutcome.BLOCKED:
        return ()
    allowed_reasons = {
        f"scenario {scenario_id} lacks independent evidence" for scenario_id in scenario_ids
    }
    producer_scenarios = set(producer_scenario_ids)
    allowed_reasons.update(
        f"missing promoted result for {scenario_id}"
        for scenario_id in scenario_ids
        if scenario_id not in producer_scenarios
    )
    return tuple(reason for reason in decision.reasons if reason not in allowed_reasons)


def blocked_claims(
    domain: ReadinessDomain,
    candidate_decisions: tuple[ReadinessDecision, ...] | None,
    repo_root: Path,
) -> tuple[ReadinessDecision, ...]:
    now = datetime.now(UTC)
    published = tuple(
        (use_case, current_decision(domain, use_case, repo_root, now))
        for use_case in domain.use_cases
    )
    if candidate_decisions is None:
        return tuple(
            decision
            for _use_case, decision in published
            if decision.outcome in {DecisionOutcome.BLOCKED, DecisionOutcome.STALE}
        )
    candidate_by_use_case = {decision.use_case_id: decision for decision in candidate_decisions}
    scenarios_by_id = {scenario.id: scenario for scenario in domain.scenarios}
    blocked: list[ReadinessDecision] = []
    for use_case, decision in published:
        if decision.granted_tier is None:
            continue
        candidate = candidate_by_use_case[use_case.id]
        producer_scenario_ids = tuple(
            scenario_id
            for scenario_id in use_case.scenario_ids
            if scenarios_by_id[scenario_id].automation is not None
        )
        reasons = unsupported_candidate_reasons(
            candidate, use_case.scenario_ids, producer_scenario_ids
        )
        if reasons:
            blocked.append(
                ReadinessDecision(
                    use_case.id,
                    DecisionOutcome.BLOCKED,
                    None,
                    reasons,
                    candidate.result_run_ids,
                )
            )
    return tuple(blocked)
