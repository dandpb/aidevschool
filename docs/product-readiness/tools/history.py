from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import TypeAlias

import yaml

from .models import (
    ArtifactDigest,
    Assessment,
    AssessmentId,
    DecisionOutcome,
    ExecutorKind,
    Gap,
    GitSha,
    ReadinessDecision,
    ReadinessTier,
    RepoPath,
    RunId,
    ScenarioId,
    ScenarioOutcome,
    ScenarioResult,
    Severity,
    Sha256Digest,
    UseCaseId,
)


JsonScalar: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


@dataclass(frozen=True, slots=True)
class HistoryParseError(Exception):
    path: str
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


def _mapping(value: JsonValue, path: str) -> dict[str, JsonValue]:
    if not isinstance(value, dict):
        raise HistoryParseError(path, "expected a mapping")
    return value


def _sequence(value: JsonValue, path: str) -> list[JsonValue]:
    if not isinstance(value, list):
        raise HistoryParseError(path, "expected a sequence")
    return value


def _text(value: JsonValue, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise HistoryParseError(path, "expected a non-empty string")
    return value


def _closed(raw: dict[str, JsonValue], required: set[str], path: str) -> None:
    missing = required - raw.keys()
    unknown = raw.keys() - required
    if missing:
        raise HistoryParseError(path, f"missing fields: {', '.join(sorted(missing))}")
    if unknown:
        raise HistoryParseError(path, f"unknown fields: {', '.join(sorted(unknown))}")


def _datetime(value: JsonValue, path: str) -> datetime:
    text = _text(value, path)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as error:
        raise HistoryParseError(path, "expected an ISO-8601 timestamp") from error
    if parsed.tzinfo is None:
        raise HistoryParseError(path, "timestamp must include a timezone")
    return parsed


def _date(value: JsonValue, path: str) -> date:
    try:
        return date.fromisoformat(_text(value, path))
    except ValueError as error:
        raise HistoryParseError(path, "expected an ISO-8601 date") from error


def _digest(value: JsonValue, path: str) -> Sha256Digest:
    text = _text(value, path)
    if SHA256_RE.fullmatch(text) is None:
        raise HistoryParseError(path, "expected a lowercase SHA-256 digest")
    return Sha256Digest(text)


def _git_sha(value: JsonValue, path: str) -> GitSha:
    text = _text(value, path)
    if GIT_SHA_RE.fullmatch(text) is None:
        raise HistoryParseError(path, "expected a 40-character lowercase git SHA")
    return GitSha(text)


def parse_result(value: JsonValue, path: str) -> ScenarioResult:
    raw = _mapping(value, path)
    _closed(
        raw,
        {
            "schemaVersion", "scenarioId", "runId", "gitSha", "executedAt", "executor",
            "outcome", "sourceFingerprint", "manualFingerprint", "artifacts", "gaps",
        },
        path,
    )
    artifacts: list[ArtifactDigest] = []
    for index, value_item in enumerate(_sequence(raw["artifacts"], f"{path}.artifacts")):
        item_path = f"{path}.artifacts[{index}]"
        item = _mapping(value_item, item_path)
        _closed(item, {"path", "sha256"}, item_path)
        artifacts.append(ArtifactDigest(RepoPath(_text(item["path"], f"{item_path}.path")), _digest(item["sha256"], f"{item_path}.sha256")))
    gaps: list[Gap] = []
    for index, value_item in enumerate(_sequence(raw["gaps"], f"{path}.gaps")):
        item_path = f"{path}.gaps[{index}]"
        item = _mapping(value_item, item_path)
        _closed(item, {"id", "severity", "summary", "owner", "disposition"}, item_path)
        owner = item["owner"]
        disposition = item["disposition"]
        gaps.append(
            Gap(
                id=_text(item["id"], f"{item_path}.id"),
                severity=Severity(_text(item["severity"], f"{item_path}.severity")),
                summary=_text(item["summary"], f"{item_path}.summary"),
                owner=None if owner is None else _text(owner, f"{item_path}.owner"),
                disposition=None if disposition is None else _text(disposition, f"{item_path}.disposition"),
            )
        )
    schema_version = raw["schemaVersion"]
    if schema_version != 1:
        raise HistoryParseError(f"{path}.schemaVersion", "only schema version 1 is supported")
    try:
        executor = ExecutorKind(_text(raw["executor"], f"{path}.executor"))
        outcome = ScenarioOutcome(_text(raw["outcome"], f"{path}.outcome"))
    except ValueError as error:
        raise HistoryParseError(path, f"unsupported enum value: {error}") from error
    return ScenarioResult(
        schema_version=1,
        scenario_id=ScenarioId(_text(raw["scenarioId"], f"{path}.scenarioId")),
        run_id=RunId(_text(raw["runId"], f"{path}.runId")),
        git_sha=_git_sha(raw["gitSha"], f"{path}.gitSha"),
        executed_at=_datetime(raw["executedAt"], f"{path}.executedAt"),
        executor=executor,
        outcome=outcome,
        source_fingerprint=_digest(raw["sourceFingerprint"], f"{path}.sourceFingerprint"),
        manual_fingerprint=_digest(raw["manualFingerprint"], f"{path}.manualFingerprint"),
        artifacts=tuple(artifacts),
        gaps=tuple(gaps),
    )


def _parse_decision(value: JsonValue, path: str) -> ReadinessDecision:
    raw = _mapping(value, path)
    _closed(raw, {"useCaseId", "outcome", "grantedTier", "reasons", "resultRunIds"}, path)
    tier_text = raw["grantedTier"]
    try:
        outcome = DecisionOutcome(_text(raw["outcome"], f"{path}.outcome"))
        tier = None if tier_text is None else ReadinessTier(_text(tier_text, f"{path}.grantedTier"))
    except ValueError as error:
        raise HistoryParseError(path, f"unsupported enum value: {error}") from error
    return ReadinessDecision(
        use_case_id=UseCaseId(_text(raw["useCaseId"], f"{path}.useCaseId")),
        outcome=outcome,
        granted_tier=tier,
        reasons=tuple(_text(item, f"{path}.reasons") for item in _sequence(raw["reasons"], f"{path}.reasons")),
        result_run_ids=tuple(RunId(_text(item, f"{path}.resultRunIds")) for item in _sequence(raw["resultRunIds"], f"{path}.resultRunIds")),
    )


def parse_assessment(value: JsonValue, path: str) -> Assessment:
    raw = _mapping(value, path)
    _closed(raw, {"schemaVersion", "assessmentId", "assessorContext", "verifiedAt", "revalidateBy", "gitSha", "decisions"}, path)
    if raw["schemaVersion"] != 1:
        raise HistoryParseError(f"{path}.schemaVersion", "only schema version 1 is supported")
    return Assessment(
        schema_version=1,
        assessment_id=AssessmentId(_text(raw["assessmentId"], f"{path}.assessmentId")),
        assessor_context=_text(raw["assessorContext"], f"{path}.assessorContext"),
        verified_at=_datetime(raw["verifiedAt"], f"{path}.verifiedAt"),
        revalidate_by=_date(raw["revalidateBy"], f"{path}.revalidateBy"),
        git_sha=_git_sha(raw["gitSha"], f"{path}.gitSha"),
        decisions=tuple(_parse_decision(item, f"{path}.decisions[{index}]") for index, item in enumerate(_sequence(raw["decisions"], f"{path}.decisions"))),
    )


def load_history(readiness_root: Path) -> tuple[tuple[ScenarioResult, ...], tuple[Assessment, ...]]:
    results_path = readiness_root / "evidence" / "results.ndjson"
    results: list[ScenarioResult] = []
    if results_path.exists():
        for line_number, line in enumerate(results_path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as error:
                raise HistoryParseError(f"results.ndjson:{line_number}", "invalid JSON") from error
            results.append(parse_result(value, f"results.ndjson:{line_number}"))
    assessments: list[Assessment] = []
    for assessment_path in sorted((readiness_root / "assessments").glob("*.yaml")):
        try:
            value = yaml.safe_load(assessment_path.read_text(encoding="utf-8"))
        except yaml.YAMLError as error:
            raise HistoryParseError(assessment_path.name, "invalid YAML") from error
        assessments.append(parse_assessment(value, assessment_path.name))
    return tuple(results), tuple(assessments)
