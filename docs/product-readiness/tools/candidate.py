from __future__ import annotations

from datetime import date, datetime
from dataclasses import dataclass
from pathlib import Path

from .aggregation import JsonMapping, RESULT_KEYS, _git_sha, _validated_reports
from .history import HistoryParseError, parse_result
from .models import ReadinessDomain, ScenarioResult
from .observations import merge_observations


@dataclass(frozen=True, slots=True)
class CandidateRequest:
    directories: tuple[Path, ...]
    assessment_id: str
    verified_at: str
    revalidate_by: str
    observation_directories: tuple[Path, ...] = ()


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
    request: CandidateRequest,
) -> tuple[JsonMapping | None, tuple[str, ...]]:
    """Aggregate producer facts into an assessor input without granting readiness."""
    try:
        parsed_verified_at = datetime.fromisoformat(request.verified_at.replace("Z", "+00:00"))
        parsed_revalidate_by = date.fromisoformat(request.revalidate_by)
    except ValueError as error:
        return None, (f"candidate report has invalid date: {error}",)
    if parsed_verified_at.tzinfo is None:
        return None, ("candidate report verifiedAt must include a timezone",)
    if parsed_revalidate_by < parsed_verified_at.date():
        return None, ("candidate report revalidateBy must not precede verifiedAt",)
    raw_reports, errors = _validated_reports(domain, repo_root, request.directories)
    if errors:
        return None, errors
    try:
        results = tuple(_normalise_result(raw) for raw in raw_reports)
    except ValueError as error:
        return None, (f"producer report cannot be normalized: {error}",)
    later_producers = tuple(
        result.scenario_id for result in results if result.executed_at > parsed_verified_at
    )
    if later_producers:
        return None, (
            "candidate report verifiedAt predates producer results: " + ", ".join(later_producers),
        )
    if request.observation_directories:
        results, observation_errors = merge_observations(
            domain, repo_root, results, request.observation_directories, _git_sha(repo_root)
        )
        if observation_errors:
            return None, observation_errors
    later_results = tuple(
        result.scenario_id for result in results if result.executed_at > parsed_verified_at
    )
    if later_results:
        return None, (
            "candidate report verifiedAt predates observed results: " + ", ".join(later_results),
        )
    return (
        {
            "schemaVersion": 1,
            "assessmentId": request.assessment_id,
            "assessorContext": "independent-readiness-review",
            "verifiedAt": request.verified_at,
            "revalidateBy": request.revalidate_by,
            "gitSha": _git_sha(repo_root),
            "results": [_result_mapping(result) for result in results],
        },
        (),
    )
