from __future__ import annotations

import json
from importlib import import_module

import pytest

import docs.curso.workflow_lab.handlers.config as config
from docs.curso.workflow_lab.contracts import (
    Cycle,
    CycleId,
    Handler,
    JsonValue,
    LessonId,
    WorkflowError,
)


reliability = import_module("docs.curso.workflow_lab.handlers.reliability")


def cycle(payload: dict[str, JsonValue]) -> Cycle:
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


def scheduled_attempt(attempt: int, delay: int, second: int) -> dict[str, JsonValue]:
    return {
        "attempt": attempt,
        "delay_before_seconds": delay,
        "scheduled_at": f"2026-08-19T12:00:{second:02}Z",
    }


def test_patch_json_config_replaces_top_level_values_and_preserves_null() -> None:
    given_cycle = cycle(
        {
            "document": {
                "enabled": True,
                "limits": {"burst": 5, "steady": 2},
                "region": "sa-east-1",
            },
            "patch": {"enabled": False, "limits": {"burst": 8}, "note": None},
        }
    )

    when_artifact = config.patch_json_config(given_cycle, ())

    assert when_artifact == (
        b'{"enabled": false, "limits": {"burst": 8}, "note": null, "region": "sa-east-1"}\n'
    )


def test_patch_json_config_rejects_non_object_inputs() -> None:
    given_cycle = cycle({"document": [], "patch": []})

    with pytest.raises(WorkflowError, match="document and patch must be JSON objects"):
        config.patch_json_config(given_cycle, ())


def test_build_retry_schedule_is_repeatable_from_explicit_time() -> None:
    given_cycle = cycle(
        {
            "start_at": "2026-08-19T12:00:00Z",
            "attempts": 5,
            "base_seconds": 3,
            "cap_seconds": 10,
        }
    )

    when_first = reliability.build_retry_schedule(given_cycle, ())

    then_schedule = json.loads(when_first)
    assert when_first == reliability.build_retry_schedule(given_cycle, ())
    assert then_schedule == {
        "schedule": [
            scheduled_attempt(1, 0, 0),
            scheduled_attempt(2, 3, 3),
            scheduled_attempt(3, 6, 9),
            scheduled_attempt(4, 10, 19),
            scheduled_attempt(5, 10, 29),
        ]
    }


@pytest.mark.parametrize(
    "payload",
    [
        {
            "start_at": "2026-08-19T12:00:00+00:00",
            "attempts": 1,
            "base_seconds": 1,
            "cap_seconds": 1,
        },
        {
            "start_at": "2026-08-19T12:00:00Z",
            "attempts": True,
            "base_seconds": 1,
            "cap_seconds": 1,
        },
        {
            "start_at": "2026-08-19T12:00:00Z",
            "attempts": 1,
            "base_seconds": 0,
            "cap_seconds": 1,
        },
    ],
)
def test_retry_schedule_rejects_invalid_time_and_nonpositive_values(
    payload: dict[str, JsonValue],
) -> None:
    given_cycle = cycle(payload)

    with pytest.raises(WorkflowError):
        reliability.build_retry_schedule(given_cycle, ())


def test_snapshot_ttl_cache_expires_before_lru_ranking() -> None:
    given_cycle = cycle(
        {
            "now": "2026-08-19T12:00:00Z",
            "max_entries": 2,
            "entries": [
                {
                    "key": "alpha",
                    "value": "A",
                    "last_accessed_at": "2026-08-19T11:00:00Z",
                    "expires_at": "2026-08-19T12:00:00Z",
                },
                {
                    "key": "beta",
                    "value": "B",
                    "last_accessed_at": "2026-08-19T11:00:00Z",
                    "expires_at": None,
                },
                {
                    "key": "gamma",
                    "value": "G",
                    "last_accessed_at": "2026-08-19T11:00:00Z",
                    "expires_at": None,
                },
                {
                    "key": "delta",
                    "value": "D",
                    "last_accessed_at": "2026-08-19T11:30:00Z",
                    "expires_at": None,
                },
            ],
        }
    )

    when_artifact = reliability.snapshot_ttl_cache(given_cycle, ())

    then_snapshot = json.loads(when_artifact)
    assert then_snapshot == {
        "entries": [
            {
                "key": "delta",
                "value": "D",
                "last_accessed_at": "2026-08-19T11:30:00Z",
                "expires_at": None,
            },
            {
                "key": "gamma",
                "value": "G",
                "last_accessed_at": "2026-08-19T11:00:00Z",
                "expires_at": None,
            },
        ],
        "evicted_keys": ["beta"],
        "expired_keys": ["alpha"],
    }


@pytest.mark.parametrize(
    "payload",
    [
        {
            "now": "2026-08-19T12:00:00Z",
            "max_entries": 1,
            "entries": [
                {
                    "key": "duplicate",
                    "value": 1,
                    "last_accessed_at": "2026-08-19T11:00:00Z",
                    "expires_at": None,
                },
                {
                    "key": "duplicate",
                    "value": 2,
                    "last_accessed_at": "2026-08-19T11:01:00Z",
                    "expires_at": None,
                },
            ],
        },
        {
            "now": "2026-08-19T12:00:00Z",
            "max_entries": 1,
            "entries": [
                {
                    "key": "bad-time",
                    "value": 1,
                    "last_accessed_at": "bad",
                    "expires_at": None,
                }
            ],
        },
        {"now": "2026-08-19T12:00:00Z", "max_entries": True, "entries": []},
        {"now": "2026-08-19T12:00:00Z", "max_entries": -1, "entries": []},
    ],
)
def test_snapshot_ttl_cache_rejects_duplicate_bad_time_and_capacity(
    payload: dict[str, JsonValue],
) -> None:
    given_cycle = cycle(payload)

    with pytest.raises(WorkflowError):
        reliability.snapshot_ttl_cache(given_cycle, ())
