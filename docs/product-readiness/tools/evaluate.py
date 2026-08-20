from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path
from typing import assert_never

from .fingerprint import manual_fingerprint, source_fingerprint
from .models import (
    Assessment,
    DecisionOutcome,
    EvidenceKind,
    ExecutorKind,
    ReadinessDecision,
    ReadinessDomain,
    ReadinessTier,
    RunId,
    ScenarioOutcome,
    Scenario,
    ScenarioResult,
    Severity,
    UseCase,
)


BLOCKING_SEVERITIES = {Severity.CRITICAL, Severity.HIGH}


def _proof_errors(scenario: Scenario, result: ScenarioResult) -> tuple[str, ...]:
    """Require the result executor to cover every declared evidence boundary."""
    evidence_kinds = {assertion.evidence for assertion in scenario.assertions}
    requires_automated = EvidenceKind.PLAYWRIGHT in evidence_kinds
    requires_independent = bool(evidence_kinds - {EvidenceKind.PLAYWRIGHT})
    match result.executor:
        case ExecutorKind.AUTOMATED:
            if requires_independent:
                return (f"scenario {scenario.id} lacks independent evidence",)
        case ExecutorKind.OBSERVED:
            if requires_automated:
                return (f"scenario {scenario.id} lacks automated evidence",)
        case ExecutorKind.MIXED:
            pass
        case unreachable:
            assert_never(unreachable)
    return ()


def _latest_assessment(domain: ReadinessDomain, use_case: UseCase) -> Assessment | None:
    candidates = [
        assessment
        for assessment in domain.assessments
        if any(decision.use_case_id == use_case.id for decision in assessment.decisions)
    ]
    return max(candidates, key=lambda item: item.verified_at, default=None)


def _result_errors(
    domain: ReadinessDomain,
    use_case: UseCase,
    results: tuple[ScenarioResult, ...],
    repo_root: Path,
) -> tuple[str, ...]:
    expected_source = source_fingerprint(domain, use_case, repo_root)
    expected_manual = manual_fingerprint(domain, use_case)
    errors: list[str] = []
    scenarios = {scenario.id: scenario for scenario in domain.scenarios}
    scenario_ids = [result.scenario_id for result in results]
    if len(scenario_ids) != len(set(scenario_ids)):
        errors.append("multiple results were supplied for the same scenario")
    by_scenario = {result.scenario_id: result for result in results}
    for scenario_id in use_case.scenario_ids:
        result = by_scenario.get(scenario_id)
        if result is None:
            errors.append(f"missing promoted result for {scenario_id}")
            continue
        if result.outcome is not ScenarioOutcome.PASS:
            errors.append(f"scenario {scenario_id} did not pass")
        if result.source_fingerprint != expected_source:
            errors.append(f"scenario {scenario_id} source fingerprint is stale")
        if result.manual_fingerprint != expected_manual:
            errors.append(f"scenario {scenario_id} manual fingerprint is stale")
        scenario = scenarios[scenario_id]
        errors.extend(_proof_errors(scenario, result))
        if not result.artifacts:
            errors.append(f"scenario {scenario_id} has no artifact digest")
        for artifact in result.artifacts:
            path = repo_root / artifact.path
            if not path.is_file():
                errors.append(f"scenario {scenario_id} artifact is missing: {artifact.path}")
                continue
            if hashlib.sha256(path.read_bytes()).hexdigest() != artifact.sha256:
                errors.append(f"scenario {scenario_id} artifact digest does not match: {artifact.path}")
    severe = [gap.id for result in results for gap in result.gaps if gap.severity in BLOCKING_SEVERITIES]
    errors.extend(f"severe gap remains open: {gap_id}" for gap_id in severe)
    incomplete = [
        gap.id
        for result in results
        for gap in result.gaps
        if gap.severity not in BLOCKING_SEVERITIES and (gap.owner is None or gap.disposition is None)
    ]
    errors.extend(f"gap lacks owner or disposition: {gap_id}" for gap_id in incomplete)
    return tuple(errors)


def evaluate_candidate(
    domain: ReadinessDomain,
    use_case: UseCase,
    results: tuple[ScenarioResult, ...],
    repo_root: Path,
) -> ReadinessDecision:
    selected = tuple(result for result in results if result.scenario_id in set(use_case.scenario_ids))
    errors = _result_errors(domain, use_case, selected, repo_root)
    if errors:
        return ReadinessDecision(use_case.id, DecisionOutcome.BLOCKED, None, errors, tuple(result.run_id for result in selected))
    has_follow_up = any(result.gaps for result in selected)
    outcome = DecisionOutcome.CONDITIONAL_FOLLOW_UP if has_follow_up else DecisionOutcome.PASS
    return ReadinessDecision(
        use_case.id,
        outcome,
        use_case.intended_tier,
        ("dispositioned medium/low gaps remain",) if has_follow_up else (),
        tuple(result.run_id for result in selected),
    )


def current_decision(
    domain: ReadinessDomain,
    use_case: UseCase,
    repo_root: Path,
    now: datetime,
) -> ReadinessDecision:
    assessment = _latest_assessment(domain, use_case)
    if assessment is None:
        return ReadinessDecision(use_case.id, DecisionOutcome.UNASSESSED, None, ("no promoted assessment",), ())
    stored = next(decision for decision in assessment.decisions if decision.use_case_id == use_case.id)
    selected = tuple(result for result in domain.results if result.run_id in set(stored.result_run_ids))
    if now.date() > assessment.revalidate_by:
        return ReadinessDecision(use_case.id, DecisionOutcome.STALE, None, ("assessment has expired",), stored.result_run_ids)
    if any(result.git_sha != assessment.git_sha for result in selected):
        return ReadinessDecision(use_case.id, DecisionOutcome.BLOCKED, None, ("result SHA does not match assessment",), stored.result_run_ids)
    evaluated = evaluate_candidate(domain, use_case, selected, repo_root)
    if evaluated.outcome is DecisionOutcome.BLOCKED:
        stale = any("fingerprint is stale" in reason for reason in evaluated.reasons)
        if stale:
            return ReadinessDecision(use_case.id, DecisionOutcome.STALE, None, evaluated.reasons, stored.result_run_ids)
        return evaluated
    if stored.outcome is DecisionOutcome.DOWNGRADED:
        return stored
    return ReadinessDecision(use_case.id, evaluated.outcome, evaluated.granted_tier, evaluated.reasons, stored.result_run_ids)
