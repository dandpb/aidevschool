from __future__ import annotations

import json

from ..contracts import (
    Cycle,
    JsonValue,
    LessonRecord,
    WorkflowError,
)


def patch_json_config(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    document = cycle.payload.get("document")
    patch = cycle.payload.get("patch")
    if not isinstance(document, dict) or not isinstance(patch, dict):
        raise WorkflowError("document and patch must be JSON objects")
    artifact: dict[str, JsonValue] = {**document, **patch}
    return (json.dumps(artifact, ensure_ascii=False, sort_keys=True) + "\n").encode()
