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
    LessonRecord,
    WorkflowError,
)
from docs.curso.workflow_lab.handlers.safety import (
    migrate_records_v1_v2,
    scan_synthetic_secrets,
)


FIXTURES = Path(__file__).with_name("fixtures")
RESOLVED: tuple[LessonRecord, ...] = ()


def load_cycle(name: str) -> Cycle:
    raw = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return Cycle(
        cycle_id=CycleId(raw["cycle_id"]),
        handler=Handler.METADATA,
        requires=(),
        lesson_id=LessonId(raw["lesson_id"]),
        lesson_text=raw["lesson_text"],
        artifact_path=raw["artifact_path"],
        fixture_sha256="test-fixture",
        payload={key: value for key, value in raw.items() if key == "records" or key == "files"},
    )


def cycle_with_payload(payload: dict[str, JsonValue]) -> Cycle:
    return Cycle(
        cycle_id=CycleId("test"),
        handler=Handler.METADATA,
        requires=(),
        lesson_id=LessonId("test"),
        lesson_text="test",
        artifact_path="artifacts/test.json",
        fixture_sha256="test",
        payload=payload,
    )


def test_migrate_records_v1_v2_normalizes_fixture_in_id_order() -> None:
    # Given: the mixed-version cycle fixture.
    given_cycle = load_cycle("09-cycle-09.json")

    # When: records are migrated.
    when_output = migrate_records_v1_v2(given_cycle, RESOLVED)

    # Then: every record is canonical v2 and sorted by id.
    assert when_output == (
        b'{"records":[{"display_name":"Ada","id":"u-1","role":"learner","version":2},'
        b'{"display_name":"Grace","id":"u-2","role":"mentor","version":2}]}\n'
    )


def test_migrate_records_v1_v2_is_idempotent_for_normalized_records() -> None:
    # Given: canonical v2 output used as the next cycle payload.
    given_first_output = migrate_records_v1_v2(load_cycle("09-cycle-09.json"), RESOLVED)
    given_next_cycle = cycle_with_payload(json.loads(given_first_output))

    # When: the normalized records are migrated again.
    when_output = migrate_records_v1_v2(given_next_cycle, RESOLVED)

    # Then: serialization remains byte-for-byte identical.
    assert when_output == given_first_output


@pytest.mark.parametrize(
    ("records", "detail"),
    [
        ([{"version": 3, "id": "u-1", "name": "Ada", "role": "learner"}], "unsupported"),
        ([{"version": 1, "id": "u-1", "role": "learner"}], "exact"),
        ([{"version": 2, "id": "u-1", "display_name": "Ada", "role": "learner", "extra": "x"}], "exact"),
        ([{"version": 1, "id": "u-1", "name": "Ada", "display_name": "Ada", "role": "learner"}], "exact"),
        ([{"version": True, "id": "u-1", "name": "Ada", "role": "learner"}], "version"),
        ([{"version": 1, "id": "", "name": "Ada", "role": "learner"}], "nonempty"),
        ([{"version": 1, "id": "u-1", "name": "Ada", "role": 1}], "string"),
        ([{"version": 1, "id": "u-1", "name": "Ada", "role": "learner"}, {"version": 2, "id": "u-1", "display_name": "Grace", "role": "mentor"}], "unique"),
    ],
)
def test_migrate_records_v1_v2_rejects_invalid_record_schemas(
    records: list[JsonValue], detail: str
) -> None:
    # Given: a payload with a schema violation.
    given_cycle = cycle_with_payload({"records": records})

    # When: migration validates the complete collection.
    # Then: no partial migration occurs and the violation is surfaced.
    with pytest.raises(WorkflowError, match=detail):
        migrate_records_v1_v2(given_cycle, RESOLVED)


def test_scan_synthetic_secrets_reports_sorted_redacted_fixture_findings() -> None:
    # Given: the synthetic-secret fixture with deliberately unordered files.
    given_cycle = load_cycle("10-cycle-10.json")

    # When: its explicitly scoped files are scanned.
    when_output = scan_synthetic_secrets(given_cycle, RESOLVED)

    # Then: findings use stable order, 1-based positions, and redacted previews.
    assert when_output == (
        b'{"files_scanned":3,"findings":[{"column":23,"line":1,"path":"src/a.py",'
        b'"pattern":"lab-token","preview":"Authorization: Bearer [REDACTED]"},'
        b'{"column":10,"line":1,"path":"src/z.py","pattern":"lab-key",'
        b'"preview":"lab_key =[REDACTED]"}],"findings_count":2}\n'
    )
    assert b"LABKEY_" not in when_output
    assert b"LABTOKEN_" not in when_output


@pytest.mark.parametrize(
    "files",
        [
            [{"path": "../secrets.txt", "content": "clean"}],
            [{"path": "src/a.py", "content": "clean"}, {"path": "src/a.py", "content": "clean"}],
            [{"path": "src/a.py", "content": "clean", "extra": "x"}],
            [{"path": "src/a.py", "content": 1}],
        ],
)
def test_scan_synthetic_secrets_rejects_invalid_file_payloads(files: list[JsonValue]) -> None:
    # Given: a payload that escapes scope or repeats a canonical path.
    given_cycle = cycle_with_payload({"files": files})

    # When: the scanner validates all file entries.
    # Then: it fails closed before generating a report.
    with pytest.raises(WorkflowError):
        scan_synthetic_secrets(given_cycle, RESOLVED)


def test_scan_synthetic_secrets_ignores_lookalikes() -> None:
    # Given: strings which contain but do not delimit the fixed synthetic patterns.
    given_cycle = cycle_with_payload(
        {
            "files": [
                {
                    "path": "src/example.py",
                    "content": "xLABKEY_ABCDEFGHIJKL LABTOKEN_abcdefghijklmnopq LABKEY_ABCDEFGHIJKL_",
                }
            ]
        }
    )

    # When: the scanner evaluates the fixed patterns.
    when_output = scan_synthetic_secrets(given_cycle, RESOLVED)

    # Then: no lookalike is reported.
    assert when_output == b'{"files_scanned":1,"findings":[],"findings_count":0}\n'
