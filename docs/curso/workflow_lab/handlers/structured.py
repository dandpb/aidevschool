from __future__ import annotations

import json
from dataclasses import dataclass
from typing import assert_never

from ..contracts import Cycle, JsonValue, LessonRecord, LogLineError


@dataclass(frozen=True, slots=True)
class FilterInput:
    lines: tuple[str, ...]
    request_id: str
    level: str


@dataclass(frozen=True, slots=True)
class FilterPayloadError(TypeError):
    detail: str

    def __str__(self) -> str:
        return self.detail


def parse_lines(lines: list[JsonValue]) -> tuple[str, ...]:
    parsed: list[str] = []
    for line in lines:
        match line:
            case str():
                parsed.append(line)
            case int() | float() | bool() | None | list() | dict():
                raise FilterPayloadError("lines must contain strings")
            case unreachable:
                assert_never(unreachable)
    return tuple(parsed)


def parse_filter_input(cycle: Cycle) -> FilterInput:
    lines = cycle.payload.get("lines", [])
    request_id = cycle.payload.get("request_id", "")
    level = cycle.payload.get("level", "")
    if not isinstance(lines, list) or not isinstance(request_id, str) or not isinstance(level, str):
        raise FilterPayloadError("filter payload must contain lines, request_id, and level")
    return FilterInput(parse_lines(lines), request_id, level)


def filter_logs(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    inputs = parse_filter_input(cycle)
    matching: list[dict[str, JsonValue]] = []
    for line_number, line in enumerate(inputs.lines, start=1):
        try:
            decoded: JsonValue = json.loads(line)
        except json.JSONDecodeError as error:
            raise LogLineError(line_number, error.msg) from None
        match decoded:
            case {"request_id": str() as request_id, "level": str() as level} as record:
                if request_id == inputs.request_id and level == inputs.level:
                    matching.append(record)
            case dict() | str() | int() | float() | bool() | None | list():
                raise LogLineError(line_number, "expected object with string request_id and level")
            case unreachable:
                assert_never(unreachable)
    artifact = {"matching_records": matching, "counts_by_level": {inputs.level: len(matching)}}
    return (json.dumps(artifact, ensure_ascii=False, sort_keys=True) + "\n").encode()
