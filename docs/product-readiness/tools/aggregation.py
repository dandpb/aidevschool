from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import date, datetime
from pathlib import Path
from typing import Final, TypeAlias

from .fingerprint import manual_fingerprint, source_fingerprint
from .history import HistoryParseError, JsonValue, parse_result
from .models import ReadinessDomain, Scenario, ScenarioResult
from .paths import validate_repo_path


JsonMapping: TypeAlias = dict[str, JsonValue]
REPORT_KEYS: Final = frozenset(
    {
        "schemaVersion", "scenarioId", "runId", "gitSha", "executedAt", "executor",
        "outcome", "sourceFingerprint", "manualFingerprint", "assertions", "artifacts", "gaps",
    }
)
RESULT_KEYS: Final = frozenset(
    REPORT_KEYS - {"assertions"}
)
AGGREGATE_REPORT_NAME: Final = "product-readiness-report.json"


def _git_sha(repo_root: Path) -> str:
    return subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, capture_output=True, text=True
    ).stdout.strip()


def _report_paths(domain: ReadinessDomain, directory: Path) -> tuple[Path, ...]:
    scenario_ids = {str(scenario.id) for scenario in domain.scenarios}
    return tuple(
        path
        for path in sorted(directory.rglob("*.json"))
        if path.name != AGGREGATE_REPORT_NAME and path.stem in scenario_ids
    )


def _read_report(path: Path) -> tuple[JsonMapping | None, str | None]:
    try:
        value: JsonValue = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as error:
        return None, f"cannot read producer report {path}: {error}"
    if not isinstance(value, dict):
        return None, f"producer report must be a JSON object: {path}"
    return value, None


def _validate_assertions(scenario: Scenario, raw: JsonMapping, path: Path) -> tuple[str, ...]:
    assertions = raw["assertions"]
    if not isinstance(assertions, list):
        return (f"producer report assertions must be a list: {path}",)
    expected = {
        str(assertion.id): assertion
        for assertion in scenario.assertions
        if str(assertion.evidence) == "playwright"
    }
    errors: list[str] = []
    seen: set[str] = set()
    for index, value in enumerate(assertions):
        if not isinstance(value, dict):
            errors.append(f"producer assertion must be an object: {path}#{index}")
            continue
        if set(value) != {"id", "outcome", "evidence"}:
            errors.append(f"producer assertion has invalid shape: {path}#{index}")
            continue
        assertion_id = value["id"]
        if not isinstance(assertion_id, str) or assertion_id not in expected:
            errors.append(f"producer assertion is unknown: {path}#{index}")
            continue
        if assertion_id in seen:
            errors.append(f"producer assertion is duplicated: {path}#{index}")
        seen.add(assertion_id)
        if value["evidence"] != "playwright":
            errors.append(f"producer report cannot self-assert non-browser evidence: {path}#{index}")
        if value["outcome"] not in {"pass", "fail"}:
            errors.append(f"producer assertion has invalid outcome: {path}#{index}")
    missing = set(expected) - seen
    errors.extend(f"producer report omits automated assertion {item}: {path}" for item in sorted(missing))
    return tuple(errors)


def _validate_artifacts(repo_root: Path, raw: JsonMapping, path: Path) -> tuple[str, ...]:
    artifacts = raw["artifacts"]
    if not isinstance(artifacts, list):
        return (f"producer report artifacts must be a list: {path}",)
    errors: list[str] = []
    for index, value in enumerate(artifacts):
        if not isinstance(value, dict) or set(value) != {"path", "sha256"}:
            errors.append(f"producer artifact has invalid shape: {path}#{index}")
            continue
        artifact_path = value["path"]
        artifact_digest = value["sha256"]
        if not isinstance(artifact_path, str) or not isinstance(artifact_digest, str):
            errors.append(f"producer artifact has invalid values: {path}#{index}")
            continue
        path_error = validate_repo_path(repo_root, artifact_path)
        if path_error is not None:
            errors.append(path_error)
            continue
        actual = hashlib.sha256((repo_root / artifact_path).read_bytes()).hexdigest()
        if actual != artifact_digest:
            errors.append(f"producer artifact digest does not match: {artifact_path}")
    return tuple(errors)


def _validate_report(
    domain: ReadinessDomain,
    repo_root: Path,
    path: Path,
    current_sha: str,
    raw: JsonMapping,
) -> tuple[str, ...]:
    if set(raw) != REPORT_KEYS:
        return (f"producer report has invalid shape: {path}",)
    scenario_id = raw["scenarioId"]
    if not isinstance(scenario_id, str):
        return (f"producer report scenarioId must be a string: {path}",)
    scenario = next((item for item in domain.scenarios if str(item.id) == scenario_id), None)
    if scenario is None:
        return (f"producer report references unknown scenario: {path}",)
    if raw["executor"] != "automated":
        return (f"producer report executor must be automated: {path}",)
    use_case = next(item for item in domain.use_cases if item.id == scenario.use_case_id)
    errors: list[str] = []
    if raw["sourceFingerprint"] != source_fingerprint(domain, use_case, repo_root):
        errors.append(f"producer report source fingerprint does not match: {path}")
    if raw["manualFingerprint"] != manual_fingerprint(domain, use_case):
        errors.append(f"producer report manual fingerprint does not match: {path}")
    if raw["gitSha"] != current_sha:
        errors.append(f"producer report git SHA does not match checkout: {path}")
    errors.extend(_validate_assertions(scenario, raw, path))
    errors.extend(_validate_artifacts(repo_root, raw, path))
    if not isinstance(raw["gaps"], list):
        errors.append(f"producer report gaps must be a list: {path}")
    return tuple(errors)


def validate_report_directories(
    domain: ReadinessDomain,
    repo_root: Path,
    directories: tuple[Path, ...],
) -> tuple[str, ...]:
    errors: list[str] = []
    current_sha = _git_sha(repo_root)
    report_ids: list[str] = []
    run_ids: list[str] = []
    for directory in directories:
        if not directory.is_dir():
            errors.append(f"producer report directory does not exist: {directory}")
            continue
        for path in _report_paths(domain, directory):
            raw, read_error = _read_report(path)
            if read_error is not None:
                errors.append(read_error)
                continue
            if raw is None:
                continue
            errors.extend(_validate_report(domain, repo_root, path, current_sha, raw))
            scenario_id = raw.get("scenarioId")
            run_id = raw.get("runId")
            if isinstance(scenario_id, str):
                report_ids.append(scenario_id)
            if isinstance(run_id, str):
                run_ids.append(run_id)
    if len(report_ids) != len(set(report_ids)):
        errors.append("producer reports contain duplicate scenario IDs")
    if len(run_ids) != len(set(run_ids)):
        errors.append("producer reports contain duplicate run IDs")
    return tuple(errors)


def _validated_reports(
    domain: ReadinessDomain,
    repo_root: Path,
    directories: tuple[Path, ...],
) -> tuple[tuple[JsonMapping, ...], tuple[str, ...]]:
    errors = validate_report_directories(domain, repo_root, directories)
    if errors:
        return (), errors
    reports: list[JsonMapping] = []
    for directory in directories:
        for path in _report_paths(domain, directory):
            raw, read_error = _read_report(path)
            if read_error is not None:
                return (), (read_error,)
            if raw is not None:
                reports.append(raw)
    return tuple(reports), ()


def _normalise_result(raw: JsonMapping) -> ScenarioResult:
    normalized = {key: raw[key] for key in RESULT_KEYS}
    try:
        return parse_result(normalized, f"producer-report:{raw['runId']}")
    except HistoryParseError as error:
        raise ValueError(str(error)) from error


def _result_mapping(result: ScenarioResult) -> JsonMapping:
    return {
        "schemaVersion": result.schema_version,
        "scenarioId": result.scenario_id,
        "runId": result.run_id,
        "gitSha": result.git_sha,
        "executedAt": result.executed_at.isoformat().replace("+00:00", "Z"),
        "executor": result.executor,
        "outcome": result.outcome,
        "sourceFingerprint": result.source_fingerprint,
        "manualFingerprint": result.manual_fingerprint,
        "artifacts": [{"path": item.path, "sha256": item.sha256} for item in result.artifacts],
        "gaps": [
            {
                "id": gap.id,
                "severity": gap.severity,
                "summary": gap.summary,
                "owner": gap.owner,
                "disposition": gap.disposition,
            }
            for gap in result.gaps
        ],
    }


def build_candidate_report(
    domain: ReadinessDomain,
    repo_root: Path,
    directories: tuple[Path, ...],
    assessment_id: str,
    verified_at: str,
    revalidate_by: str,
) -> tuple[JsonMapping | None, tuple[str, ...]]:
    """Aggregate producer facts into an assessor input without granting readiness."""
    try:
        parsed_verified_at = datetime.fromisoformat(verified_at.replace("Z", "+00:00"))
        parsed_revalidate_by = date.fromisoformat(revalidate_by)
    except ValueError as error:
        return None, (f"candidate report has invalid date: {error}",)
    if parsed_verified_at.tzinfo is None:
        return None, ("candidate report verifiedAt must include a timezone",)
    if parsed_revalidate_by < parsed_verified_at.date():
        return None, ("candidate report revalidateBy must not precede verifiedAt",)
    raw_reports, errors = _validated_reports(domain, repo_root, directories)
    if errors:
        return None, errors
    try:
        results = tuple(_normalise_result(raw) for raw in raw_reports)
    except ValueError as error:
        return None, (f"producer report cannot be normalized: {error}",)
    return (
        {
            "schemaVersion": 1,
            "assessmentId": assessment_id,
            "assessorContext": "independent-readiness-review",
            "verifiedAt": verified_at,
            "revalidateBy": revalidate_by,
            "gitSha": _git_sha(repo_root),
            "results": [_result_mapping(result) for result in results],
        },
        (),
    )
