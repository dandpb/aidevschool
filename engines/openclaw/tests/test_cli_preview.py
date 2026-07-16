from __future__ import annotations

from pathlib import Path

import engines.openclaw.__main__ as cli
from engines.openclaw.__main__ import ChecklistPreview
from engines.openclaw.runner.pipeline_status import Phase


ROOT = Path(__file__).resolve().parents[3]
CANONICAL_PATHS = (
    ROOT / "learner" / "learning_state.yaml",
    ROOT / "learner" / "pipeline_status.yaml",
    ROOT / "learner" / "pipeline_status.md",
)


def test_preview_reports_real_checklist_without_writing_canonical_state(capsys) -> None:
    # Given
    before = {path: path.read_bytes() for path in CANONICAL_PATHS}

    # When
    exit_code = cli.main(["--preview"])

    # Then
    output = capsys.readouterr().out
    assert exit_code == 0
    assert "OpenClaw checklist preview" in output
    assert "source: learner/pipeline_status.yaml" in output
    assert "project:" in output
    assert "phase:" in output
    assert "result:" in output
    assert {path: path.read_bytes() for path in CANONICAL_PATHS} == before


def test_preview_halt_returns_failure_and_reports_actual_source(capsys, monkeypatch) -> None:
    preview = ChecklistPreview(
        project="curriculum/01_rate_limiter",
        phase=Phase.SPEC,
        passed=False,
        detail="learning gate blocked",
        next_phase=None,
        source="learner/pipeline_status.md",
    )
    monkeypatch.setattr(cli, "preview_checklist", lambda scheduler: preview)

    exit_code = cli.main(["--preview"])

    output = capsys.readouterr().out
    assert exit_code == 1
    assert "result: HALT" in output
    assert "source: learner/pipeline_status.md" in output
