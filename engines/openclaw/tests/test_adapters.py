"""Tests for OpenClaw agent adapters."""

from __future__ import annotations

from pathlib import Path

import pytest

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.adapters import (
    CuratorAdapter,
    DevAdapter,
    OptimizerAdapter,
    ReviewerAdapter,
    VerifierAdapter,
)
from engines.openclaw.runner.scheduler import PipelineStatus


@pytest.fixture
def tmp_project(tmp_path: Path):
    project = tmp_path / "curriculum" / "01_rate_limiter"
    (project / "docs").mkdir(parents=True)
    (project / "go-impl").mkdir(parents=True)
    (project / "go-impl" / "main.go").write_text("package main", encoding="utf-8")
    (project / "rust-impl").mkdir(parents=True)
    (project / "rust-impl" / "Cargo.toml").write_text("[package]", encoding="utf-8")
    (project / "node-impl").mkdir(parents=True)
    (project / "node-impl" / "package.json").write_text('{"name": "p"}', encoding="utf-8")
    return project


@pytest.fixture
def bus(tmp_path: Path):
    return HermesBus(root=tmp_path / "hermes")


@pytest.fixture
def status(tmp_project: Path):
    return PipelineStatus(
        cycle_id="c1",
        current_project=f"{tmp_project.parent.name}/{tmp_project.name}",
        phase="spec",
    )


def make_event(
    topic: Topic,
    payload: dict,
    artifact_path: str = "a",
) -> Event:
    return Event(
        topic=topic,
        cycle_id="c1",
        unit_id="u1",
        artifact_path=artifact_path,
        content_hash="abc",
        payload=payload,
        produced_at="1",
    )


def test_curator_validates_project(tmp_project: Path, bus: HermesBus, status: PipelineStatus) -> None:
    adapter = CuratorAdapter(root=tmp_project.parent.parent)
    event = make_event(Topic.UNIT_SELECTED, {"project_path": status.current_project})
    result = adapter.handle(event, bus, status)
    assert result["ok"] is True
    assert result["next_topic"] == "dojo.spec.ready"
    assert len(bus.list_events(directory="outbox")) == 1


def test_curator_fails_when_project_missing(tmp_path: Path, bus: HermesBus) -> None:
    adapter = CuratorAdapter(root=tmp_path)
    status = PipelineStatus(cycle_id="c1", current_project="curriculum/99_missing", phase="spec")
    event = make_event(Topic.UNIT_SELECTED, {"project_path": status.current_project})
    result = adapter.handle(event, bus, status)
    assert result["ok"] is False


def test_dev_validates_spec_and_impls(tmp_project: Path, bus: HermesBus, status: PipelineStatus) -> None:
    (tmp_project / "docs" / "spec.md").write_text("spec content", encoding="utf-8")
    adapter = DevAdapter(root=tmp_project.parent.parent)
    event = make_event(Topic.SPEC_READY, {"spec_path": f"{status.current_project}/docs/spec.md"})
    result = adapter.handle(event, bus, status)
    assert result["ok"] is True
    assert result["next_topic"] == "dojo.impl.ready"


def test_dev_fails_without_spec(tmp_project: Path, bus: HermesBus, status: PipelineStatus) -> None:
    adapter = DevAdapter(root=tmp_project.parent.parent)
    event = make_event(Topic.SPEC_READY, {"spec_path": f"{status.current_project}/docs/spec.md"})
    result = adapter.handle(event, bus, status)
    assert result["ok"] is False


def test_reviewer_validates_impls(tmp_project: Path, bus: HermesBus, status: PipelineStatus) -> None:
    (tmp_project / "docs" / "code_review.md").write_text("review content", encoding="utf-8")
    adapter = ReviewerAdapter(root=tmp_project.parent.parent)
    impl_paths = [f"{status.current_project}/{lang}-impl" for lang in DevAdapter.LANGUAGES]
    event = make_event(Topic.IMPL_READY, {"implementation_paths": impl_paths})
    result = adapter.handle(event, bus, status)
    assert result["ok"] is True
    assert result["next_topic"] == "dojo.review.ready"


def test_optimizer_validates_metrics(tmp_project: Path, bus: HermesBus, status: PipelineStatus) -> None:
    (tmp_project / "docs" / "benchmark_results.md").write_text("benchmark results" * 10, encoding="utf-8")
    adapter = OptimizerAdapter(root=tmp_project.parent.parent)
    event = make_event(
        Topic.METRICS_READY,
        {"scorecard_path": f"{status.current_project}/docs/benchmark_results.md"},
    )
    result = adapter.handle(event, bus, status)
    assert result["ok"] is True
    assert result["next_topic"] == "dojo.memory.updated"


def test_verifier_passes_for_existing_spec(tmp_project: Path, bus: HermesBus, status: PipelineStatus) -> None:
    (tmp_project / "docs" / "spec.md").write_text("spec content" * 50, encoding="utf-8")
    adapter = VerifierAdapter(root=tmp_project.parent.parent)
    event = make_event(
        Topic.SPEC_READY,
        {},
        artifact_path=f"{status.current_project}/docs/spec.md",
    )
    result = adapter.handle(event, bus, status, phase="spec")
    assert result["verdict"] == "PASS"


def test_verifier_fails_for_small_spec(tmp_project: Path, bus: HermesBus, status: PipelineStatus) -> None:
    (tmp_project / "docs" / "spec.md").write_text("tiny", encoding="utf-8")
    adapter = VerifierAdapter(root=tmp_project.parent.parent)
    event = make_event(
        Topic.SPEC_READY,
        {},
        artifact_path=f"{status.current_project}/docs/spec.md",
    )
    result = adapter.handle(event, bus, status, phase="spec")
    assert result["verdict"] == "FAIL"
