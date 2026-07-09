"""Tests for the checklist scheduler."""

from __future__ import annotations

from pathlib import Path

from engines.openclaw.runner.pipeline_status import Phase
from engines.openclaw.runner.scheduler import Scheduler, _parse_status, _write_status


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
