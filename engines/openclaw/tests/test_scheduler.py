"""Tests for the OpenClaw scheduler."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from engines.openclaw.hermes.bus import HermesBus
from engines.openclaw.runner.adapters import (
    BenchmarkerAdapter,
    CuratorAdapter,
    DevAdapter,
    OptimizerAdapter,
    ReviewerAdapter,
    VerifierAdapter,
)
from engines.openclaw.runner.scheduler import Phase, Scheduler, _parse_status, _write_status


@pytest.fixture
def tmp_scheduler(tmp_path: Path):
    project = tmp_path / "curriculum" / "01_rate_limiter"
    (project / "docs").mkdir(parents=True)
    (project / "go-impl").mkdir(parents=True)
    (project / "go-impl" / "main.go").write_text("package main", encoding="utf-8")
    (project / "rust-impl").mkdir(parents=True)
    (project / "rust-impl" / "Cargo.toml").write_text("[package]", encoding="utf-8")
    (project / "node-impl").mkdir(parents=True)
    (project / "node-impl" / "package.json").write_text('{"name": "p"}', encoding="utf-8")
    (project / "docs" / "spec.md").write_text("spec content" * 50, encoding="utf-8")
    (project / "docs" / "code_review.md").write_text("review content" * 50, encoding="utf-8")
    (project / "docs" / "benchmark_results.md").write_text("benchmark content" * 50, encoding="utf-8")
    (project / "docs" / "evolution_report.md").write_text("evolution content" * 50, encoding="utf-8")

    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    sched_state_path = tmp_path / "hermes" / "scheduler_state.json"

    status = _parse_status(status_path) if status_path.exists() else _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    status.blockers = []
    _write_status(status, status_path)

    state_path.write_text(
        "gate:\n  implementation_blocked: false\n",
        encoding="utf-8",
    )

    bus = HermesBus(root=tmp_path / "hermes")
    adapters = {
        "curator": CuratorAdapter(root=tmp_path),
        "dev": DevAdapter(root=tmp_path),
        "reviewer": ReviewerAdapter(root=tmp_path),
        "benchmarker": BenchmarkerAdapter(root=tmp_path),
        "optimizer": OptimizerAdapter(root=tmp_path),
        "verifier": VerifierAdapter(root=tmp_path),
    }
    scheduler = Scheduler(
        bus=bus,
        adapters=adapters,
        status_path=status_path,
        state_path=state_path,
        scheduler_state_path=sched_state_path,
    )
    return scheduler


def test_scheduler_reaches_cycle_complete(tmp_scheduler: Scheduler) -> None:
    results = tmp_scheduler.run(max_events=30)
    final = tmp_scheduler.read_status()
    assert final.phase == Phase.CYCLE_COMPLETE, f"Halted: {results[-1].reason}"


def test_scheduler_respects_learning_gate(tmp_path: Path) -> None:
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    sched_state_path = tmp_path / "hermes" / "scheduler_state.json"

    status = _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.SPEC
    status.current_project = "curriculum/01_rate_limiter"
    _write_status(status, status_path)

    state_path.write_text("gate:\n  implementation_blocked: true\n", encoding="utf-8")

    scheduler = Scheduler(
        bus=HermesBus(root=tmp_path / "hermes"),
        adapters={},
        status_path=status_path,
        state_path=state_path,
        scheduler_state_path=sched_state_path,
    )
    result = scheduler.step()
    assert result.halted is True
    assert "blocked" in result.reason.lower()


def test_scheduler_halted_on_cycle_complete(tmp_path: Path) -> None:
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    sched_state_path = tmp_path / "hermes" / "scheduler_state.json"

    status = _parse_status(Path("learner/pipeline_status.md"))
    status.phase = Phase.CYCLE_COMPLETE
    _write_status(status, status_path)
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")

    scheduler = Scheduler(
        bus=HermesBus(root=tmp_path / "hermes"),
        adapters={},
        status_path=status_path,
        state_path=state_path,
        scheduler_state_path=sched_state_path,
    )
    result = scheduler.step()
    assert result.halted is True
    assert "complete" in result.reason.lower()


def test_scheduler_advances_one_phase_at_a_time(tmp_scheduler: Scheduler) -> None:
    initial = tmp_scheduler.read_status().phase
    tmp_scheduler.step()  # producer
    tmp_scheduler.step()  # verifier
    after = tmp_scheduler.read_status().phase
    assert after != initial
