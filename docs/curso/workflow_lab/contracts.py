from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from types import MappingProxyType
from typing import NewType, TypedDict, assert_never


CycleId = NewType("CycleId", str)
LessonId = NewType("LessonId", str)
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


class Handler(StrEnum):
    METADATA = "metadata-only"
    FILTER_NDJSON = "filter-ndjson"
    PATCH_JSON_CONFIG = "patch-json-config"
    BUILD_RETRY_SCHEDULE = "build-retry-schedule"
    SNAPSHOT_TTL_CACHE = "snapshot-ttl-cache"
    PLAN_TASK_DEPENDENCIES = "plan-task-dependencies"
    PLAN_SAFE_RENAMES = "plan-safe-renames"
    CHECK_UNIFIED_DIFF = "check-unified-diff"
    SUMMARIZE_ACCESS_LOG = "summarize-access-log"
    MIGRATE_RECORDS = "migrate-records-v1-v2"
    SCAN_SYNTHETIC_SECRETS = "scan-synthetic-secrets"


class LessonRecord(TypedDict):
    lesson_id: str
    lesson_text: str


class LedgerRecord(TypedDict):
    cycle_id: str
    handler: str
    requires: list[str]
    resolved_requires: list[LessonRecord]
    fixture_sha256: str
    artifact_path: str
    lesson_id: str
    lesson_text: str
    status: str


@dataclass(frozen=True, slots=True)
class Cycle:
    cycle_id: CycleId
    handler: Handler
    requires: tuple[LessonId, ...]
    lesson_id: LessonId
    lesson_text: str
    artifact_path: str
    fixture_sha256: str
    payload: Mapping[str, JsonValue]


@dataclass(frozen=True, slots=True)
class LogLineError(Exception):
    line_number: int
    detail: str

    def __str__(self) -> str:
        return f"invalid NDJSON object at line {self.line_number}: {self.detail}"


@dataclass(frozen=True, slots=True)
class WorkflowError(Exception):
    detail: str

    def __str__(self) -> str:
        return self.detail


def required_string(raw: dict[str, JsonValue], field: str) -> str:
    value = raw.get(field)
    if not isinstance(value, str) or not value:
        raise WorkflowError(f"{field} must be a nonempty string")
    return value


def parse_cycle(path: Path) -> Cycle:
    decoded: JsonValue = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(decoded, dict):
        raise WorkflowError("cycle fixture must be a JSON object")
    raw = decoded
    raw_requires = raw.get("requires")
    if not isinstance(raw_requires, list):
        raise WorkflowError("requires must be an array of nonempty strings")
    requires: list[LessonId] = []
    for requirement in raw_requires:
        if not isinstance(requirement, str) or not requirement:
            raise WorkflowError("requires must be an array of nonempty strings")
        requires.append(LessonId(requirement))
    envelope = {
        "cycle_id",
        "handler",
        "requires",
        "lesson_id",
        "lesson_text",
        "artifact_path",
    }
    return Cycle(
        cycle_id=CycleId(required_string(raw, "cycle_id")),
        handler=Handler(required_string(raw, "handler")),
        requires=tuple(requires),
        lesson_id=LessonId(required_string(raw, "lesson_id")),
        lesson_text=required_string(raw, "lesson_text"),
        artifact_path=required_string(raw, "artifact_path"),
        fixture_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        payload=MappingProxyType({key: value for key, value in raw.items() if key not in envelope}),
    )


def validate_cycle_contract(cycle: Cycle) -> None:
    if re.fullmatch(r"cycle-[0-9]{2}", cycle.cycle_id) is None:
        raise WorkflowError("cycle_id must use cycle-NN format")
    match cycle.handler:
        case Handler.METADATA:
            if (
                cycle.cycle_id != "cycle-00"
                or cycle.lesson_id != "safe-serialization-explicit-scope"
                or cycle.artifact_path != "../workflow-exemplo/VALIDACAO.md"
            ):
                raise WorkflowError("cycle-00 metadata contract mismatch")
        case (
            Handler.FILTER_NDJSON
            | Handler.PATCH_JSON_CONFIG
            | Handler.BUILD_RETRY_SCHEDULE
            | Handler.SNAPSHOT_TTL_CACHE
            | Handler.PLAN_TASK_DEPENDENCIES
            | Handler.PLAN_SAFE_RENAMES
            | Handler.CHECK_UNIFIED_DIFF
            | Handler.SUMMARIZE_ACCESS_LOG
            | Handler.MIGRATE_RECORDS
            | Handler.SCAN_SYNTHETIC_SECRETS
        ):
            if not cycle.requires:
                raise WorkflowError(f"{cycle.cycle_id} requires at least one lesson")
            expected = f"artifacts/{cycle.cycle_id}.json"
            if cycle.artifact_path != expected:
                raise WorkflowError(f"{cycle.cycle_id} artifact path must be {expected}")
        case unreachable:
            assert_never(unreachable)


def preflight(cycles: list[Cycle], prior: list[LedgerRecord]) -> None:
    prior_cycle_ids = {record["cycle_id"] for record in prior if record["status"] == "completed"}
    prior_lessons = {LessonId(record["lesson_id"]) for record in prior if record["status"] == "completed"}
    cycle_ids: set[CycleId] = set()
    lesson_ids: set[LessonId] = set()
    for cycle in cycles:
        validate_cycle_contract(cycle)
        if cycle.cycle_id in prior_cycle_ids:
            raise WorkflowError(f"duplicate completed cycle {cycle.cycle_id}")
        if cycle.cycle_id in cycle_ids or cycle.lesson_id in lesson_ids:
            raise WorkflowError(f"duplicate cycle or lesson {cycle.cycle_id}")
        if len(cycle.requires) != len(set(cycle.requires)):
            raise WorkflowError(f"duplicate requirement in {cycle.cycle_id}")
        cycle_ids.add(cycle.cycle_id)
        lesson_ids.add(cycle.lesson_id)
    available = prior_lessons | lesson_ids
    for cycle in cycles:
        for requirement in cycle.requires:
            if requirement not in available:
                raise WorkflowError(f"missing requirement {requirement} for {cycle.cycle_id}")
    graph = {cycle.lesson_id: cycle.requires for cycle in cycles}
    visiting: set[LessonId] = set()
    visited: set[LessonId] = set()

    def visit(lesson_id: LessonId) -> None:
        if lesson_id in visiting:
            raise WorkflowError(f"cyclic requirement at {lesson_id}")
        if lesson_id in visited:
            return
        visiting.add(lesson_id)
        for requirement in graph[lesson_id]:
            if requirement in graph:
                visit(requirement)
        visiting.remove(lesson_id)
        visited.add(lesson_id)

    for lesson_id in graph:
        visit(lesson_id)
    resolved = set(prior_lessons)
    for cycle in cycles:
        for requirement in cycle.requires:
            if requirement not in resolved:
                raise WorkflowError(f"forward requirement {requirement} for {cycle.cycle_id}")
        resolved.add(cycle.lesson_id)
