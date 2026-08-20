from __future__ import annotations

import json

import pytest

from docs.curso.workflow_lab.contracts import JsonValue, WorkflowError
from docs.curso.workflow_lab.handlers.planning import plan_task_dependencies
from docs.curso.workflow_lab.planning_test_support import cycle


def test_plan_task_dependencies_emits_fixture_artifact() -> None:
    given_cycle = cycle(
        {
            "tasks": [
                {"id": "package", "depends_on": ["test"], "duration_minutes": 2},
                {"id": "test", "depends_on": ["build"], "duration_minutes": 3},
                {"id": "lint", "depends_on": ["fetch"], "duration_minutes": 1},
                {"id": "fetch", "depends_on": [], "duration_minutes": 1},
                {"id": "build", "depends_on": ["lint"], "duration_minutes": 2},
            ]
        }
    )

    when_artifact = plan_task_dependencies(given_cycle, ())

    then_payload = json.loads(when_artifact)
    assert then_payload == {
        "critical_duration_minutes": 9,
        "order": ["fetch", "lint", "build", "test", "package"],
    }


def test_plan_task_dependencies_uses_lexical_ready_task_order() -> None:
    given_cycle = cycle(
        {
            "tasks": [
                {"id": "zulu", "depends_on": [], "duration_minutes": 1},
                {"id": "alpha", "depends_on": [], "duration_minutes": 1},
            ]
        }
    )

    when_artifact = plan_task_dependencies(given_cycle, ())

    then_payload = json.loads(when_artifact)
    assert then_payload["order"] == ["alpha", "zulu"]


def test_plan_task_dependencies_rejects_missing_dependency() -> None:
    given_cycle = cycle(
        {"tasks": [{"id": "build", "depends_on": ["fetch"], "duration_minutes": 1}]}
    )

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_task_dependencies(given_cycle, ())

    assert when_error.value.detail == "task build depends on an unknown task"


@pytest.mark.parametrize("raw_tasks", [None, "tasks", 1, 1.5, True, {}])
def test_plan_task_dependencies_rejects_absent_or_non_list_tasks(raw_tasks: JsonValue) -> None:
    given_cycle = cycle({"tasks": raw_tasks})

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_task_dependencies(given_cycle, ())

    assert when_error.value.detail == "tasks must be a list"


@pytest.mark.parametrize("raw_task", [{}, [], "task", 1, 1.5, True, None])
def test_plan_task_dependencies_rejects_malformed_task_entries(raw_task: JsonValue) -> None:
    given_cycle = cycle({"tasks": [raw_task]})

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_task_dependencies(given_cycle, ())

    assert when_error.value.detail == "tasks must contain task objects"


@pytest.mark.parametrize("duration_minutes", [False, 0, -1])
def test_plan_task_dependencies_rejects_empty_ids_and_nonpositive_durations(
    duration_minutes: int | bool,
) -> None:
    given_cycle = cycle(
        {
            "tasks": [
                {"id": "", "depends_on": [], "duration_minutes": duration_minutes}
            ]
        }
    )

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_task_dependencies(given_cycle, ())

    assert when_error.value.detail == "tasks need nonempty ids and positive integer durations"


@pytest.mark.parametrize("dependency", [None, 1, 1.5, True, [], {}])
def test_plan_task_dependencies_rejects_non_string_dependencies(
    dependency: JsonValue,
) -> None:
    given_cycle = cycle(
        {
            "tasks": [
                {"id": "build", "depends_on": [dependency], "duration_minutes": 1}
            ]
        }
    )

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_task_dependencies(given_cycle, ())

    assert when_error.value.detail == "task dependencies must be strings"


def test_plan_task_dependencies_rejects_duplicate_ids_and_dependencies() -> None:
    given_duplicate_ids = cycle(
        {
            "tasks": [
                {"id": "build", "depends_on": [], "duration_minutes": 1},
                {"id": "build", "depends_on": [], "duration_minutes": 1},
            ]
        }
    )
    given_duplicate_dependencies = cycle(
        {
            "tasks": [
                {"id": "fetch", "depends_on": [], "duration_minutes": 1},
                {
                    "id": "build",
                    "depends_on": ["fetch", "fetch"],
                    "duration_minutes": 1,
                },
            ]
        }
    )

    with pytest.raises(WorkflowError) as when_duplicate_id:
        _ = plan_task_dependencies(given_duplicate_ids, ())
    with pytest.raises(WorkflowError) as when_duplicate_dependency:
        _ = plan_task_dependencies(given_duplicate_dependencies, ())

    assert when_duplicate_id.value.detail == "task ids must be unique"
    assert when_duplicate_dependency.value.detail == "task build has duplicate dependencies"


def test_plan_task_dependencies_emits_exact_utf8_json_with_trailing_newline() -> None:
    given_cycle = cycle(
        {"tasks": [{"id": "ação", "depends_on": [], "duration_minutes": 4}]}
    )

    when_artifact = plan_task_dependencies(given_cycle, ())

    assert when_artifact == (
        b'{"critical_duration_minutes": 4, "order": ["a\xc3\xa7\xc3\xa3o"]}\n'
    )


def test_plan_task_dependencies_accepts_empty_input() -> None:
    given_cycle = cycle({"tasks": []})

    when_artifact = plan_task_dependencies(given_cycle, ())

    assert when_artifact == b'{"critical_duration_minutes": 0, "order": []}\n'


def test_plan_task_dependencies_rejects_dependency_cycle() -> None:
    given_cycle = cycle(
        {
            "tasks": [
                {"id": "build", "depends_on": ["test"], "duration_minutes": 1},
                {"id": "test", "depends_on": ["build"], "duration_minutes": 1},
            ]
        }
    )

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_task_dependencies(given_cycle, ())

    assert when_error.value.detail == "task dependencies contain a cycle"
