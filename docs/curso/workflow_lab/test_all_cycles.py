from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import cast

from docs.curso.workflow_lab.contracts import LedgerRecord


LAB_DIR = Path(__file__).parent
FIXTURES = LAB_DIR / "fixtures"
LAB = LAB_DIR / "lab.py"


def run_lab(fixtures: Path, output: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(LAB),
            "--fixtures",
            str(fixtures),
            "--output",
            str(output),
        ],
        check=False,
        capture_output=True,
        text=True,
    )


def read_ledger(output: Path) -> list[LedgerRecord]:
    return [
        json.loads(line)
        for line in (output / "learning.ndjson").read_text(encoding="utf-8").splitlines()
    ]


def test_public_cli_executes_all_cycles_with_declared_learning(tmp_path: Path) -> None:
    # Given: the canonical eleven-cycle fixture set.
    given_output = tmp_path / "output"

    # When: a developer runs the public CLI.
    when_process = run_lab(FIXTURES, given_output)

    # Then: every cycle completes and only declared lessons are resolved.
    assert when_process.returncode == 0, when_process.stderr
    records = read_ledger(given_output)
    assert [record["cycle_id"] for record in records] == [
        f"cycle-{index:02}" for index in range(11)
    ]
    assert len(list((given_output / "artifacts").glob("cycle-*.json"))) == 10
    for record in records:
        resolved = record["resolved_requires"]
        assert isinstance(resolved, list)
        assert [lesson["lesson_id"] for lesson in resolved] == record["requires"]
    consumed = {
        requirement
        for record in records
        for requirement in record["requires"]
    }
    assert {record["lesson_id"] for record in records[:10]} <= consumed
    assert len(records[-1]["resolved_requires"]) == 3
    assert "Derived projection; not independent evidence." in (
        given_output / "report.md"
    ).read_text(encoding="utf-8")


def test_public_cli_is_byte_deterministic_across_fresh_runs(tmp_path: Path) -> None:
    # Given: two fresh output directories and the same fixtures.
    given_first = tmp_path / "first"
    given_second = tmp_path / "second"

    # When: the public CLI runs independently in each directory.
    when_first = run_lab(FIXTURES, given_first)
    when_second = run_lab(FIXTURES, given_second)

    # Then: all durable outputs are byte-for-byte identical.
    assert when_first.returncode == when_second.returncode == 0
    relative_paths = [
        Path("learning.ndjson"),
        Path("report.md"),
        *(Path("artifacts") / f"cycle-{index:02}.json" for index in range(1, 11)),
    ]
    assert all(
        (given_first / path).read_bytes() == (given_second / path).read_bytes()
        for path in relative_paths
    )


def test_invalid_late_cycle_leaves_no_durable_outputs(tmp_path: Path) -> None:
    # Given: all canonical fixtures except an out-of-scope path in the final cycle.
    given_fixtures = tmp_path / "fixtures"
    _ = shutil.copytree(FIXTURES, given_fixtures)
    late_fixture = given_fixtures / "10-cycle-10.json"
    late_cycle = cast(
        dict[str, object],
        cast(object, json.loads(late_fixture.read_text(encoding="utf-8"))),
    )
    late_cycle["files"] = [{"path": "../outside.txt", "content": "clean"}]
    _ = late_fixture.write_text(json.dumps(late_cycle), encoding="utf-8")
    given_output = tmp_path / "output"

    # When: the public CLI reaches the invalid late cycle.
    when_process = run_lab(given_fixtures, given_output)

    # Then: it fails before any artifact, report, or ledger is written.
    assert when_process.returncode != 0
    assert "canonical relative POSIX path" in when_process.stderr
    assert not (given_output / "artifacts").exists()
    assert not (given_output / "learning.ndjson").exists()
    assert not (given_output / "report.md").exists()


def test_public_cli_rejects_schema_invalid_ledger_record(tmp_path: Path) -> None:
    # Given: valid JSON that is not a durable ledger record.
    given_fixtures = tmp_path / "fixtures"
    given_fixtures.mkdir()
    fixture = FIXTURES / "01-cycle-01.json"
    _ = shutil.copy2(fixture, given_fixtures / fixture.name)
    given_output = tmp_path / "output"
    given_output.mkdir()
    forged_record: LedgerRecord = {
        "cycle_id": "cycle-00",
        "handler": "metadata-only",
        "requires": [],
        "resolved_requires": [],
        "fixture_sha256": "not-a-sha256",
        "artifact_path": "../../not-canonical",
        "lesson_id": "safe-serialization-explicit-scope",
        "lesson_text": "forged prerequisite",
        "status": "completed",
    }
    _ = (given_output / "learning.ndjson").write_text(
        json.dumps(forged_record) + "\n", encoding="utf-8"
    )

    # When: the public CLI resumes from that ledger.
    when_process = run_lab(given_fixtures, given_output)

    # Then: the trust boundary reports the malformed line before writing outputs.
    assert when_process.returncode == 1
    assert when_process.stderr == "invalid ledger line 1: malformed record\n"
    assert not (given_output / "artifacts").exists()
    assert not (given_output / "report.md").exists()
