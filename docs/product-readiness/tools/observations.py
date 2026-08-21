from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from .fingerprint import manual_fingerprint, source_fingerprint
from .history import JsonValue
from .models import (
    ArtifactDigest,
    EvidenceKind,
    ExecutorKind,
    Gap,
    GitSha,
    ReadinessDomain,
    RepoPath,
    RunId,
    ScenarioId,
    ScenarioOutcome,
    ScenarioResult,
    Severity,
    Sha256Digest,
)


@dataclass(frozen=True, slots=True)
class Observation:
    scenario_id: ScenarioId
    observed_at: datetime
    outcome: ScenarioOutcome
    artifact: ArtifactDigest
    gaps: tuple[Gap, ...]


def _mapping(value: JsonValue, label: str) -> tuple[dict[str, JsonValue] | None, str | None]:
    if not isinstance(value, dict):
        return None, f"{label} must be an object"
    return value, None


def _parse_gaps(value: JsonValue, label: str) -> tuple[tuple[Gap, ...], tuple[str, ...]]:
    if not isinstance(value, list):
        return (), (f"{label} must be a list",)
    gaps: list[Gap] = []
    errors: list[str] = []
    for index, raw in enumerate(value):
        item, error = _mapping(raw, f"{label}[{index}]")
        if error is not None or item is None:
            errors.append(error or f"{label}[{index}] is invalid")
            continue
        if set(item) != {"id", "severity", "summary", "owner", "disposition"}:
            errors.append(f"{label}[{index}] has invalid shape")
            continue
        try:
            gaps.append(
                Gap(
                    id=str(item["id"]),
                    severity=Severity(str(item["severity"])),
                    summary=str(item["summary"]),
                    owner=None if item["owner"] is None else str(item["owner"]),
                    disposition=None if item["disposition"] is None else str(item["disposition"]),
                )
            )
        except ValueError as exception:
            errors.append(f"{label}[{index}] has invalid severity: {exception}")
    return tuple(gaps), tuple(errors)


def _parse_bundle(
    domain: ReadinessDomain,
    repo_root: Path,
    path: Path,
    current_sha: str,
) -> tuple[tuple[Observation, ...], tuple[str, ...]]:
    try:
        value: JsonValue = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exception:
        return (), (f"cannot read observation report {path}: {exception}",)
    raw, error = _mapping(value, str(path))
    if error is not None or raw is None:
        return (), (error or f"invalid observation report {path}",)
    required = {"schemaVersion", "observerContext", "gitSha", "observedAt", "scenarios"}
    if set(raw) != required:
        return (), (f"observation report has invalid shape: {path}",)
    errors: list[str] = []
    if raw["schemaVersion"] != 1:
        errors.append(f"observation report schemaVersion must be 1: {path}")
    if raw["observerContext"] != "independent-readiness-observer":
        errors.append(f"observation report has invalid observerContext: {path}")
    if raw["gitSha"] != current_sha:
        errors.append(f"observation report git SHA does not match checkout: {path}")
    try:
        observed_at = datetime.fromisoformat(str(raw["observedAt"]).replace("Z", "+00:00"))
        if observed_at.tzinfo is None:
            errors.append(f"observation report observedAt must include timezone: {path}")
    except ValueError:
        return (), (f"observation report observedAt is invalid: {path}",)
    scenarios_raw = raw["scenarios"]
    if not isinstance(scenarios_raw, list):
        return (), (f"observation report scenarios must be a list: {path}",)
    scenario_by_id = {str(scenario.id): scenario for scenario in domain.scenarios}
    relative = path.resolve().relative_to(repo_root.resolve())
    artifact = ArtifactDigest(
        RepoPath(relative.as_posix()),
        Sha256Digest(hashlib.sha256(path.read_bytes()).hexdigest()),
    )
    observations: list[Observation] = []
    for index, scenario_value in enumerate(scenarios_raw):
        label = f"{path}.scenarios[{index}]"
        scenario_raw, scenario_error = _mapping(scenario_value, label)
        if scenario_error is not None or scenario_raw is None:
            errors.append(scenario_error or f"{label} is invalid")
            continue
        if set(scenario_raw) != {"scenarioId", "outcome", "assertions", "gaps"}:
            errors.append(f"{label} has invalid shape")
            continue
        scenario_id = str(scenario_raw["scenarioId"])
        scenario = scenario_by_id.get(scenario_id)
        if scenario is None:
            errors.append(f"{label} references unknown scenario {scenario_id}")
            continue
        expected = {
            assertion.id: str(assertion.evidence)
            for assertion in scenario.assertions
            if assertion.evidence is not EvidenceKind.PLAYWRIGHT
        }
        assertions = scenario_raw["assertions"]
        if not isinstance(assertions, list):
            errors.append(f"{label}.assertions must be a list")
            continue
        seen: set[str] = set()
        for assertion_index, assertion_value in enumerate(assertions):
            assertion, assertion_error = _mapping(assertion_value, f"{label}.assertions[{assertion_index}]")
            if assertion_error is not None or assertion is None:
                errors.append(assertion_error or f"{label}.assertions[{assertion_index}] is invalid")
                continue
            if set(assertion) != {"id", "evidence", "outcome", "notes"}:
                errors.append(f"{label}.assertions[{assertion_index}] has invalid shape")
                continue
            assertion_id = str(assertion["id"])
            seen.add(assertion_id)
            if expected.get(assertion_id) != assertion["evidence"]:
                errors.append(f"{label} has invalid evidence for assertion {assertion_id}")
            if assertion["outcome"] not in {"pass", "fail"} or not str(assertion["notes"]).strip():
                errors.append(f"{label} has invalid observation for assertion {assertion_id}")
        if seen != set(expected):
            errors.append(f"{label} does not cover every independent assertion")
        gaps, gap_errors = _parse_gaps(scenario_raw["gaps"], f"{label}.gaps")
        errors.extend(gap_errors)
        try:
            outcome = ScenarioOutcome(str(scenario_raw["outcome"]))
        except ValueError:
            errors.append(f"{label} has invalid outcome")
            continue
        observations.append(Observation(ScenarioId(scenario_id), observed_at, outcome, artifact, gaps))
    return tuple(observations), tuple(errors)


def merge_observations(
    domain: ReadinessDomain,
    repo_root: Path,
    automated: tuple[ScenarioResult, ...],
    directories: tuple[Path, ...],
    current_sha: str,
) -> tuple[tuple[ScenarioResult, ...], tuple[str, ...]]:
    observations: dict[ScenarioId, Observation] = {}
    errors: list[str] = []
    for directory in directories:
        if not directory.is_dir():
            errors.append(f"observation report directory does not exist: {directory}")
            continue
        for path in sorted(directory.glob("*.json")):
            parsed, parse_errors = _parse_bundle(domain, repo_root, path, current_sha)
            errors.extend(parse_errors)
            for observation in parsed:
                if observation.scenario_id in observations:
                    errors.append(f"duplicate observation for scenario {observation.scenario_id}")
                observations[observation.scenario_id] = observation
    if errors:
        return (), tuple(errors)
    automated_by_id = {result.scenario_id: result for result in automated}
    scenarios = {scenario.id: scenario for scenario in domain.scenarios}
    use_cases = {use_case.id: use_case for use_case in domain.use_cases}
    merged = [result for result in automated if result.scenario_id not in observations]
    for scenario_id, observation in observations.items():
        scenario = scenarios[scenario_id]
        requires_automated = any(assertion.evidence is EvidenceKind.PLAYWRIGHT for assertion in scenario.assertions)
        producer = automated_by_id.get(scenario_id)
        if requires_automated and producer is None:
            errors.append(f"observation lacks automated producer result for {scenario_id}")
            continue
        use_case = use_cases[scenario.use_case_id]
        producer_artifacts = () if producer is None else producer.artifacts
        producer_gaps = () if producer is None else producer.gaps
        producer_passed = producer is None or producer.outcome is ScenarioOutcome.PASS
        outcome = ScenarioOutcome.PASS if producer_passed and observation.outcome is ScenarioOutcome.PASS else ScenarioOutcome.FAIL
        executor = ExecutorKind.MIXED if producer is not None else ExecutorKind.OBSERVED
        run_stamp = observation.observed_at.isoformat().replace("+00:00", "Z")
        merged.append(
            ScenarioResult(
                schema_version=1,
                scenario_id=scenario_id,
                run_id=RunId(f"{run_stamp}-{scenario_id}-{executor}-{current_sha[:8]}"),
                git_sha=GitSha(current_sha),
                executed_at=observation.observed_at,
                executor=executor,
                outcome=outcome,
                source_fingerprint=source_fingerprint(domain, use_case, repo_root),
                manual_fingerprint=manual_fingerprint(domain, use_case),
                artifacts=producer_artifacts + (observation.artifact,),
                gaps=producer_gaps + observation.gaps,
            )
        )
    return tuple(merged), tuple(errors)
