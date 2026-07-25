from __future__ import annotations

import json
import os
import signal
from pathlib import Path

import pytest
import yaml

from engines.miniMaxEvolutionEngine.supervisor.ledger import append_event, read_ledger
from engines.miniMaxEvolutionEngine.supervisor.models import Action, SupervisorPaths
from engines.miniMaxEvolutionEngine.supervisor.poll import PollAction, PollResult, observe, run_poll
from engines.miniMaxEvolutionEngine.supervisor import __main__ as supervisor_cli
from engines.miniMaxEvolutionEngine.supervisor.tick import tick


NOW = "2026-07-25T12:00:00+00:00"


@pytest.fixture
def workspace(tmp_path: Path) -> SupervisorPaths:
    project = tmp_path / "curriculum/project"
    (project / "docs").mkdir(parents=True)
    pipeline = tmp_path / "learner/pipeline_status.yaml"
    learner = tmp_path / "learner/learning_state.yaml"
    pipeline.parent.mkdir()
    pipeline.write_text(yaml.safe_dump({"cycle_id": "cycle", "current_project": "curriculum/project",
                                        "phase": "cycle-complete", "blockers": []}))
    learner.write_text(yaml.safe_dump({"active_unit": {"id": "unit", "project": "project", "state": "practicing"},
                                       "gate": {"implementation_blocked": False}}))
    return SupervisorPaths(tmp_path, pipeline, learner, tmp_path / "curriculum", tmp_path / "ops")


def ids():
    value = 0
    while True:
        value += 1
        yield f"id-{value}"


def test_observe_wait_is_read_only(workspace: SupervisorPaths) -> None:
    before = (workspace.pipeline.read_bytes(), workspace.learner.read_bytes())
    observation = observe(workspace)
    assert observation.action is PollAction.WAIT
    assert not workspace.operations.exists()
    assert before == (workspace.pipeline.read_bytes(), workspace.learner.read_bytes())


def test_max_ticks_and_idle_backoff(workspace: SupervisorPaths) -> None:
    waits: list[float] = []
    values = ids()
    result = run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values),
                      wait=lambda delay: waits.append(delay) or False, interval_seconds=2,
                      max_interval_seconds=8, backoff_factor=2, max_ticks=4)
    assert result.ticks == 4
    assert waits == [2, 4, 8]
    assert not workspace.operations.exists()


def test_canonical_change_resets_backoff(workspace: SupervisorPaths) -> None:
    waits: list[float] = []
    values = ids()

    def wait(delay: float) -> bool:
        waits.append(delay)
        if len(waits) == 2:
            data = yaml.safe_load(workspace.learner.read_text())
            data["active_unit"]["state"] = "mastered"
            workspace.learner.write_text(yaml.safe_dump(data))
        return False

    run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values), wait=wait,
             interval_seconds=2, max_interval_seconds=8, max_ticks=4)
    assert waits == [2, 4, 2]


def test_supervised_mode_publishes_exactly_one_request(workspace: SupervisorPaths) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    result = run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values),
                      wait=lambda _: False, max_ticks=3)
    assert result.observation.action is PollAction.PENDING
    assert len(list(workspace.outbox.glob("*.json"))) == 1
    assert [event["event"] for event in read_ledger(workspace.ledger)].count("request_published") == 1


def test_autonomous_consumes_exact_pending_request(workspace: SupervisorPaths, monkeypatch: pytest.MonkeyPatch) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    request_id = json.loads(next(workspace.outbox.glob("*.json")).read_text())["request_id"]
    called: list[str] = []
    monkeypatch.setattr("engines.miniMaxEvolutionEngine.supervisor.poll.load_config", lambda *args: object())
    run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values), wait=lambda _: False,
             autonomous=True, max_ticks=1,
             request_runner=lambda paths, requested, **kwargs: called.append(requested) or {"status": "completed"})
    assert called == [request_id]


def test_autonomous_skips_request_resolved_immediately_before_lease_acquisition(
    workspace: SupervisorPaths,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from engines.miniMaxEvolutionEngine.supervisor.lease import acquire as acquire_lease
    from engines.miniMaxEvolutionEngine.supervisor.reconcile import resolve_request
    from engines.miniMaxEvolutionEngine.supervisor.state import load_canonical

    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    request_id = json.loads(next(workspace.outbox.glob("*.json")).read_text())["request_id"]
    events: list[dict] = []
    called: list[str] = []

    def resolving_acquire(*args, **kwargs):
        pipeline_data = yaml.safe_load(workspace.pipeline.read_text())
        pipeline_data["phase"] = "spec-done"
        workspace.pipeline.write_text(yaml.safe_dump(pipeline_data))
        pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
        resolve_request(workspace, request_id, "completed", NOW, pipeline, learner)
        return acquire_lease(*args, **kwargs)

    monkeypatch.setattr("engines.miniMaxEvolutionEngine.supervisor.poll.load_config", lambda *args: object())
    monkeypatch.setattr("engines.miniMaxEvolutionEngine.supervisor.poll.acquire", resolving_acquire)

    result = run_poll(
        workspace,
        clock=lambda: NOW,
        id_provider=lambda: next(values),
        wait=lambda _: False,
        autonomous=True,
        max_ticks=1,
        request_runner=lambda *_args, **_kwargs: called.append("called") or {},
        emit=events.append,
    )

    assert result.status == "max_ticks"
    assert called == []
    assert not workspace.lease.exists()
    assert result.observation.action is PollAction.PUBLISH
    assert any(
        event["event"] == "autonomous_request_changed"
        and event["request_id"] == request_id
        and event["action"] == PollAction.PUBLISH.value
        for event in events
    )


def test_missing_autonomous_config_dispatches_nothing(workspace: SupervisorPaths) -> None:
    called: list[str] = []
    values = ids()
    result = run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values), wait=lambda _: False,
                      autonomous=True, max_ticks=1,
                      request_runner=lambda *args, **kwargs: called.append("called") or {})
    assert result.status == "autonomous_disabled"
    assert "local config is missing" in (result.disabled_reason or "")
    assert called == []
    assert not workspace.operations.exists()


def test_interrupted_pending_request_is_not_redispatched(workspace: SupervisorPaths) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    request = json.loads(next(workspace.outbox.glob("*.json")).read_text())
    append_event(workspace.ledger, {"schema_version": 1, "event": "execution_started",
                                    "request_id": request["request_id"], "role": "producer",
                                    "context_id": request["producer_context_id"], "cycle_id": request["cycle_id"],
                                    "project": request["project"], "active_unit": request["active_unit"],
                                    "observed_phase": request["observed_phase"], "status": "running", "started_at": NOW})
    called: list[str] = []
    from unittest.mock import patch

    config_patch = patch(
        "engines.miniMaxEvolutionEngine.supervisor.poll.load_config",
        return_value=object(),
    )
    config_patch.start()
    try:
        result = run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values), wait=lambda _: False,
                          autonomous=True, max_ticks=2,
                          request_runner=lambda *args, **kwargs: called.append("called") or {})
    finally:
        config_patch.stop()
    assert result.observation.action is PollAction.INTERRUPTED
    assert called == []


def test_orphan_finished_execution_is_not_redispatched(
    workspace: SupervisorPaths,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    request = json.loads(next(workspace.outbox.glob("*.json")).read_text())
    execution = {
        "schema_version": 1,
        "request_id": request["request_id"], "role": "producer",
        "context_id": request["producer_context_id"], "cycle_id": request["cycle_id"],
        "project": request["project"], "active_unit": request["active_unit"],
        "observed_phase": request["observed_phase"],
    }
    append_event(workspace.ledger, execution | {
        "event": "execution_started", "status": "running", "started_at": NOW,
    })
    append_event(workspace.ledger, execution | {
        "event": "execution_finished", "status": "finished", "finished_at": NOW,
        "charged_cost_usd": "0.25",
    })
    called: list[str] = []
    monkeypatch.setattr("engines.miniMaxEvolutionEngine.supervisor.poll.load_config", lambda *args: object())

    result = run_poll(
        workspace,
        clock=lambda: NOW,
        id_provider=lambda: next(values),
        wait=lambda _: False,
        autonomous=True,
        max_ticks=1,
        request_runner=lambda *args, **kwargs: called.append("called") or {},
    )

    assert result.observation.action is PollAction.INTERRUPTED
    assert called == []


def test_retired_before_receipt_reconciles_to_operator_blocker(workspace: SupervisorPaths) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    request = json.loads(next(workspace.outbox.glob("*.json")).read_text())
    workspace.retired.mkdir(parents=True)
    (workspace.outbox / f"{request['request_id']}.json").rename(
        workspace.retired / f"{request['request_id']}.json"
    )

    assert observe(workspace).action is PollAction.RECONCILE
    result = run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values),
                      wait=lambda _: False, max_ticks=1)

    assert result.observation.action is PollAction.BLOCKED
    blockers = [event for event in read_ledger(workspace.ledger) if event["event"] == "operational_blocked"]
    assert len(blockers) == 1
    assert "retired before its resolution receipt" in blockers[0]["reason"]


def test_receipt_before_resolution_ledger_is_reconciled(workspace: SupervisorPaths) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    request = json.loads(next(workspace.outbox.glob("*.json")).read_text())
    workspace.resolutions.mkdir(parents=True)
    (workspace.resolutions / f"{request['request_id']}.json").write_text(json.dumps({
        "schema_version": 1, "request_id": request["request_id"], "result": "failed",
        "resolved_at": NOW, "canonical_phase": "spec", "summary": "failed before ledger append",
    }))

    assert observe(workspace).action is PollAction.RECONCILE
    run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values),
             wait=lambda _: False, max_ticks=1)

    resolved = [event for event in read_ledger(workspace.ledger) if event["event"] == "request_resolved"]
    assert len(resolved) == 1
    assert resolved[0]["result"] == "failed"
    assert (workspace.retired / f"{request['request_id']}.json").is_file()


def test_restart_after_advancement_reconciles_without_repeating_phase(workspace: SupervisorPaths) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    request = json.loads(next(workspace.outbox.glob("*.json")).read_text())
    data["phase"] = "spec-done"
    workspace.pipeline.write_text(yaml.safe_dump(data))

    result = run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values),
                      wait=lambda _: False, max_ticks=1)

    assert result.observation.action is PollAction.PUBLISH
    assert (workspace.resolutions / f"{request['request_id']}.json").is_file()
    assert not (workspace.outbox / f"{request['request_id']}.json").exists()
    resolutions = [event for event in read_ledger(workspace.ledger) if event["event"] == "request_resolved"]
    assert len(resolutions) == 1
    assert resolutions[0]["result"] == "reconciled"

    run_poll(workspace, clock=lambda: NOW, id_provider=lambda: next(values),
             wait=lambda _: False, max_ticks=1)
    pending = [path for path in workspace.outbox.glob("*.json")]
    assert len(pending) == 1
    next_request = json.loads(pending[0].read_text())
    assert next_request["observed_phase"] == "spec-done"
    assert next_request["request_id"] != request["request_id"]


def test_retry_exhaustion_persists_one_blocker_without_idle_noise(workspace: SupervisorPaths) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    for attempt in range(1, 4):
        append_event(workspace.ledger, {
            "schema_version": 1, "event": "request_resolved",
            "request_id": f"failed-{attempt}", "cycle_id": "cycle",
            "project": "project", "observed_phase": "spec", "result": "failed",
        })
    values = ids()

    result = run_poll(
        workspace,
        clock=lambda: NOW,
        id_provider=lambda: next(values),
        wait=lambda _: False,
        max_ticks=3,
    )

    assert result.observation.action is PollAction.BLOCKED
    blockers = [event for event in read_ledger(workspace.ledger) if event["event"] == "operational_blocked"]
    assert len(blockers) == 1
    assert blockers[0]["reason"] == "retry limit exhausted (3/3)"


def test_autonomous_lease_contention_is_observed_not_fatal(
    workspace: SupervisorPaths,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from engines.miniMaxEvolutionEngine.supervisor.lease import LeaseHeldError

    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    events: list[dict] = []
    called: list[str] = []
    waits: list[float] = []
    attempts = 0
    released = False

    class Lease:
        def release(self) -> None:
            nonlocal released
            released = True

    def racing_acquire(*_args, **_kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise LeaseHeldError("race")
        return Lease()

    monkeypatch.setattr("engines.miniMaxEvolutionEngine.supervisor.poll.load_config", lambda *args: object())
    monkeypatch.setattr("engines.miniMaxEvolutionEngine.supervisor.poll.acquire", racing_acquire)

    result = run_poll(
        workspace,
        clock=lambda: NOW,
        id_provider=lambda: next(values),
        wait=lambda delay: waits.append(delay) or False,
        autonomous=True,
        max_ticks=2,
        request_runner=lambda _paths, request_id, **kwargs: called.append(request_id) or {"status": "completed"},
        emit=events.append,
    )

    assert result.status == "max_ticks"
    assert attempts == 2
    assert len(called) == 1
    assert released is True
    assert waits == [10]
    assert any(event["event"] == "lease_contention" for event in events)


def test_cancellation_callback_reaches_autonomous_runner_and_releases_lease(
    workspace: SupervisorPaths,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data = yaml.safe_load(workspace.pipeline.read_text())
    data["phase"] = "spec"
    workspace.pipeline.write_text(yaml.safe_dump(data))
    values = ids()
    tick(workspace, clock=lambda: NOW, id_provider=lambda: next(values))
    stopped = False
    callbacks: list[bool] = []
    monkeypatch.setattr("engines.miniMaxEvolutionEngine.supervisor.poll.load_config", lambda *args: object())

    def request_runner(_paths, _request_id, **kwargs):
        nonlocal stopped
        callbacks.append(kwargs["cancellation"]())
        stopped = True
        callbacks.append(kwargs["cancellation"]())
        return {"status": "failed", "role": "producer"}

    result = run_poll(
        workspace,
        clock=lambda: NOW,
        id_provider=lambda: next(values),
        wait=lambda _: False,
        autonomous=True,
        max_ticks=2,
        cancellation=lambda: stopped,
        request_runner=request_runner,
    )

    assert callbacks == [False, True]
    assert result.status == "cancelled"
    assert not workspace.lease.exists()


@pytest.mark.parametrize(
    ("phase", "learning_state", "blocked", "expected"),
    [
        ("spec-done", "practicing", True, Action.WAIT_FOR_LEARNER),
        ("cycle-complete", "evaluating", False, Action.WAIT_FOR_EVIDENCE),
    ],
)
def test_learner_boundaries_do_not_dispatch_or_mutate_canonical_files(
    workspace: SupervisorPaths,
    phase: str,
    learning_state: str,
    blocked: bool,
    expected: Action,
) -> None:
    pipeline = yaml.safe_load(workspace.pipeline.read_text())
    pipeline["phase"] = phase
    workspace.pipeline.write_text(yaml.safe_dump(pipeline))
    learner = yaml.safe_load(workspace.learner.read_text())
    learner["active_unit"]["state"] = learning_state
    learner["gate"]["implementation_blocked"] = blocked
    workspace.learner.write_text(yaml.safe_dump(learner))
    before = (workspace.pipeline.read_bytes(), workspace.learner.read_bytes())

    result = run_poll(
        workspace,
        clock=lambda: NOW,
        id_provider=lambda: pytest.fail("waiting state requested an id"),
        wait=lambda _: False,
        max_ticks=1,
        tick_runner=lambda *_args, **_kwargs: pytest.fail("waiting state dispatched a tick"),
    )

    assert result.observation.canonical_action is expected
    assert (workspace.pipeline.read_bytes(), workspace.learner.read_bytes()) == before
    assert not workspace.operations.exists()


def test_external_gate_change_is_observed_on_later_iteration(workspace: SupervisorPaths) -> None:
    learner_before = workspace.learner.read_bytes()
    waits = 0

    def external_gate(_delay: float) -> bool:
        nonlocal waits
        waits += 1
        if waits == 1:
            assert workspace.learner.read_bytes() == learner_before
            data = yaml.safe_load(workspace.learner.read_text())
            data["active_unit"]["state"] = "mastered"
            workspace.learner.write_text(yaml.safe_dump(data))
        return False

    result = run_poll(workspace, clock=lambda: NOW, id_provider=lambda: pytest.fail("no run expected"),
                      wait=external_gate, max_ticks=2)

    assert result.observation.action is PollAction.COMPLETE
    assert not workspace.operations.exists()


@pytest.mark.parametrize(
    ("sent_signal", "expected_exit"),
    [(signal.SIGINT, 130), (signal.SIGTERM, 143)],
)
def test_signal_handler_requests_graceful_stop_without_immediate_exit(
    workspace: SupervisorPaths,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    sent_signal: signal.Signals,
    expected_exit: int,
) -> None:
    continued_after_signal = False

    def fake_poll(paths: SupervisorPaths, **kwargs) -> PollResult:
        nonlocal continued_after_signal
        os.kill(os.getpid(), sent_signal)
        continued_after_signal = True
        assert kwargs["cancellation"]() is True
        return PollResult("cancelled", 0, observe(paths))

    monkeypatch.setattr(supervisor_cli, "run_poll", fake_poll)
    exit_code = supervisor_cli.main([
        "--repo-root", str(workspace.repo_root), "--operations", str(workspace.operations),
        "poll", "--max-ticks", "1",
    ])

    assert continued_after_signal is True
    assert exit_code == expected_exit
    assert not workspace.lease.exists()
    assert capsys.readouterr().out == ""
