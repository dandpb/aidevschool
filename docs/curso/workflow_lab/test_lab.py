from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import TypedDict

LAB = Path(__file__).with_name("lab.py")


class RunResult(TypedDict):
    process: subprocess.CompletedProcess[str]
    output: Path


def write_fixture(path: Path, payload: dict[str, str | list[str]]) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def run_lab(tmp_path: Path, fixtures: list[dict[str, str | list[str]]]) -> RunResult:
    fixtures_dir = tmp_path / "fixtures"
    output_dir = tmp_path / "output"
    fixtures_dir.mkdir()
    for index, fixture in enumerate(fixtures):
        write_fixture(fixtures_dir / f"{index:02}.json", fixture)
    process = subprocess.run(
        [sys.executable, str(LAB), "--fixtures", str(fixtures_dir), "--output", str(output_dir)],
        check=False,
        capture_output=True,
        text=True,
    )
    return {"process": process, "output": output_dir}


def cycle_00() -> dict[str, str | list[str]]:
    return {
        "cycle_id": "cycle-00",
        "handler": "metadata-only",
        "requires": [],
        "lesson_id": "safe-serialization-explicit-scope",
        "lesson_text": "Serialize only explicitly selected, validated fields.",
        "artifact_path": "../workflow-exemplo/VALIDACAO.md",
    }


def cycle_01(lines: list[str] | None = None) -> dict[str, str | list[str]]:
    return {
        "cycle_id": "cycle-01",
        "handler": "filter-ndjson",
        "requires": ["safe-serialization-explicit-scope"],
        "lesson_id": "ndjson-exact-and-filter",
        "lesson_text": "Filter valid NDJSON records with exact AND matching.",
        "artifact_path": "artifacts/cycle-01.json",
        "lines": lines
        or [
            '{"request_id":"req-1","level":"error","message":"first"}',
            '{"request_id":"req-2","level":"error","message":"other"}',
            '{"request_id":"req-1","level":"info","message":"wrong level"}',
            '{"request_id":"req-1","level":"error","message":"last"}',
        ],
        "request_id": "req-1",
        "level": "error",
    }


def test_cli_filters_ndjson_and_records_cycles(tmp_path: Path) -> None:
    given_fixtures = [cycle_00(), cycle_01()]
    when_result = run_lab(tmp_path, given_fixtures)
    then_process = when_result["process"]

    assert then_process.returncode == 0, then_process.stderr
    assert json.loads(then_process.stdout) == {
        "cycles_completed": ["cycle-00", "cycle-01"],
        "ledger": "learning.ndjson",
        "report": "report.md",
    }
    artifact = json.loads((when_result["output"] / "artifacts/cycle-01.json").read_text())
    assert artifact == {
        "matching_records": [
            {"request_id": "req-1", "level": "error", "message": "first"},
            {"request_id": "req-1", "level": "error", "message": "last"},
        ],
        "counts_by_level": {"error": 2},
    }
    ledger = [
        json.loads(line)
        for line in (when_result["output"] / "learning.ndjson").read_text().splitlines()
    ]
    assert [record["cycle_id"] for record in ledger] == ["cycle-00", "cycle-01"]
    assert ledger[1]["resolved_requires"] == [
        {
            "lesson_id": "safe-serialization-explicit-scope",
            "lesson_text": "Serialize only explicitly selected, validated fields.",
        }
    ]
    assert (when_result["output"] / "report.md").read_text().startswith(
        "# Workflow Lab Report\n\n> Derived projection; not independent evidence."
    )


def test_cli_reports_malformed_ndjson_line_before_writing(tmp_path: Path) -> None:
    given_lines = ['{"request_id":"req-1","level":"error"}', "not-json"]
    when_result = run_lab(tmp_path, [cycle_00(), cycle_01(given_lines)])
    then_process = when_result["process"]

    assert then_process.returncode != 0
    assert "line 2" in then_process.stderr
    assert not (when_result["output"] / "artifacts/cycle-01.json").exists()
    assert not (when_result["output"] / "learning.ndjson").exists()


def test_cli_rejects_missing_requirement_during_preflight(tmp_path: Path) -> None:
    given_fixture = cycle_01()
    when_result = run_lab(tmp_path, [given_fixture])
    then_process = when_result["process"]

    assert then_process.returncode != 0
    assert "missing requirement safe-serialization-explicit-scope" in then_process.stderr
    assert not (when_result["output"] / "artifacts/cycle-01.json").exists()


def test_cli_rejects_duplicate_completed_cycle(tmp_path: Path) -> None:
    given_first_run = run_lab(tmp_path, [cycle_00(), cycle_01()])
    assert given_first_run["process"].returncode == 0
    ledger_path = given_first_run["output"] / "learning.ndjson"
    given_ledger = ledger_path.read_bytes()

    when_process = subprocess.run(
        [
            sys.executable,
            str(LAB),
            "--fixtures",
            str(tmp_path / "fixtures"),
            "--output",
            str(given_first_run["output"]),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert when_process.returncode != 0
    assert "duplicate completed cycle cycle-00" in when_process.stderr
    assert ledger_path.read_bytes() == given_ledger


def test_cli_rejects_empty_fixture_directory_before_writing(tmp_path: Path) -> None:
    when_result = run_lab(tmp_path, [])
    then_process = when_result["process"]

    assert then_process.returncode != 0
    assert "no cycle fixtures found" in then_process.stderr
    assert not (when_result["output"] / "artifacts").exists()
    assert not (when_result["output"] / "learning.ndjson").exists()
    assert not (when_result["output"] / "report.md").exists()


def test_cli_reports_invalid_ndjson_object_line(tmp_path: Path) -> None:
    given_lines = ['{"request_id":"req-1","level":"error"}', "[]"]
    when_result = run_lab(tmp_path, [cycle_00(), cycle_01(given_lines)])
    then_process = when_result["process"]

    assert then_process.returncode != 0
    assert "invalid NDJSON object at line 2" in then_process.stderr
    assert not (when_result["output"] / "artifacts/cycle-01.json").exists()


def test_cli_rejects_forward_requirement_during_preflight(tmp_path: Path) -> None:
    given_fixtures = [cycle_01(), cycle_00()]
    when_result = run_lab(tmp_path, given_fixtures)
    then_process = when_result["process"]

    assert then_process.returncode != 0
    assert "forward requirement safe-serialization-explicit-scope" in then_process.stderr
    assert not (when_result["output"] / "artifacts/cycle-01.json").exists()


def test_cli_rejects_cyclic_requirement_during_preflight(tmp_path: Path) -> None:
    given_cycle_00 = cycle_00()
    given_cycle_00["requires"] = ["ndjson-exact-and-filter"]
    when_result = run_lab(tmp_path, [given_cycle_00, cycle_01()])
    then_process = when_result["process"]

    assert then_process.returncode != 0
    assert "cyclic requirement" in then_process.stderr
    assert not (when_result["output"] / "artifacts/cycle-01.json").exists()
