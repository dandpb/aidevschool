"""Tests for the checklist scheduler."""

from __future__ import annotations

from pathlib import Path

import pytest

from curriculum._shared.evidence import ChallengeEvidence
from engines.openclaw.errors import StateCorruptionError
from engines.openclaw.runner.pipeline_status import Phase, PipelineStatus
from engines.openclaw.runner.scheduler import Scheduler, _parse_status, _write_status


class InjectedWriteError(RuntimeError):
    pass


def test_scheduler_rejects_legacy_bus_parameter() -> None:
    with pytest.raises(TypeError):
        getattr(Scheduler, "__call__")(bus=object())


def _project_tree(tmp_path: Path) -> Path:
    project = tmp_path / "curriculum" / "01_rate_limiter"
    (project / "docs").mkdir(parents=True)
    for lang in ("go", "rust", "node"):
        d = project / f"{lang}-impl"
        d.mkdir(parents=True)
        (d / "stub").write_text("x", encoding="utf-8")
    (project / "docs" / "spec.md").write_text("spec content" * 50, encoding="utf-8")
    (project / "docs" / "code_review.md").write_text("review content" * 50, encoding="utf-8")
    (project / "docs" / "benchmark_results.md").write_text("benchmark content" * 50, encoding="utf-8")
    (project / "docs" / "evolution_report.md").write_text("evolution content" * 50, encoding="utf-8")
    return project


def test_scheduler_reaches_cycle_complete(tmp_path: Path) -> None:
    _project_tree(tmp_path)
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")

    status = _parse_status(status_path) if status_path.exists() else _parse_status(
        Path("learner/pipeline_status.md")
    )
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    status.blockers = []
    _write_status(status, status_path)

    scheduler = Scheduler(
        root=tmp_path,
        status_path=status_path,
        state_path=state_path,
    )
    results = scheduler.run(max_events=30)
    final = scheduler.read_status()
    assert final.phase == Phase.CYCLE_COMPLETE, f"Halted: {results[-1].reason}"


def test_scheduler_writes_curriculum_evidence_status_yaml(tmp_path: Path) -> None:
    """A full cycle writes curriculum/NN_slug/status.yaml (evidence contract mirror)."""
    _project_tree(tmp_path)
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")

    status = _parse_status(status_path) if status_path.exists() else _parse_status(
        Path("learner/pipeline_status.md")
    )
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    status.blockers = []
    _write_status(status, status_path)

    scheduler = Scheduler(
        root=tmp_path,
        status_path=status_path,
        state_path=state_path,
    )
    scheduler.run(max_events=30)

    status_yaml = tmp_path / "curriculum" / "01_rate_limiter" / "status.yaml"
    assert status_yaml.exists(), "scheduler should mirror phase advances into status.yaml"
    import yaml

    data = yaml.safe_load(status_yaml.read_text(encoding="utf-8"))
    assert data["phase"] == "cycle-complete"
    assert data["project_id"]  # populated


def test_scheduler_surfaces_curriculum_mirror_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _project_tree(tmp_path)
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")
    status = _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    status.blockers = []
    _write_status(status, status_path)
    scheduler = Scheduler(root=tmp_path, status_path=status_path, state_path=state_path)

    def fail_commit(
        _report: ChallengeEvidence, *, root: Path | str | None = None
    ) -> None:
        raise InjectedWriteError("curriculum mirror failed")

    monkeypatch.setattr("engines.openclaw.runner.scheduler.commit_evidence", fail_commit)

    with pytest.raises(InjectedWriteError, match="curriculum mirror failed"):
        scheduler.step()

    assert scheduler.read_status().phase == Phase.SPEC


def test_scheduler_rolls_back_curriculum_mirror_when_pipeline_write_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _project_tree(tmp_path)
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")
    status = _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    status.blockers = []
    _write_status(status, status_path)
    scheduler = Scheduler(root=tmp_path, status_path=status_path, state_path=state_path)
    pipeline_before = status_path.with_suffix(".yaml").read_bytes()
    mirror_path = tmp_path / "curriculum" / "01_rate_limiter" / "status.yaml"
    mirror_path.write_text("project_id: 01_rate_limiter\nphase: spec\n", encoding="utf-8")
    mirror_before = mirror_path.read_bytes()

    def fail_pipeline_write(_status: PipelineStatus) -> None:
        raise InjectedWriteError("injected pipeline write failure")

    monkeypatch.setattr(scheduler, "write_status", fail_pipeline_write)

    with pytest.raises(InjectedWriteError, match="injected pipeline write failure"):
        scheduler.step()

    assert status_path.with_suffix(".yaml").read_bytes() == pipeline_before
    assert mirror_path.read_bytes() == mirror_before


@pytest.mark.parametrize(
    "project",
    ("../outside", "curriculum/../outside", "/tmp/outside", "curriculum\\outside"),
)
def test_scheduler_rejects_project_path_traversal(tmp_path: Path, project: str) -> None:
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")
    status = _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.SPEC
    status.current_project = project
    _write_status(status, status_path)

    scheduler = Scheduler(root=tmp_path, status_path=status_path, state_path=state_path)

    with pytest.raises(StateCorruptionError, match="current_project"):
        scheduler.step()


def test_scheduler_respects_learning_gate(tmp_path: Path) -> None:
    _project_tree(tmp_path)
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate:\n  implementation_blocked: true\n", encoding="utf-8")

    status = _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    status.blockers = []
    _write_status(status, status_path)

    scheduler = Scheduler(root=tmp_path, status_path=status_path, state_path=state_path)
    results = scheduler.run(max_events=5)
    assert results[-1].halted
    assert "gate" in results[-1].reason.lower() or "blocked" in results[-1].reason.lower()
    assert scheduler.read_status().phase == Phase.SPEC


def test_missing_spec_halts(tmp_path: Path) -> None:
    project = tmp_path / "curriculum" / "01_rate_limiter"
    (project / "docs").mkdir(parents=True)
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")

    status = _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    status.blockers = []
    _write_status(status, status_path)

    scheduler = Scheduler(root=tmp_path, status_path=status_path, state_path=state_path)
    results = scheduler.run(max_events=3)
    assert results[-1].halted
    assert "spec" in results[-1].reason.lower()
