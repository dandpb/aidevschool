from __future__ import annotations

import hashlib
import json
import subprocess
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import TypeAlias

import yaml

from .evaluate import evaluate_candidate
from .history import HistoryParseError, JsonValue, parse_result
from .models import Assessment, AssessmentId, GitSha, ReadinessDecision, ReadinessDomain, ScenarioResult
from .paths import validate_repo_path


JsonMapping: TypeAlias = dict[str, JsonValue]


@dataclass(frozen=True, slots=True)
class AssessmentRequest:
    schema_version: int
    assessment_id: AssessmentId
    assessor_context: str
    verified_at: datetime
    revalidate_by: date
    git_sha: GitSha
    results: tuple[ScenarioResult, ...]


@dataclass(frozen=True, slots=True)
class AssessmentProposal:
    request: AssessmentRequest
    assessment: Assessment
    result_lines: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class EvidenceError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def _request_mapping(value: JsonValue) -> JsonMapping:
    if not isinstance(value, dict):
        raise EvidenceError("assessment report must be a JSON object")
    required = {
        "schemaVersion", "assessmentId", "assessorContext", "verifiedAt", "revalidateBy", "gitSha", "results",
    }
    missing = required - value.keys()
    unknown = value.keys() - required
    if missing:
        raise EvidenceError(f"assessment report is missing fields: {', '.join(sorted(missing))}")
    if unknown:
        raise EvidenceError(f"assessment report has unknown fields: {', '.join(sorted(unknown))}")
    return value


def load_assessment_request(path: Path) -> AssessmentRequest:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as error:
        raise EvidenceError(f"cannot read assessment report {path}: {error}") from error
    raw = _request_mapping(value)
    try:
        verified_at_text = raw["verifiedAt"]
        revalidate_by_text = raw["revalidateBy"]
        results_raw = raw["results"]
        if not isinstance(verified_at_text, str) or not isinstance(revalidate_by_text, str):
            raise EvidenceError("assessment dates must be strings")
        if not isinstance(results_raw, list):
            raise EvidenceError("assessment results must be a list")
        verified_at = datetime.fromisoformat(verified_at_text.replace("Z", "+00:00"))
        if verified_at.tzinfo is None:
            raise EvidenceError("assessment verifiedAt must include a timezone")
        request = AssessmentRequest(
            schema_version=int(raw["schemaVersion"]),
            assessment_id=AssessmentId(str(raw["assessmentId"])),
            assessor_context=str(raw["assessorContext"]),
            verified_at=verified_at,
            revalidate_by=date.fromisoformat(revalidate_by_text),
            git_sha=GitSha(str(raw["gitSha"])),
            results=tuple(parse_result(item, f"report.results[{index}]") for index, item in enumerate(results_raw)),
        )
    except (ValueError, TypeError, HistoryParseError) as error:
        raise EvidenceError(f"invalid assessment report: {error}") from error
    if request.schema_version != 1:
        raise EvidenceError("only assessment report schema version 1 is supported")
    if request.assessor_context != "independent-readiness-review":
        raise EvidenceError("assessorContext must be independent-readiness-review")
    if request.revalidate_by < request.verified_at.date():
        raise EvidenceError("revalidateBy must not precede verifiedAt")
    if any(result.executed_at > request.verified_at for result in request.results):
        raise EvidenceError("verifiedAt must not precede a promoted result")
    return request


def _checkout_sha(repo_root: Path) -> GitSha:
    completed = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, capture_output=True, text=True
    )
    return GitSha(completed.stdout.strip())


def _verify_artifacts(repo_root: Path, results: tuple[ScenarioResult, ...]) -> None:
    for result in results:
        for artifact in result.artifacts:
            path_error = validate_repo_path(repo_root, artifact.path)
            if path_error is not None:
                raise EvidenceError(path_error)
            actual = hashlib.sha256((repo_root / artifact.path).read_bytes()).hexdigest()
            if actual != artifact.sha256:
                raise EvidenceError(f"artifact digest mismatch: {artifact.path}")


def _result_json(result: ScenarioResult) -> str:
    payload = {
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
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def assessment_mapping(assessment: Assessment) -> JsonMapping:
    return {
        "schemaVersion": assessment.schema_version,
        "assessmentId": assessment.assessment_id,
        "assessorContext": assessment.assessor_context,
        "verifiedAt": assessment.verified_at.isoformat().replace("+00:00", "Z"),
        "revalidateBy": assessment.revalidate_by.isoformat(),
        "gitSha": assessment.git_sha,
        "decisions": [
            {
                "useCaseId": decision.use_case_id,
                "outcome": str(decision.outcome),
                "grantedTier": None if decision.granted_tier is None else str(decision.granted_tier),
                "reasons": list(decision.reasons),
                "resultRunIds": list(decision.result_run_ids),
            }
            for decision in assessment.decisions
        ],
    }


def propose_assessment(
    domain: ReadinessDomain,
    request: AssessmentRequest,
    repo_root: Path,
) -> AssessmentProposal:
    if request.git_sha != _checkout_sha(repo_root):
        raise EvidenceError("assessment report gitSha does not match the current checkout")
    if request.assessment_id in {assessment.assessment_id for assessment in domain.assessments}:
        raise EvidenceError(f"assessment ID already exists: {request.assessment_id}")
    existing_run_ids = {result.run_id for result in domain.results}
    request_run_ids = [result.run_id for result in request.results]
    if len(request_run_ids) != len(set(request_run_ids)) or existing_run_ids.intersection(request_run_ids):
        raise EvidenceError("assessment report contains a duplicate or previously promoted run ID")
    if any(result.git_sha != request.git_sha for result in request.results):
        raise EvidenceError("scenario result gitSha does not match the assessment report")
    _verify_artifacts(repo_root, request.results)
    decisions: tuple[ReadinessDecision, ...] = tuple(
        evaluate_candidate(domain, use_case, request.results, repo_root) for use_case in domain.use_cases
    )
    assessment = Assessment(
        schema_version=1,
        assessment_id=request.assessment_id,
        assessor_context=request.assessor_context,
        verified_at=request.verified_at,
        revalidate_by=request.revalidate_by,
        git_sha=request.git_sha,
        decisions=decisions,
    )
    return AssessmentProposal(request, assessment, tuple(_result_json(result) for result in request.results))


def write_assessment(proposal: AssessmentProposal, readiness_root: Path) -> tuple[Path, Path]:
    results_path = readiness_root / "evidence" / "results.ndjson"
    assessment_path = readiness_root / "assessments" / f"{proposal.assessment.assessment_id}.yaml"
    assessment_path.parent.mkdir(parents=True, exist_ok=True)
    results_path.parent.mkdir(parents=True, exist_ok=True)
    existing = results_path.read_text(encoding="utf-8") if results_path.exists() else ""
    addition = "\n".join(proposal.result_lines) + "\n"
    results_path.write_text(existing + addition, encoding="utf-8")
    assessment_path.write_text(yaml.safe_dump(assessment_mapping(proposal.assessment), sort_keys=False), encoding="utf-8")
    return results_path, assessment_path
