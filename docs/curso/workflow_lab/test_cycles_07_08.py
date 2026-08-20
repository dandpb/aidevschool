from __future__ import annotations

import json
from pathlib import Path

import pytest

from docs.curso.workflow_lab.contracts import (
    Cycle,
    CycleId,
    Handler,
    JsonValue,
    LessonId,
    WorkflowError,
)
from docs.curso.workflow_lab.handlers.review import check_unified_diff, summarize_access_log


FIXTURES = Path(__file__).with_name("fixtures")


def cycle_from_fixture(name: str) -> Cycle:
    raw = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    envelope = {"cycle_id", "handler", "requires", "lesson_id", "lesson_text", "artifact_path"}
    payload: dict[str, JsonValue] = {key: value for key, value in raw.items() if key not in envelope}
    return Cycle(
        CycleId(raw["cycle_id"]),
        Handler.METADATA,
        tuple(LessonId(value) for value in raw["requires"]),
        LessonId(raw["lesson_id"]),
        raw["lesson_text"],
        raw["artifact_path"],
        "fixture",
        payload,
    )


def cycle_with_payload(cycle: Cycle, payload: dict[str, JsonValue]) -> Cycle:
    return Cycle(
        cycle.cycle_id,
        cycle.handler,
        cycle.requires,
        cycle.lesson_id,
        cycle.lesson_text,
        cycle.artifact_path,
        cycle.fixture_sha256,
        payload,
    )


def test_check_unified_diff_when_allowed_fixture_returns_exact_artifact() -> None:
    given_cycle = cycle_from_fixture("07-cycle-07.json")

    when_artifact = check_unified_diff(given_cycle, ())

    then_expected = (
        b'{"allowed":true,"changed_lines":4,"files":[{"added_lines":1,'
        b'"deleted_lines":1,"path":"docs/guide.md"},{"added_lines":1,'
        b'"deleted_lines":1,"path":"src/app.py"}],"reasons":[]}\n'
    )
    assert when_artifact == then_expected


def test_check_unified_diff_when_path_and_budgets_violate_policy_returns_denial() -> None:
    given_cycle = cycle_from_fixture("07-cycle-07.json")
    payload = dict(given_cycle.payload)
    payload["max_files"] = 1
    payload["max_changed_lines"] = 3
    diff = payload["diff"]
    assert isinstance(diff, str)
    payload["diff"] = diff + "--- a/docs/extra.md\n+++ b/docs/extra.md\n@@ -1 +1 @@\n-old\n+new\n"
    given_denied = cycle_with_payload(given_cycle, payload)

    when_artifact = check_unified_diff(given_denied, ())

    then_expected = (
        b'{"allowed":false,"changed_lines":6,"files":[{"added_lines":1,'
        b'"deleted_lines":1,"path":"docs/extra.md"},{"added_lines":1,'
        b'"deleted_lines":1,"path":"docs/guide.md"},{"added_lines":1,'
        b'"deleted_lines":1,"path":"src/app.py"}],"reasons":["disallowed path: docs/extra.md",'
        b'"file limit exceeded: 3 > 1",'
        b'"changed-line limit exceeded: 6 > 3"]}\n'
    )
    assert when_artifact == then_expected


@pytest.mark.parametrize(
    "diff",
    [
        "--- a/docs/guide.md\n+++ b/docs/guide.md\n@@ -1,2 +1 @@\n-old\n+new\n",
        "--- a/docs/guide.md\n+++ b/docs/guide.md\n@@ -1 +1 @@\n context\n",
    ],
)
def test_check_unified_diff_when_hunk_is_malformed_raises_workflow_error(diff: str) -> None:
    given_cycle = cycle_from_fixture("07-cycle-07.json")
    payload = dict(given_cycle.payload)
    payload["diff"] = diff
    given_malformed = cycle_with_payload(given_cycle, payload)

    with pytest.raises(WorkflowError, match="hunk"):
        check_unified_diff(given_malformed, ())


def test_summarize_access_log_when_fixture_is_valid_returns_exact_artifact() -> None:
    given_cycle = cycle_from_fixture("08-cycle-08.json")

    when_artifact = summarize_access_log(given_cycle, ())

    then_expected = (
        b'{"by_method":{"GET":3,"POST":2},"by_status":{"200":2,"201":1,'
        b'"404":1,"500":1},"latency":{"p50":100,"p95":400},"request_count":5}\n'
    )
    assert when_artifact == then_expected


def test_summarize_access_log_when_two_latencies_uses_nearest_rank_quantiles() -> None:
    given_cycle = cycle_from_fixture("08-cycle-08.json")
    payload = dict(given_cycle.payload)
    payload["lines"] = ["GET /one 200 1", "GET /two 200 2"]
    given_two_lines = cycle_with_payload(given_cycle, payload)

    when_artifact = json.loads(summarize_access_log(given_two_lines, ()))

    assert when_artifact["latency"] == {"p50": 1, "p95": 2}


@pytest.mark.parametrize(
    "lines",
    [[], ["GET /ok 200 1", "BROKEN"], ["GET /ok 200 1", "", "GET /ok 200 2"]],
)
def test_summarize_access_log_when_input_is_empty_or_malformed_raises_before_artifact(
    lines: list[str],
) -> None:
    given_cycle = cycle_from_fixture("08-cycle-08.json")
    payload = dict(given_cycle.payload)
    payload["lines"] = list(lines)
    given_invalid = cycle_with_payload(given_cycle, payload)

    with pytest.raises(WorkflowError):
        summarize_access_log(given_invalid, ())
