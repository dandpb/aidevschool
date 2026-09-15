"""Accepted provenance contract: distinguish checklist and verified advances."""

from pathlib import Path

import pytest
import yaml

from engines.openclaw import __main__ as cli
from engines.openclaw.runner.pipeline_status import Phase, PipelineStatus, load_status, save_status
from engines.openclaw.runner.scheduler import Scheduler
from engines.openclaw.tests.test_scheduler import _project_tree
from shared.errors import StateCorruptionError


def _scheduler(root: Path, phase: Phase = Phase.SPEC) -> Scheduler:
    _project_tree(root)
    path = root / "pipeline_status.md"
    save_status(PipelineStatus(current_project="curriculum/01_rate_limiter", phase=phase), path)
    return Scheduler(root=root, status_path=path, state_path=root / "learning_state.yaml")


def test_legacy_provenance_is_read_only(tmp_path: Path) -> None:
    path = tmp_path / "pipeline_status.yaml"
    path.write_text("phase: spec-done\ncurrent_project: curriculum/01_rate_limiter\n")
    before = path.read_bytes()
    status = load_status(path)
    assert status.grade == "unspecified"
    assert status.advanced_by == ""
    assert path.read_bytes() == before
    empty = load_status(tmp_path / "missing.yaml")
    assert empty.grade == "unspecified"
    assert empty.advanced_by == ""
    assert not (tmp_path / "missing.yaml").exists()


@pytest.mark.parametrize("phase,next_phase,mirror", [
    (Phase.SPEC, "spec-done", "impl"),
    (Phase.SPEC_DONE, "impl-done", "review"),
    (Phase.IMPL_DONE, "review-done", "benchmark"),
    (Phase.REVIEW_DONE, "benchmark-done", "optimize"),
    (Phase.BENCHMARK_DONE, "cycle-complete", "cycle-complete"),
])
def test_checklist_advances_with_provenance(tmp_path: Path, phase, next_phase, mirror) -> None:
    scheduler = _scheduler(tmp_path, phase)
    result = scheduler.step()
    assert not result.halted
    status = yaml.safe_load(scheduler.status_path.with_suffix(".yaml").read_text())
    assert status["phase"] == next_phase
    assert status["grade"] == "simulate"
    assert status["advanced_by"] == "openclaw-checklist"
    evidence = yaml.safe_load((tmp_path / "curriculum/01_rate_limiter/status.yaml").read_text())
    assert evidence["phase"] == mirror


def test_cli_override_reports_simulated_provenance(tmp_path: Path, monkeypatch, capsys) -> None:
    scheduler = _scheduler(tmp_path)
    monkeypatch.setattr(cli, "Scheduler", lambda **kwargs: scheduler)
    code = cli.main(["--phase", "spec-done", "--project", "curriculum/01_rate_limiter", "--max-events", "0"])
    assert code == 1
    status = yaml.safe_load(scheduler.status_path.with_suffix(".yaml").read_text())
    assert status["phase"] == "spec-done"
    assert status["grade"] == "simulate"
    assert status["advanced_by"] == "openclaw-cli-override"
    output = capsys.readouterr().out
    assert "grade=simulate" in output
    assert "advanced_by=openclaw-cli-override" in output


def test_sequential_writers_preserve_latest_provenance(tmp_path: Path) -> None:
    scheduler = _scheduler(tmp_path)
    scheduler.step()
    status = scheduler.read_status()
    assert status.grade == "simulate"
    assert status.advanced_by == "openclaw-checklist"
    status.grade = "verified"
    status.advanced_by = "mme-supervisor"
    save_status(status, scheduler.status_path)
    result = scheduler.read_status()
    assert result.grade == "verified"
    assert result.advanced_by == "mme-supervisor"
    assert result.phase == Phase.SPEC_DONE


@pytest.mark.parametrize("grade,writer", [
    ("trusted", "agent"), (None, "agent"), (7, "agent"),
    ("simulate", ""), ("verified", "  "), ("verified", None),
])
def test_invalid_provenance_is_rejected(tmp_path: Path, grade, writer) -> None:
    path = tmp_path / "pipeline_status.yaml"
    path.write_text(yaml.safe_dump({"phase": "spec", "grade": grade, "advanced_by": writer}))
    with pytest.raises(StateCorruptionError):
        load_status(path)
    path.write_text("phase: spec\n")
    before = path.read_bytes()
    status = PipelineStatus(grade=grade, advanced_by=writer)
    with pytest.raises(StateCorruptionError):
        save_status(status, path)
    assert path.read_bytes() == before


def test_cli_preview_preserves_provenance(tmp_path: Path, monkeypatch, capsys) -> None:
    scheduler = _scheduler(tmp_path)
    scheduler.step()
    path = scheduler.status_path.with_suffix(".yaml")
    before = path.read_bytes()
    monkeypatch.setattr(cli, "Scheduler", lambda **kwargs: scheduler)
    assert cli.main(["--preview"]) == 0
    assert "OpenClaw checklist preview (read-only)" in capsys.readouterr().out
    assert path.read_bytes() == before
