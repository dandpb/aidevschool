from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import NoReturn, cast

from .contracts import Handler, JsonValue, LedgerRecord, LessonRecord, WorkflowError


LEDGER_KEYS = frozenset(
    {
        "cycle_id",
        "handler",
        "requires",
        "resolved_requires",
        "fixture_sha256",
        "artifact_path",
        "lesson_id",
        "lesson_text",
        "status",
    }
)
LESSON_KEYS = frozenset({"lesson_id", "lesson_text"})


def _malformed(line_number: int) -> NoReturn:
    raise WorkflowError(f"invalid ledger line {line_number}: malformed record")


def _parse_lesson_record(value: JsonValue, line_number: int) -> LessonRecord:
    if not isinstance(value, dict) or frozenset(value) != LESSON_KEYS:
        _malformed(line_number)
    lesson_id = value.get("lesson_id")
    lesson_text = value.get("lesson_text")
    if not isinstance(lesson_id, str) or not lesson_id:
        _malformed(line_number)
    if not isinstance(lesson_text, str) or not lesson_text:
        _malformed(line_number)
    return {"lesson_id": lesson_id, "lesson_text": lesson_text}


def _validated_ledger_record(value: JsonValue, line_number: int) -> LedgerRecord:
    if not isinstance(value, dict):
        raise WorkflowError(f"invalid ledger line {line_number}: expected an object")
    if frozenset(value) != LEDGER_KEYS:
        _malformed(line_number)
    string_fields = (
        "cycle_id",
        "handler",
        "fixture_sha256",
        "artifact_path",
        "lesson_id",
        "lesson_text",
        "status",
    )
    strings: dict[str, str] = {}
    for field in string_fields:
        field_value = value.get(field)
        if not isinstance(field_value, str) or not field_value:
            _malformed(line_number)
        strings[field] = field_value
    raw_requires = value.get("requires")
    if not isinstance(raw_requires, list):
        _malformed(line_number)
    requires: list[str] = []
    for requirement in raw_requires:
        if not isinstance(requirement, str) or not requirement:
            _malformed(line_number)
        requires.append(requirement)
    raw_resolved = value.get("resolved_requires")
    if not isinstance(raw_resolved, list):
        _malformed(line_number)
    resolved = [_parse_lesson_record(lesson, line_number) for lesson in raw_resolved]
    try:
        handler = Handler(strings["handler"])
    except ValueError:
        _malformed(line_number)
    cycle_id = strings["cycle_id"]
    artifact_path = strings["artifact_path"]
    if re.fullmatch(r"cycle-[0-9]{2}", cycle_id) is None:
        _malformed(line_number)
    if strings["status"] != "completed":
        _malformed(line_number)
    if re.fullmatch(r"[0-9a-f]{64}", strings["fixture_sha256"]) is None:
        _malformed(line_number)
    if len(requires) != len(set(requires)):
        _malformed(line_number)
    if [lesson["lesson_id"] for lesson in resolved] != requires:
        _malformed(line_number)
    if handler is Handler.METADATA:
        if (
            cycle_id != "cycle-00"
            or artifact_path != "../workflow-exemplo/VALIDACAO.md"
            or requires
        ):
            _malformed(line_number)
    elif cycle_id == "cycle-00" or not requires or artifact_path != f"artifacts/{cycle_id}.json":
        _malformed(line_number)
    return {
        "cycle_id": cycle_id,
        "handler": handler.value,
        "requires": requires,
        "resolved_requires": resolved,
        "fixture_sha256": strings["fixture_sha256"],
        "artifact_path": artifact_path,
        "lesson_id": strings["lesson_id"],
        "lesson_text": strings["lesson_text"],
        "status": "completed",
    }


def atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            _ = stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def read_ledger(path: Path) -> list[LedgerRecord]:
    if not path.exists():
        return []
    records: list[LedgerRecord] = []
    cycle_ids: set[str] = set()
    lessons: dict[str, LessonRecord] = {}
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        try:
            decoded = cast(JsonValue, json.loads(line))
        except json.JSONDecodeError as error:
            raise WorkflowError(f"invalid ledger line {line_number}: {error.msg}") from None
        record = _validated_ledger_record(decoded, line_number)
        if record["cycle_id"] in cycle_ids or record["lesson_id"] in lessons:
            _malformed(line_number)
        if any(lessons.get(lesson["lesson_id"]) != lesson for lesson in record["resolved_requires"]):
            _malformed(line_number)
        cycle_ids.add(record["cycle_id"])
        lessons[record["lesson_id"]] = {
            "lesson_id": record["lesson_id"],
            "lesson_text": record["lesson_text"],
        }
        records.append(record)
    return records


def append_ledger(path: Path, content: bytes) -> None:
    with path.open("ab") as stream:
        _ = stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())
