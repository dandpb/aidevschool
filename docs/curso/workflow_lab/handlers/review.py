from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Final

from ..contracts import Cycle, JsonValue, LessonRecord, WorkflowError
from .paths import canonical_relative_path


HUNK: Final = re.compile(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")
ACCESS_LINE: Final = re.compile(
    r"(GET|POST|PUT|PATCH|DELETE) (/[-A-Za-z0-9._~/%]*) ([1-5][0-9]{2}) (0|[1-9][0-9]*)"
)


@dataclass(frozen=True, slots=True)
class DiffFile:
    path: str
    added_lines: int
    deleted_lines: int


@dataclass(frozen=True, slots=True)
class AccessRecord:
    method: str
    status: str
    latency: int


def diff_payload(cycle: Cycle) -> tuple[set[str], int, int, str]:
    allowed_paths = cycle.payload.get("allowed_paths")
    max_files = cycle.payload.get("max_files")
    max_changed_lines = cycle.payload.get("max_changed_lines")
    diff = cycle.payload.get("diff")
    if not isinstance(allowed_paths, list) or not isinstance(diff, str):
        raise WorkflowError("diff payload is invalid")
    if type(max_files) is not int or type(max_changed_lines) is not int:
        raise WorkflowError("max_files and max_changed_lines must be integers")
    if max_files < 0 or max_changed_lines < 0:
        raise WorkflowError("max_files and max_changed_lines must be nonnegative")
    paths: set[str] = set()
    for raw_path in allowed_paths:
        if not isinstance(raw_path, str):
            raise WorkflowError("allowed_paths must contain canonical paths")
        paths.add(canonical_relative_path(raw_path))
    return paths, max_files, max_changed_lines, diff


def header_path(line: str, prefix: str) -> str:
    if not line.startswith(prefix):
        raise WorkflowError("diff requires matching file headers")
    return canonical_relative_path(line.removeprefix(prefix))


def parse_diff(diff: str) -> tuple[DiffFile, ...]:
    lines = diff.splitlines()
    files: list[DiffFile] = []
    seen_paths: set[str] = set()
    index = 0
    while index < len(lines):
        old_path = header_path(lines[index], "--- a/")
        if index + 1 >= len(lines):
            raise WorkflowError("diff requires matching file headers")
        new_path = header_path(lines[index + 1], "+++ b/")
        if old_path != new_path or old_path in seen_paths:
            raise WorkflowError("diff paths must be unique same-path modifications")
        seen_paths.add(old_path)
        index += 2
        added_lines = 0
        deleted_lines = 0
        hunk_count = 0
        while index < len(lines) and lines[index].startswith("@@ "):
            match = HUNK.fullmatch(lines[index])
            if match is None:
                raise WorkflowError("diff contains a malformed hunk")
            old_count = int(match[2] or "1")
            new_count = int(match[4] or "1")
            index += 1
            old_seen = 0
            new_seen = 0
            while index < len(lines) and not lines[index].startswith(("@@ ", "--- a/")):
                marker = lines[index][:1]
                if marker not in {" ", "+", "-"}:
                    raise WorkflowError("diff contains non-text content")
                old_seen += marker in {" ", "-"}
                new_seen += marker in {" ", "+"}
                deleted_lines += marker == "-"
                added_lines += marker == "+"
                index += 1
            if old_seen != old_count or new_seen != new_count:
                raise WorkflowError("diff hunk line counts do not match")
            hunk_count += 1
        if hunk_count == 0:
            raise WorkflowError("diff requires at least one hunk per file")
        if added_lines + deleted_lines == 0:
            raise WorkflowError("diff hunk requires a text modification")
        files.append(DiffFile(old_path, added_lines, deleted_lines))
    if not files:
        raise WorkflowError("diff must not be empty")
    return tuple(files)


def check_unified_diff(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    allowed_paths, max_files, max_changed_lines, diff = diff_payload(cycle)
    files = parse_diff(diff)
    changed_lines = sum(file.added_lines + file.deleted_lines for file in files)
    reasons: list[JsonValue] = [f"disallowed path: {path}" for path in sorted(
        file.path for file in files if file.path not in allowed_paths
    )]
    if len(files) > max_files:
        reasons.append(f"file limit exceeded: {len(files)} > {max_files}")
    if changed_lines > max_changed_lines:
        reasons.append(f"changed-line limit exceeded: {changed_lines} > {max_changed_lines}")
    summaries: list[JsonValue] = [
        {"path": file.path, "added_lines": file.added_lines, "deleted_lines": file.deleted_lines}
        for file in sorted(files, key=lambda file: file.path)
    ]
    artifact: dict[str, JsonValue] = {
        "allowed": not reasons,
        "changed_lines": changed_lines,
        "files": summaries,
        "reasons": reasons,
    }
    return (json.dumps(artifact, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode()


def access_records(cycle: Cycle) -> tuple[AccessRecord, ...]:
    raw_lines = cycle.payload.get("lines")
    if not isinstance(raw_lines, list):
        raise WorkflowError("lines must be a list")
    records: list[AccessRecord] = []
    for raw_line in raw_lines:
        if not isinstance(raw_line, str):
            raise WorkflowError("lines must contain strings")
        match = ACCESS_LINE.fullmatch(raw_line)
        if match is None:
            raise WorkflowError("access log contains a malformed line")
        records.append(AccessRecord(match[1], match[3], int(match[4])))
    if not records:
        raise WorkflowError("access log must contain a record")
    return tuple(records)


def summarize_access_log(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    records = access_records(cycle)
    method_counts: dict[str, int] = {}
    status_counts: dict[str, int] = {}
    for record in records:
        method_counts[record.method] = method_counts.get(record.method, 0) + 1
        status_counts[record.status] = status_counts.get(record.status, 0) + 1
    latencies = sorted(record.latency for record in records)
    count = len(latencies)
    by_method: dict[str, JsonValue] = {
        method: method_count for method, method_count in method_counts.items()
    }
    by_status: dict[str, JsonValue] = {
        status: status_count for status, status_count in status_counts.items()
    }
    artifact: dict[str, JsonValue] = {
        "request_count": count,
        "by_method": by_method,
        "by_status": by_status,
        "latency": {
            "p50": latencies[(count - 1) // 2],
            "p95": latencies[(95 * count + 99) // 100 - 1],
        },
    }
    return (json.dumps(artifact, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode()
