from __future__ import annotations

import json

import pytest

from docs.curso.workflow_lab.contracts import JsonValue, WorkflowError
from docs.curso.workflow_lab.handlers.planning import plan_safe_renames
from docs.curso.workflow_lab.planning_test_support import cycle


def test_plan_safe_renames_emits_sorted_dry_run_operations() -> None:
    given_cycle = cycle(
        {
            "files": ["notes/today.md", "docs/b.txt", "docs/a.txt"],
            "renames": [
                {"from": "docs/b.txt", "to": "archive/b.txt"},
                {"from": "docs/a.txt", "to": "archive/a.txt"},
            ],
        }
    )

    when_artifact = plan_safe_renames(given_cycle, ())

    then_payload = json.loads(when_artifact)
    assert then_payload == {
        "dry_run": True,
        "operations": [
            {"from": "docs/a.txt", "to": "archive/a.txt"},
            {"from": "docs/b.txt", "to": "archive/b.txt"},
        ],
    }


def test_plan_safe_renames_rejects_traversal_path() -> None:
    given_cycle = cycle(
        {
            "files": ["docs/a.txt"],
            "renames": [{"from": "docs/a.txt", "to": "archive/../a.txt"}],
        }
    )

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == "path must be a canonical relative POSIX path: 'archive/../a.txt'"


def test_plan_safe_renames_rejects_missing_source() -> None:
    given_cycle = cycle(
        {
            "files": ["docs/a.txt"],
            "renames": [{"from": "docs/b.txt", "to": "archive/b.txt"}],
        }
    )

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == "rename source must exist"


def test_plan_safe_renames_rejects_existing_target() -> None:
    given_cycle = cycle(
        {
            "files": ["docs/a.txt", "archive/a.txt"],
            "renames": [{"from": "docs/a.txt", "to": "archive/a.txt"}],
        }
    )

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == "rename target must not exist initially"


@pytest.mark.parametrize("raw_files", [None, "files", 1, 1.5, True, {}])
def test_plan_safe_renames_rejects_absent_or_non_list_files(raw_files: JsonValue) -> None:
    given_cycle = cycle({"files": raw_files, "renames": []})

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == "files must be a list"


@pytest.mark.parametrize("raw_renames", [None, "renames", 1, 1.5, True, {}])
def test_plan_safe_renames_rejects_absent_or_non_list_renames(
    raw_renames: JsonValue,
) -> None:
    given_cycle = cycle({"files": [], "renames": raw_renames})

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == "renames must be a list"


@pytest.mark.parametrize("raw_file", [None, 1, 1.5, True, [], {}])
def test_plan_safe_renames_rejects_non_path_file_entries(raw_file: JsonValue) -> None:
    given_cycle = cycle({"files": [raw_file], "renames": []})

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == "files must contain paths"


@pytest.mark.parametrize("raw_rename", [{}, [], "rename", 1, 1.5, True, None])
def test_plan_safe_renames_rejects_malformed_rename_entries(raw_rename: JsonValue) -> None:
    given_cycle = cycle({"files": [], "renames": [raw_rename]})

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == "renames must contain from and to paths"


def test_plan_safe_renames_rejects_duplicate_files_sources_and_targets() -> None:
    given_duplicate_files = cycle({"files": ["docs/a.txt", "docs/a.txt"], "renames": []})
    given_duplicate_sources = cycle(
        {
            "files": ["docs/a.txt"],
            "renames": [
                {"from": "docs/a.txt", "to": "archive/a.txt"},
                {"from": "docs/a.txt", "to": "archive/b.txt"},
            ],
        }
    )
    given_duplicate_targets = cycle(
        {
            "files": ["docs/a.txt", "docs/b.txt"],
            "renames": [
                {"from": "docs/a.txt", "to": "archive/a.txt"},
                {"from": "docs/b.txt", "to": "archive/a.txt"},
            ],
        }
    )

    with pytest.raises(WorkflowError) as when_duplicate_files:
        _ = plan_safe_renames(given_duplicate_files, ())
    with pytest.raises(WorkflowError) as when_duplicate_sources:
        _ = plan_safe_renames(given_duplicate_sources, ())
    with pytest.raises(WorkflowError) as when_duplicate_targets:
        _ = plan_safe_renames(given_duplicate_targets, ())

    assert when_duplicate_files.value.detail == "files must be unique"
    assert when_duplicate_sources.value.detail == "rename sources must be unique"
    assert when_duplicate_targets.value.detail == "rename targets must be unique"


@pytest.mark.parametrize("path", ["", "../outside.txt", "docs//a.txt", "docs/a.txt/"])
def test_plan_safe_renames_preserves_canonical_path_errors(path: str) -> None:
    given_cycle = cycle({"files": [path], "renames": []})

    with pytest.raises(WorkflowError) as when_error:
        _ = plan_safe_renames(given_cycle, ())

    assert when_error.value.detail == f"path must be a canonical relative POSIX path: {path!r}"


def test_plan_safe_renames_accepts_empty_inputs_with_exact_trailing_newline() -> None:
    given_cycle = cycle({"files": [], "renames": []})

    when_artifact = plan_safe_renames(given_cycle, ())

    assert when_artifact == b'{"dry_run": true, "operations": []}\n'
