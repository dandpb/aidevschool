from __future__ import annotations

from pathlib import Path

from .models import ReadinessDomain, ReadinessTier, TierPolicy, UseCase
from .paths import markdown_anchor_exists, validate_repo_path


def _tier_policy(domain: ReadinessDomain, tier: ReadinessTier) -> TierPolicy | None:
    return next((rule for rule in domain.policy.tiers if rule.tier is tier), None)


def _validate_manual_ref(readiness_root: Path, reference: str) -> str | None:
    if "#" not in reference:
        return f"manual reference must include an anchor: {reference}"
    relative, anchor = reference.split("#", 1)
    path = readiness_root / relative
    if not path.resolve().is_relative_to(readiness_root.resolve()):
        return f"manual reference escapes readiness domain: {reference}"
    if not markdown_anchor_exists(path, anchor):
        return f"manual anchor does not exist: {reference}"
    return None


def _validate_use_case(domain: ReadinessDomain, use_case: UseCase, repo_root: Path) -> tuple[str, ...]:
    errors: list[str] = []
    scenarios = {scenario.id: scenario for scenario in domain.scenarios}
    selected = []
    for scenario_id in use_case.scenario_ids:
        scenario = scenarios.get(scenario_id)
        if scenario is None:
            errors.append(f"use case {use_case.id} references unknown scenario {scenario_id}")
        else:
            selected.append(scenario)
            if scenario.use_case_id != use_case.id:
                errors.append(f"scenario {scenario.id} belongs to {scenario.use_case_id}, not {use_case.id}")
    rule = _tier_policy(domain, use_case.intended_tier)
    if rule is None:
        errors.append(f"use case {use_case.id} has no policy for tier {use_case.intended_tier}")
    else:
        present_kinds = {scenario.kind for scenario in selected}
        present_evidence = {assertion.evidence for scenario in selected for assertion in scenario.assertions}
        for required_kind in rule.required_scenario_kinds:
            if required_kind not in present_kinds:
                errors.append(f"use case {use_case.id} lacks required scenario kind {required_kind}")
        for required_evidence in rule.required_evidence_kinds:
            if required_evidence not in present_evidence:
                errors.append(f"use case {use_case.id} lacks required evidence kind {required_evidence}")
        manual_refs = {
            "student": use_case.manual_refs.student,
            "facilitator": use_case.manual_refs.facilitator,
        }
        for manual_name in rule.required_manuals:
            reference = manual_refs.get(manual_name)
            if reference is None:
                errors.append(f"use case {use_case.id} lacks required {manual_name} manual")
            else:
                error = _validate_manual_ref(Path(domain.root), reference)
                if error is not None:
                    errors.append(error)
    for source_path in use_case.source_paths:
        error = validate_repo_path(repo_root, source_path)
        if error is not None:
            errors.append(error)
    return tuple(errors)


def validate_domain(domain: ReadinessDomain, repo_root: Path) -> tuple[str, ...]:
    errors: list[str] = []
    use_case_ids = [use_case.id for use_case in domain.use_cases]
    scenario_ids = [scenario.id for scenario in domain.scenarios]
    if len(use_case_ids) != len(set(use_case_ids)):
        errors.append("inventory contains duplicate use-case IDs")
    if len(scenario_ids) != len(set(scenario_ids)):
        errors.append("scenario directory contains duplicate scenario IDs")
    run_ids = [result.run_id for result in domain.results]
    assessment_ids = [assessment.assessment_id for assessment in domain.assessments]
    if len(run_ids) != len(set(run_ids)):
        errors.append("evidence log contains duplicate run IDs")
    if len(assessment_ids) != len(set(assessment_ids)):
        errors.append("assessment directory contains duplicate assessment IDs")
    if domain.policy.schema_version != 1:
        errors.append("policy supports only schema version 1")
    if {rule.tier for rule in domain.policy.tiers} != set(ReadinessTier):
        errors.append("policy must define every readiness tier exactly once")
    for use_case in domain.use_cases:
        errors.extend(_validate_use_case(domain, use_case, repo_root))
    for scenario in domain.scenarios:
        if scenario.use_case_id not in use_case_ids:
            errors.append(f"scenario {scenario.id} references unknown use case {scenario.use_case_id}")
        if not scenario.steps:
            errors.append(f"scenario {scenario.id} must declare at least one step")
        if not scenario.assertions:
            errors.append(f"scenario {scenario.id} must declare at least one assertion")
        assertion_ids = [assertion.id for assertion in scenario.assertions]
        if len(assertion_ids) != len(set(assertion_ids)):
            errors.append(f"scenario {scenario.id} contains duplicate assertion IDs")
        for source_path in scenario.source_paths:
            error = validate_repo_path(repo_root, source_path)
            if error is not None:
                errors.append(error)
        if scenario.automation is not None:
            error = validate_repo_path(repo_root, scenario.automation.working_directory)
            if error is not None:
                errors.append(error)
    known_run_ids = set(run_ids)
    for result in domain.results:
        if result.scenario_id not in scenario_ids:
            errors.append(f"result {result.run_id} references unknown scenario {result.scenario_id}")
        for artifact in result.artifacts:
            error = validate_repo_path(repo_root, artifact.path)
            if error is not None:
                errors.append(error)
    for assessment in domain.assessments:
        if assessment.assessor_context != "independent-readiness-review":
            errors.append(f"assessment {assessment.assessment_id} is not independently authored")
        for decision in assessment.decisions:
            if decision.use_case_id not in use_case_ids:
                errors.append(f"assessment {assessment.assessment_id} references unknown use case {decision.use_case_id}")
            for run_id in decision.result_run_ids:
                if run_id not in known_run_ids:
                    errors.append(f"assessment {assessment.assessment_id} references unknown run {run_id}")
    return tuple(errors)
