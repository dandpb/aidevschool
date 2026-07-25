"""Subprocess-free tracer coverage for the bounded school supervisor MVP."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest
import yaml

from engines.miniMaxEvolutionEngine.supervisor import autonomous
from engines.miniMaxEvolutionEngine.supervisor.autonomous import RoleResult, execute_request
from engines.miniMaxEvolutionEngine.supervisor.executor import ProcessResult
from engines.miniMaxEvolutionEngine.supervisor.ledger import read_ledger
from engines.miniMaxEvolutionEngine.supervisor.models import Action, SupervisorPaths
from engines.miniMaxEvolutionEngine.supervisor.poll import PollAction, run_poll


NOW = datetime(2026, 7, 25, 12, tzinfo=timezone.utc)


def _yaml(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(value, sort_keys=False), encoding="utf-8")


@pytest.fixture
def workspace(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[SupervisorPaths, Path]:
    (tmp_path / "curriculum/project/docs").mkdir(parents=True)
    pipeline = tmp_path / "learner/pipeline_status.yaml"
    learner = tmp_path / "learner/learning_state.yaml"
    _yaml(pipeline, {
        "cycle_id": "tracer-cycle", "current_project": "curriculum/project",
        "complexity_level": 1, "phase": "spec", "awaiting": "curator", "blockers": [],
    })
    _yaml(learner, {
        "active_unit": {"id": "tracer-unit", "project": "project", "state": "practicing"},
        "gate": {"implementation_blocked": False},
    })
    executable = tmp_path / "never-executed"
    executable.write_text("#!/bin/sh\nexit 99\n", encoding="utf-8")
    executable.chmod(0o700)
    config = tmp_path / "autonomous.yaml"
    _yaml(config, {
        "schema_version": 1, "enabled": True, "kill_switch": False,
        "executable": str(executable), "model": "fixture-model", "max_concurrency": 1,
        "allowed_phases": ["spec"], "allowed_roles": ["curator", "verifier"],
        "permission_mode": "dontAsk", "producer_allowed_tools": ["Read", "EditProject"],
        "verifier_allowed_tools": ["Read"], "producer_max_turns": 2, "verifier_max_turns": 2,
        "producer_max_budget_usd": "1.00", "verifier_max_budget_usd": "1.00",
        "producer_timeout_seconds": 2, "verifier_timeout_seconds": 2,
        "daily_usd_cap": "6.00", "per_request_usd_cap": "2.00",
        "terminate_grace_seconds": 1, "stdout_byte_cap": 2000, "stderr_byte_cap": 2000,
        "environment_allowlist": ["PATH"],
    })
    monkeypatch.setattr(
        autonomous,
        "run_process",
        lambda *_args, **_kwargs: pytest.fail("tracer attempted a real subprocess"),
    )
    return SupervisorPaths(tmp_path, pipeline, learner, tmp_path / "curriculum", tmp_path / "ops"), config


def _ids():
    number = 0
    while True:
        number += 1
        yield f"tracer-{number}"


def _role(verdict: str, calls: list[tuple[str, str]]):
    process = ProcessResult(0, b"", b"", False, False, False, False)

    def run(_config, request, _paths, role):
        context = request[f"{role}_context_id"]
        calls.append((role, context))
        if role == "producer":
            return RoleResult(
                {"status": "completed", "summary": "fixture produced", "artifacts": ["docs/spec.md"]},
                Decimal("0.10"), process,
            )
        return RoleResult(
            {"verdict": verdict, "summary": "fixture verified", "checks": ["spec"],
             "evidence": ["docs/spec.md"], "feedback": "fixture failure" if verdict == "FAIL" else ""},
            Decimal("0.10"), process,
        )

    return run


def _runner(config: Path, calls: list[tuple[str, str]], verdict: str = "PASS"):
    role_runner = _role(verdict, calls)

    def run(paths: SupervisorPaths, request_id: str, **kwargs):
        return execute_request(
            paths, request_id, config_path=config, now=lambda: NOW,
            role_runner=role_runner, cancellation=kwargs["cancellation"],
        )

    return run


def _poll(paths: SupervisorPaths, config: Path, ids, **kwargs):
    return run_poll(
        paths, clock=lambda: NOW.isoformat(), id_provider=lambda: next(ids), wait=lambda _: False,
        autonomous=True, config_path=config, max_ticks=1, **kwargs,
    )


def test_happy_path_autonomous_spec_tracer(workspace: tuple[SupervisorPaths, Path]) -> None:
    paths, config = workspace
    learner_before = paths.learner.read_bytes()
    calls: list[tuple[str, str]] = []

    result = _poll(paths, config, _ids(), request_runner=_runner(config, calls))

    assert [role for role, _ in calls] == ["producer", "verifier"]
    assert len({context for _, context in calls}) == 2
    events = read_ledger(paths.ledger)
    assert [event["event"] for event in events[:2]] == ["request_planned", "request_published"]
    assert sum(event["event"] == "execution_started" for event in events) == 2
    assert sum(event["event"] == "execution_finished" for event in events) == 2
    assert sum(event["event"] == "advancement_authorized" for event in events) == 1
    pipeline = yaml.safe_load(paths.pipeline.read_text(encoding="utf-8"))
    assert (pipeline["phase"], pipeline["awaiting"]) == ("spec-done", "implementation")
    assert paths.learner.read_bytes() == learner_before
    assert yaml.safe_load(paths.learner.read_text())["active_unit"]["state"] == "practicing"
    assert result.autonomous_result["status"] == "completed"
    assert not paths.lease.exists()
    assert not list(paths.outbox.glob("*.json"))
    assert len(list(paths.retired.glob("*.json"))) == len(list(paths.resolutions.glob("*.json"))) == 1
    assert json.loads(next(paths.resolutions.glob("*.json")).read_text())["result"] == "completed"


def test_learner_boundary_continues_only_after_external_mastery(workspace: tuple[SupervisorPaths, Path]) -> None:
    paths, config = workspace
    pipeline = yaml.safe_load(paths.pipeline.read_text())
    pipeline.update(phase="cycle-complete", awaiting="evaluation")
    _yaml(paths.pipeline, pipeline)
    learner = yaml.safe_load(paths.learner.read_text())
    learner["active_unit"]["state"] = "evaluating"
    _yaml(paths.learner, learner)
    before = (paths.pipeline.read_bytes(), paths.learner.read_bytes())
    called: list[str] = []

    waiting = _poll(paths, config, _ids(), request_runner=lambda *_a, **_k: called.append("run"))
    assert waiting.observation.canonical_action is Action.WAIT_FOR_EVIDENCE
    assert called == [] and not paths.operations.exists()
    assert before == (paths.pipeline.read_bytes(), paths.learner.read_bytes())

    learner["active_unit"]["state"] = "mastered"
    _yaml(paths.learner, learner)
    complete = _poll(paths, config, _ids(), request_runner=lambda *_a, **_k: called.append("run"))
    assert complete.observation.action is PollAction.COMPLETE
    assert called == [] and not paths.operations.exists()
    assert yaml.safe_load(paths.learner.read_text())["active_unit"]["state"] == "mastered"


def test_three_failures_stop_and_persist_one_blocker(workspace: tuple[SupervisorPaths, Path]) -> None:
    paths, config = workspace
    ids = _ids()
    calls: list[tuple[str, str]] = []
    runner = _runner(config, calls, "FAIL")
    for _ in range(3):
        _poll(paths, config, ids, request_runner=runner)
        assert yaml.safe_load(paths.pipeline.read_text())["phase"] == "spec"
    assert len(calls) == 6
    for attempt in range(3):
        pair = calls[attempt * 2:attempt * 2 + 2]
        assert [role for role, _ in pair] == ["producer", "verifier"]
        assert pair[0][1] != pair[1][1]

    _poll(paths, config, ids, request_runner=runner)
    events = read_ledger(paths.ledger)
    assert sum(event["event"] == "request_resolved" and event["result"] == "failed" for event in events) == 3
    assert sum(event["event"] == "operational_blocked" for event in events) == 1
    blocker = next(event for event in events if event["event"] == "operational_blocked")
    assert blocker["observed_phase"] == "spec"
    assert blocker["reason"] == "retry limit exhausted (3/3)"
    assert not list(paths.outbox.glob("*.json"))
    _poll(paths, config, ids, request_runner=runner)
    assert len(calls) == 6
    assert sum(event["event"] == "operational_blocked" for event in read_ledger(paths.ledger)) == 1


def test_learning_gate_is_read_only(workspace: tuple[SupervisorPaths, Path]) -> None:
    paths, config = workspace
    pipeline = yaml.safe_load(paths.pipeline.read_text())
    pipeline.update(phase="spec-done", awaiting="implementation")
    _yaml(paths.pipeline, pipeline)
    learner = yaml.safe_load(paths.learner.read_text())
    learner["gate"]["implementation_blocked"] = True
    _yaml(paths.learner, learner)
    before = (paths.pipeline.read_bytes(), paths.learner.read_bytes())

    result = _poll(
        paths, config, _ids(),
        tick_runner=lambda *_a, **_k: pytest.fail("learning gate dispatched tick"),
        request_runner=lambda *_a, **_k: pytest.fail("learning gate dispatched autonomous runner"),
    )
    assert result.observation.canonical_action is Action.WAIT_FOR_LEARNER
    assert before == (paths.pipeline.read_bytes(), paths.learner.read_bytes())
    assert not paths.operations.exists()


def test_restart_reconciles_authorized_advance_without_roles(
    workspace: tuple[SupervisorPaths, Path], monkeypatch: pytest.MonkeyPatch,
) -> None:
    paths, config = workspace
    ids = _ids()
    calls: list[tuple[str, str]] = []
    original = autonomous.resolve_request
    monkeypatch.setattr(
        autonomous, "resolve_request",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("simulated crash before resolution")),
    )
    with pytest.raises(RuntimeError, match="simulated crash"):
        _poll(paths, config, ids, request_runner=_runner(config, calls))
    assert yaml.safe_load(paths.pipeline.read_text())["phase"] == "spec-done"
    assert [role for role, _ in calls] == ["producer", "verifier"]

    monkeypatch.setattr(autonomous, "resolve_request", original)
    restarted: list[str] = []
    result = _poll(paths, config, ids, request_runner=lambda *_a, **_k: restarted.append("run"))
    assert restarted == []
    assert result.observation.action is PollAction.PUBLISH
    assert json.loads(next(paths.resolutions.glob("*.json")).read_text())["result"] == "reconciled"
    assert len(list(paths.retired.glob("*.json"))) == 1
    events = read_ledger(paths.ledger)
    assert sum(event["event"] == "advancement_authorized" for event in events) == 1
    assert sum(
        event["event"] == "request_resolved" and event["result"] == "reconciled"
        for event in events
    ) == 1
    assert not paths.lease.exists()
