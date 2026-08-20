from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Final

from .contracts import (
    LedgerRecord,
    LessonId,
    LessonRecord,
    WorkflowError,
    parse_cycle,
    preflight,
)
from .registry import build_artifact
from .storage import append_ledger, atomic_write, read_ledger


REPORT_HEADER: Final = "# Workflow Lab Report\n\n> Derived projection; not independent evidence.\n"


def execute_locked(fixtures_dir: Path, output_dir: Path) -> dict[str, str | list[str]]:
    cycles = [parse_cycle(path) for path in sorted(fixtures_dir.glob("*.json"))]
    if not cycles:
        raise WorkflowError("no cycle fixtures found")
    prior = read_ledger(output_dir / "learning.ndjson")
    preflight(cycles, prior)
    lessons: dict[LessonId, LessonRecord] = {
        LessonId(record["lesson_id"]): {
            "lesson_id": record["lesson_id"],
            "lesson_text": record["lesson_text"],
        }
        for record in prior
        if record["status"] == "completed"
    }
    records: list[LedgerRecord] = []
    artifacts: list[tuple[Path, bytes]] = []
    for cycle in cycles:
        resolved = tuple(lessons[requirement] for requirement in cycle.requires)
        artifact = build_artifact(cycle, resolved)
        if artifact is not None:
            artifacts.append((output_dir / cycle.artifact_path, artifact))
        lesson: LessonRecord = {"lesson_id": cycle.lesson_id, "lesson_text": cycle.lesson_text}
        lessons[cycle.lesson_id] = lesson
        records.append(
            {
                "cycle_id": cycle.cycle_id,
                "handler": cycle.handler,
                "requires": list(cycle.requires),
                "resolved_requires": list(resolved),
                "fixture_sha256": cycle.fixture_sha256,
                "artifact_path": cycle.artifact_path,
                "lesson_id": cycle.lesson_id,
                "lesson_text": cycle.lesson_text,
                "status": "completed",
            }
        )
    report_records = [*prior, *records]
    report = REPORT_HEADER + "\n".join(
        f"- {record['cycle_id']}: {record['lesson_id']} ({record['status']})"
        for record in report_records
    )
    for path, content in artifacts:
        atomic_write(path, content)
    atomic_write(output_dir / "report.md", (report + "\n").encode())
    ledger = b"".join((json.dumps(record, ensure_ascii=False) + "\n").encode() for record in records)
    append_ledger(output_dir / "learning.ndjson", ledger)
    return {
        "cycles_completed": [record["cycle_id"] for record in records],
        "ledger": "learning.ndjson",
        "report": "report.md",
    }


def execute(fixtures_dir: Path, output_dir: Path) -> dict[str, str | list[str]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    lock_path = output_dir / ".writer.lock"
    try:
        descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise WorkflowError("another workflow lab writer is active") from None
    try:
        return execute_locked(fixtures_dir, output_dir)
    finally:
        os.close(descriptor)
        lock_path.unlink()
