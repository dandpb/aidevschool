from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Final, assert_never

from ..contracts import Cycle, JsonValue, LessonRecord, WorkflowError
from .paths import canonical_relative_path


V1_KEYS: Final = frozenset({"version", "id", "name", "role"})
V2_KEYS: Final = frozenset({"version", "id", "display_name", "role"})
LAB_KEY: Final = re.compile(r"(?<![A-Za-z0-9_])LABKEY_[A-Z0-9]{12}(?![A-Za-z0-9_])")
LAB_TOKEN: Final = re.compile(r"(?<![A-Za-z0-9_])LABTOKEN_[A-Za-z0-9]{16}(?![A-Za-z0-9_])")
PATTERNS: Final = (("lab-key", LAB_KEY), ("lab-token", LAB_TOKEN))


@dataclass(frozen=True, slots=True)
class NormalizedRecord:
    record_id: str
    display_name: str
    role: str


@dataclass(frozen=True, slots=True)
class SourceFile:
    path: str
    content: str


@dataclass(frozen=True, slots=True)
class Finding:
    path: str
    line: int
    column: int
    pattern: str
    preview: str


def required_nonempty_string(value: JsonValue, field: str) -> str:
    match value:
        case str() as parsed if parsed:
            return parsed
        case str() | int() | float() | bool() | None | list() | dict():
            raise WorkflowError(f"record {field} must be a nonempty string")
        case unreachable:
            assert_never(unreachable)


def parse_record(value: JsonValue) -> NormalizedRecord:
    match value:
        case dict() as raw:
            return parse_record_mapping(raw)
        case str() | int() | float() | bool() | None | list():
            raise WorkflowError("records must contain objects")
        case unreachable:
            assert_never(unreachable)


def parse_record_mapping(raw: dict[str, JsonValue]) -> NormalizedRecord:
    version = raw.get("version")
    match version:
        case bool():
            raise WorkflowError("record version must be an integer")
        case 1:
            if set(raw) != V1_KEYS:
                raise WorkflowError("v1 record must have exact keys")
            return NormalizedRecord(
                required_nonempty_string(raw["id"], "id"),
                required_nonempty_string(raw["name"], "name"),
                required_nonempty_string(raw["role"], "role"),
            )
        case 2:
            if set(raw) != V2_KEYS:
                raise WorkflowError("v2 record must have exact keys")
            return NormalizedRecord(
                required_nonempty_string(raw["id"], "id"),
                required_nonempty_string(raw["display_name"], "display_name"),
                required_nonempty_string(raw["role"], "role"),
            )
        case int():
            raise WorkflowError("unsupported record version")
        case str() | float() | None | list() | dict():
            raise WorkflowError("record version must be an integer")
        case unreachable:
            assert_never(unreachable)


def migrate_records_v1_v2(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    raw_records = cycle.payload.get("records")
    match raw_records:
        case list() as records:
            parsed = tuple(parse_record(value) for value in records)
        case str() | int() | float() | bool() | None | dict():
            raise WorkflowError("records must be a list")
        case unreachable:
            assert_never(unreachable)
    if len({record.record_id for record in parsed}) != len(parsed):
        raise WorkflowError("records must have unique ids")
    artifact: dict[str, JsonValue] = {
        "records": [
            {
                "version": 2,
                "id": record.record_id,
                "display_name": record.display_name,
                "role": record.role,
            }
            for record in sorted(parsed, key=lambda record: record.record_id)
        ]
    }
    return serialize(artifact)


def parse_file(value: JsonValue) -> SourceFile:
    match value:
        case {"path": str() as path, "content": str() as content}:
            if set(value) != {"path", "content"}:
                raise WorkflowError("files must contain exact path and content strings")
            return SourceFile(canonical_relative_path(path), content)
        case dict():
            raise WorkflowError("files must contain exact path and content strings")
        case str() | int() | float() | bool() | None | list():
            raise WorkflowError("files must contain objects")
        case unreachable:
            assert_never(unreachable)


def scan_synthetic_secrets(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    raw_files = cycle.payload.get("files")
    match raw_files:
        case list() as files:
            parsed = tuple(parse_file(value) for value in files)
        case str() | int() | float() | bool() | None | dict():
            raise WorkflowError("files must be a list")
        case unreachable:
            assert_never(unreachable)
    if len({source.path for source in parsed}) != len(parsed):
        raise WorkflowError("files must have unique paths")
    findings = sorted(
        (
            Finding(source.path, line_number, match.start() + 1, name, redacted(line))
            for source in parsed
            for line_number, line in enumerate(source.content.splitlines(), start=1)
            for name, expression in PATTERNS
            for match in expression.finditer(line)
        ),
        key=lambda finding: (finding.path, finding.line, finding.column, finding.pattern),
    )
    artifact: dict[str, JsonValue] = {
        "files_scanned": len(parsed),
        "findings": [
            {
                "path": finding.path,
                "line": finding.line,
                "column": finding.column,
                "pattern": finding.pattern,
                "preview": finding.preview,
            }
            for finding in findings
        ],
        "findings_count": len(findings),
    }
    return serialize(artifact)


def redacted(line: str) -> str:
    return LAB_TOKEN.sub("[REDACTED]", LAB_KEY.sub("[REDACTED]", line))


def serialize(artifact: dict[str, JsonValue]) -> bytes:
    return (json.dumps(artifact, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode()
