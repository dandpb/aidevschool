from __future__ import annotations

from collections.abc import Mapping

from docs.curso.workflow_lab.contracts import (
    Cycle,
    CycleId,
    Handler,
    JsonValue,
    LessonId,
)


def cycle(payload: Mapping[str, JsonValue]) -> Cycle:
    return Cycle(
        cycle_id=CycleId("cycle-test"),
        handler=Handler.METADATA,
        requires=(),
        lesson_id=LessonId("lesson-test"),
        lesson_text="test",
        artifact_path="artifacts/test.json",
        fixture_sha256="test",
        payload=payload,
    )
