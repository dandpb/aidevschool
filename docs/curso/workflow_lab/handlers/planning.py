from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Final, TypeAlias

from ..contracts import Cycle, JsonValue, LessonRecord, WorkflowError
from .paths import canonical_relative_path


@dataclass(frozen=True, slots=True)
class Task:
    task_id: str
    dependencies: tuple[str, ...]
    duration_minutes: int


@dataclass(frozen=True, slots=True)
class Rename:
    source: str
    target: str


TASK_LIST_ERROR: Final = "tasks must be a list"
FILE_LIST_ERROR: Final = "files must be a list"
RENAME_LIST_ERROR: Final = "renames must be a list"
ArtifactValue: TypeAlias = int | bool | list[str] | list[dict[str, str]]


def _required_list(cycle: Cycle, field: str, detail: str) -> list[JsonValue]:
    raw_items = cycle.payload.get(field)
    if not isinstance(raw_items, list):
        raise WorkflowError(detail)
    return raw_items


def _parse_dependencies(raw_dependencies: list[JsonValue]) -> tuple[str, ...]:
    dependencies: list[str] = []
    for raw_dependency in raw_dependencies:
        if not isinstance(raw_dependency, str):
            raise WorkflowError("task dependencies must be strings")
        dependencies.append(raw_dependency)
    return tuple(dependencies)


def _task_fields(raw_task: JsonValue) -> tuple[str, list[JsonValue], int]:
    if not isinstance(raw_task, dict):
        raise WorkflowError("tasks must contain task objects")
    task_id = raw_task.get("id")
    raw_dependencies = raw_task.get("depends_on")
    duration_minutes = raw_task.get("duration_minutes")
    if (
        not isinstance(task_id, str)
        or not isinstance(raw_dependencies, list)
        or not isinstance(duration_minutes, int)
    ):
        raise WorkflowError("tasks must contain task objects")
    return task_id, raw_dependencies, duration_minutes


def _parse_task(raw_task: JsonValue) -> Task:
    task_id, raw_dependencies, duration_minutes = _task_fields(raw_task)
    if not task_id or type(duration_minutes) is not int or duration_minutes <= 0:
        raise WorkflowError("tasks need nonempty ids and positive integer durations")
    return Task(task_id, _parse_dependencies(raw_dependencies), duration_minutes)


def _parse_tasks(raw_tasks: list[JsonValue]) -> tuple[Task, ...]:
    return tuple(_parse_task(raw_task) for raw_task in raw_tasks)


def _validate_task_graph(tasks: tuple[Task, ...]) -> None:
    task_ids = {task.task_id for task in tasks}
    if len(task_ids) != len(tasks):
        raise WorkflowError("task ids must be unique")
    for task in tasks:
        if len(task.dependencies) != len(set(task.dependencies)):
            raise WorkflowError(f"task {task.task_id} has duplicate dependencies")
        if any(dependency not in task_ids for dependency in task.dependencies):
            raise WorkflowError(f"task {task.task_id} depends on an unknown task")


def _ready_task_ids(remaining: dict[str, Task], completed: set[str]) -> list[str]:
    return sorted(
        task_id
        for task_id, task in remaining.items()
        if all(dependency in completed for dependency in task.dependencies)
    )


def _derive_task_order(tasks: tuple[Task, ...]) -> list[str]:
    remaining = {task.task_id: task for task in tasks}
    completed: set[str] = set()
    order: list[str] = []
    while remaining:
        ready = _ready_task_ids(remaining, completed)
        if not ready:
            raise WorkflowError("task dependencies contain a cycle")
        next_task_id = ready[0]
        completed.add(next_task_id)
        order.append(next_task_id)
        del remaining[next_task_id]
    return order


def _derive_critical_duration(tasks: tuple[Task, ...], order: list[str]) -> int:
    tasks_by_id = {task.task_id: task for task in tasks}
    durations: dict[str, int] = {}
    for task_id in order:
        task = tasks_by_id[task_id]
        durations[task_id] = task.duration_minutes + max(
            (durations[dependency] for dependency in task.dependencies), default=0
        )
    return max(durations.values(), default=0)


def _parse_files(raw_files: list[JsonValue]) -> tuple[str, ...]:
    files: list[str] = []
    for raw_file in raw_files:
        if not isinstance(raw_file, str):
            raise WorkflowError("files must contain paths")
        files.append(canonical_relative_path(raw_file))
    return tuple(files)


def _parse_renames(raw_renames: list[JsonValue]) -> tuple[Rename, ...]:
    renames: list[Rename] = []
    for raw_rename in raw_renames:
        if not isinstance(raw_rename, dict):
            raise WorkflowError("renames must contain from and to paths")
        source = raw_rename.get("from")
        target = raw_rename.get("to")
        if not isinstance(source, str) or not isinstance(target, str):
            raise WorkflowError("renames must contain from and to paths")
        renames.append(Rename(canonical_relative_path(source), canonical_relative_path(target)))
    return tuple(renames)


def _require_unique(values: set[str], item_count: int, detail: str) -> None:
    if len(values) != item_count:
        raise WorkflowError(detail)


def _validate_renames(files: tuple[str, ...], renames: tuple[Rename, ...]) -> None:
    initial_files = set(files)
    _require_unique(initial_files, len(files), "files must be unique")
    sources = {rename.source for rename in renames}
    targets = {rename.target for rename in renames}
    _require_unique(sources, len(renames), "rename sources must be unique")
    _require_unique(targets, len(renames), "rename targets must be unique")
    if not sources <= initial_files:
        raise WorkflowError("rename source must exist")
    if targets & initial_files:
        raise WorkflowError("rename target must not exist initially")


def _json_bytes(artifact: dict[str, ArtifactValue]) -> bytes:
    return (json.dumps(artifact, ensure_ascii=False, sort_keys=True) + "\n").encode()


def plan_task_dependencies(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    tasks = _parse_tasks(_required_list(cycle, "tasks", TASK_LIST_ERROR))
    _validate_task_graph(tasks)
    order = _derive_task_order(tasks)
    critical_duration = _derive_critical_duration(tasks, order)
    return _json_bytes({"order": order, "critical_duration_minutes": critical_duration})


def plan_safe_renames(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    files = _parse_files(_required_list(cycle, "files", FILE_LIST_ERROR))
    renames = _parse_renames(_required_list(cycle, "renames", RENAME_LIST_ERROR))
    _validate_renames(files, renames)
    return _json_bytes(
        {
            "dry_run": True,
            "operations": [
                {"from": rename.source, "to": rename.target}
                for rename in sorted(renames, key=lambda rename: rename.source)
            ],
        }
    )
