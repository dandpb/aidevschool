"""Focused tests for the explicit supervisor request lifecycle module.

The broader supervisor suite covers decision behavior and end-to-end
publishing indirectly; this file verifies the lifecycle abstraction itself.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from engines.miniMaxEvolutionEngine.supervisor.ledger import append_event, read_ledger
from engines.miniMaxEvolutionEngine.supervisor.lifecycle import (
    LifecycleState,
    RequestBuilder,
    RequestIds,
    RequestState,
    SupervisorLifecycle,
    current_request_state,
    decide,
)
from engines.miniMaxEvolutionEngine.supervisor.models import (
    Action,
    LearnerState,
    LearningState,
    PipelinePhase,
    PipelineState,
    RuntimeSnapshot,
    SupervisorPaths,
)
from engines.miniMaxEvolutionEngine.supervisor.outbox import OutboxError
from engines.miniMaxEvolutionEngine.supervisor.plans import PHASE_PLANS


NOW = "2026-07-24T12:00:00+00:00"


def _write_yaml(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(value), encoding="utf-8")


@pytest.fixture
def workspace(tmp_path: Path) -> SupervisorPaths:
    project = tmp_path / "curriculum/02_key_value_store"
    (project / "docs").mkdir(parents=True)
    pipeline = tmp_path / "learner/pipeline_status.yaml"
    learner = tmp_path / "learner/learning_state.yaml"
    _write_yaml(pipeline, {
        "cycle_id": "cycle-2", "current_project": "curriculum/02_key_value_store",
        "phase": "spec", "blockers": [],
    })
    _write_yaml(learner, {
        "active_unit": {"id": "U2-key-value-store", "project": "02_key_value_store", "state": "practicing"},
        "gate": {"implementation_blocked": False},
    })
    return SupervisorPaths(tmp_path, pipeline, learner, tmp_path / "curriculum", tmp_path / "ops")


def _states(workspace: SupervisorPaths) -> tuple[PipelineState, LearnerState]:
    from engines.miniMaxEvolutionEngine.supervisor.state import load_canonical
    return load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)


def test_request_builder_produces_valid_schema(workspace: SupervisorPaths) -> None:
    pipeline, learner = _states(workspace)
    plan = PHASE_PLANS[PipelinePhase.SPEC]
    request = RequestBuilder.build(
        plan,
        pipeline=pipeline,
        learner=learner,
        run_id="run-1",
        now=NOW,
        ids=RequestIds("request-1", "producer-ctx", "verifier-ctx"),
        attempt=1,
    )
    assert request["schema_version"] == 1
    assert request["request_id"] == "request-1"
    assert request["run_id"] == "run-1"
    assert request["created_at"] == NOW
    assert request["cycle_id"] == "cycle-2"
    assert request["project"] == "02_key_value_store"
    assert request["active_unit"] == "U2-key-value-store"
    assert request["phase"] == "spec"
    assert request["observed_phase"] == "spec"
    assert request["intended_phase"] == "spec-done"
    assert request["command"] == "/devschool-spec"
    assert request["producer_role"] == "curator"
    assert request["verifier_role"] == "verifier"
    assert request["producer_context_id"] == "producer-ctx"
    assert request["verifier_context_id"] == "verifier-ctx"
    assert request["fresh_verifier"] is True
    assert request["retry_limit"] == 3
    assert request["attempt"] == 1


def test_request_builder_rejects_non_fresh_verifier_context(workspace: SupervisorPaths) -> None:
    pipeline, learner = _states(workspace)
    plan = PHASE_PLANS[PipelinePhase.SPEC]
    with pytest.raises(OutboxError, match="fresh verifier context"):
        RequestBuilder.build(
            plan,
            pipeline=pipeline,
            learner=learner,
            run_id="run",
            now=NOW,
            ids=RequestIds("request", "same-context", "same-context"),
            attempt=1,
        )


def test_request_builder_rejects_empty_or_short_fields(workspace: SupervisorPaths) -> None:
    pipeline, learner = _states(workspace)
    plan = PHASE_PLANS[PipelinePhase.SPEC]
    with pytest.raises(OutboxError):
        RequestBuilder.build(
            plan,
            pipeline=pipeline,
            learner=learner,
            run_id="",
            now=NOW,
            ids=RequestIds("request", "producer", "verifier"),
            attempt=1,
        )


def test_lifecycle_state_is_none_without_planned_request(workspace: SupervisorPaths) -> None:
    pipeline, _ = _states(workspace)
    assert current_request_state(workspace, pipeline) == RequestState(LifecycleState.NONE)


def test_lifecycle_state_planned_without_document(workspace: SupervisorPaths) -> None:
    pipeline, _ = _states(workspace)
    append_event(workspace.ledger, {
        "schema_version": 1, "event": "request_planned", "run_id": "run",
        "request_id": "planned-only", "project": "02_key_value_store",
        "cycle_id": "cycle-2", "active_unit": "U2-key-value-store",
        "observed_phase": "spec", "intended_phase": "spec-done",
        "attempt": 1, "action": Action.RUN_PHASE.value, "at": NOW,
    })
    state = current_request_state(workspace, pipeline)
    assert state.state is LifecycleState.PLANNED
    assert state.request_id == "planned-only"


def _publish_request(workspace: SupervisorPaths, request_id: str) -> dict[str, Any]:
    pipeline, learner = _states(workspace)
    plan = PHASE_PLANS[PipelinePhase.SPEC]
    lifecycle = SupervisorLifecycle(workspace)
    request = lifecycle.build_request(
        plan,
        pipeline=pipeline,
        learner=learner,
        run_id="run",
        now=NOW,
        ids=RequestIds(request_id, "producer", "verifier"),
        attempt=1,
    )
    lifecycle.publish(request, NOW)
    return request


def test_lifecycle_state_published_when_outbox_file_exists(workspace: SupervisorPaths) -> None:
    pipeline, _ = _states(workspace)
    _publish_request(workspace, "published")
    state = current_request_state(workspace, pipeline)
    assert state.state is LifecycleState.PUBLISHED
    assert state.request_id == "published"
    assert state.request is not None
    assert state.request["request_id"] == "published"


def test_lifecycle_state_executing_with_unfinished_execution(workspace: SupervisorPaths) -> None:
    pipeline, _ = _states(workspace)
    request = _publish_request(workspace, "executing")
    append_event(workspace.ledger, {
        "schema_version": 1, "event": "execution_started",
        "cycle_id": "cycle-2", "request_id": "executing", "project": "02_key_value_store",
        "active_unit": "U2-key-value-store", "observed_phase": "spec",
        "role": "producer", "context_id": "producer", "status": "running",
        "started_at": NOW,
    })
    state = current_request_state(workspace, pipeline)
    assert state.state is LifecycleState.EXECUTING
    assert state.request_id == "executing"


def test_lifecycle_state_resolved_when_receipt_exists(workspace: SupervisorPaths) -> None:
    pipeline, _ = _states(workspace)
    _publish_request(workspace, "resolved")
    from engines.miniMaxEvolutionEngine.supervisor.outbox import resolve
    resolve(workspace.resolutions, "resolved", {
        "result": "failed", "resolved_at": NOW, "canonical_phase": "spec", "summary": "failed",
    })
    state = current_request_state(workspace, pipeline)
    assert state.state is LifecycleState.RESOLVED
    assert state.request_id == "resolved"


def test_lifecycle_state_advanced_for_reconciled_receipt_and_phase(workspace: SupervisorPaths) -> None:
    pipeline, _ = _states(workspace)
    _publish_request(workspace, "advanced")
    from engines.miniMaxEvolutionEngine.supervisor.outbox import resolve
    resolve(workspace.resolutions, "advanced", {
        "result": "reconciled", "resolved_at": NOW, "canonical_phase": "spec-done",
    })
    data = yaml.safe_load(workspace.pipeline.read_text(encoding="utf-8"))
    data["phase"] = "spec-done"
    _write_yaml(workspace.pipeline, data)
    pipeline, _ = _states(workspace)
    state = current_request_state(workspace, pipeline)
    assert state.state is LifecycleState.ADVANCED
    assert state.request_id == "advanced"


def test_supervisor_lifecycle_publish_performs_planned_to_published_transition(workspace: SupervisorPaths) -> None:
    pipeline, learner = _states(workspace)
    plan = PHASE_PLANS[PipelinePhase.SPEC]
    lifecycle = SupervisorLifecycle(workspace)
    request = lifecycle.build_request(
        plan,
        pipeline=pipeline,
        learner=learner,
        run_id="run",
        now=NOW,
        ids=RequestIds("pub", "producer", "verifier"),
        attempt=1,
    )
    path = lifecycle.publish(request, NOW)
    assert path == workspace.outbox / "pub.json"
    assert json.loads(path.read_text(encoding="utf-8"))["request_id"] == "pub"
    events = read_ledger(workspace.ledger)
    assert [event["event"] for event in events] == ["request_planned", "request_published"]
    state = lifecycle.state(pipeline)
    assert state.state is LifecycleState.PUBLISHED


def test_decide_is_exported_from_lifecycle(workspace: SupervisorPaths) -> None:
    pipeline, learner = _states(workspace)
    decision = decide(pipeline, learner)
    assert decision.action is Action.RUN_PHASE
    assert decision.plan is not None
    assert decision.plan.name == "spec"
