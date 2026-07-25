from __future__ import annotations

import json
import os
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import yaml

from engines.miniMaxEvolutionEngine.supervisor.decision import decide
from engines.miniMaxEvolutionEngine.supervisor.__main__ import main
from engines.miniMaxEvolutionEngine.supervisor.ledger import LedgerError, append_event, read_ledger
from engines.miniMaxEvolutionEngine.supervisor.lease import LeaseHeldError, acquire, recover
from engines.miniMaxEvolutionEngine.supervisor.models import (
    Action,
    LearnerState,
    LearningState,
    PipelinePhase,
    PipelineState,
    RuntimeSnapshot,
    SupervisorPaths,
)
from engines.miniMaxEvolutionEngine.supervisor.outbox import OutboxError, publish, resolve, retire
from engines.miniMaxEvolutionEngine.supervisor.reconcile import (
    abandon_unpublished_request,
    pending_request,
    reconcile,
    resolve_request,
    resume_operations,
    runtime_state,
)
from engines.miniMaxEvolutionEngine.supervisor.state import InvalidStateError, load_canonical
from engines.miniMaxEvolutionEngine.supervisor.tick import tick


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


def _ids(*values: str):
    iterator: Iterator[str] = iter(values)
    return lambda: next(iterator)


def _set_phase(paths: SupervisorPaths, phase: str) -> None:
    value = yaml.safe_load(paths.pipeline.read_text(encoding="utf-8"))
    value["phase"] = phase
    _write_yaml(paths.pipeline, value)


def _set_learner(paths: SupervisorPaths, *, state: str | None = None, blocked: bool | None = None) -> None:
    value = yaml.safe_load(paths.learner.read_text(encoding="utf-8"))
    if state is not None:
        value["active_unit"]["state"] = state
    if blocked is not None:
        value["gate"]["implementation_blocked"] = blocked
    _write_yaml(paths.learner, value)


@pytest.mark.parametrize(
    ("phase", "name", "next_phase"),
    [
        ("spec", "spec", "spec-done"),
        ("spec-done", "impl", "impl-done"),
        ("impl-done", "review", "review-done"),
        ("review-done", "benchmark", "benchmark-done"),
        ("benchmark-done", "optimize", "cycle-complete"),
    ],
)
def test_phase_table_decisions(workspace: SupervisorPaths, phase: str, name: str, next_phase: str) -> None:
    _set_phase(workspace, phase)
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    first = decide(pipeline, learner)
    assert first == decide(pipeline, learner)
    assert first.action is Action.RUN_PHASE
    assert first.plan is not None
    assert (first.plan.name, first.plan.next_phase.value) == (name, next_phase)
    assert first.plan.verifier_role == "verifier"


def test_gate_blocks_only_implementation_transition(workspace: SupervisorPaths) -> None:
    _set_learner(workspace, blocked=True)
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert decide(pipeline, learner).action is Action.RUN_PHASE
    _set_phase(workspace, "spec-done")
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert decide(pipeline, learner).action is Action.WAIT_FOR_LEARNER
    _set_phase(workspace, "impl-done")
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert decide(pipeline, learner).action is Action.RUN_PHASE


def test_cycle_complete_waits_for_evidence_until_mastered(workspace: SupervisorPaths) -> None:
    _set_phase(workspace, "cycle-complete")
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert decide(pipeline, learner).action is Action.WAIT_FOR_EVIDENCE
    _set_learner(workspace, state="mastered")
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert decide(pipeline, learner).action is Action.CYCLE_COMPLETE


def test_pipeline_blocker_wins(workspace: SupervisorPaths) -> None:
    value = yaml.safe_load(workspace.pipeline.read_text(encoding="utf-8"))
    value["blockers"] = ["toolchain unavailable"]
    _write_yaml(workspace.pipeline, value)
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert decide(pipeline, learner).action is Action.BLOCKED


def test_runtime_state_is_an_explicit_decision_input(workspace: SupervisorPaths) -> None:
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert decide(pipeline, learner, RuntimeSnapshot(lease_held=True)).action is Action.ALREADY_RUNNING
    assert decide(
        pipeline,
        learner,
        RuntimeSnapshot(operational_blocker="operator pause"),
    ).action is Action.BLOCKED
    assert decide(
        pipeline,
        learner,
        RuntimeSnapshot(failed_attempts=3),
    ).action is Action.BLOCKED


def test_implementation_gate_precedes_retry_exhaustion(workspace: SupervisorPaths) -> None:
    _set_phase(workspace, "spec-done")
    _set_learner(workspace, blocked=True)
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    decision = decide(pipeline, learner, RuntimeSnapshot(failed_attempts=3))
    assert decision.action is Action.WAIT_FOR_LEARNER


@pytest.mark.parametrize("missing", ["pipeline", "learner"])
def test_missing_canonical_state_fails_closed(workspace: SupervisorPaths, missing: str) -> None:
    getattr(workspace, missing).unlink()
    with pytest.raises(InvalidStateError, match="missing canonical state"):
        load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)


@pytest.mark.parametrize("bad_value", ["[]", "not: [valid", "null\n"])
def test_malformed_canonical_state_fails_closed(workspace: SupervisorPaths, bad_value: str) -> None:
    workspace.pipeline.write_text(bad_value, encoding="utf-8")
    with pytest.raises(InvalidStateError):
        load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)


def test_project_shape_and_active_unit_alignment_are_strict(workspace: SupervisorPaths) -> None:
    (workspace.curriculum / "02_key_value_store/docs").rmdir()
    with pytest.raises(InvalidStateError, match="docs"):
        load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    (workspace.curriculum / "02_key_value_store/docs").mkdir()
    value = yaml.safe_load(workspace.learner.read_text(encoding="utf-8"))
    value["active_unit"]["project"] = "01_rate_limiter"
    _write_yaml(workspace.learner, value)
    with pytest.raises(InvalidStateError, match="does not match"):
        load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)


def test_pipeline_rejects_bare_project_slug(workspace: SupervisorPaths) -> None:
    value = yaml.safe_load(workspace.pipeline.read_text(encoding="utf-8"))
    value["current_project"] = "02_key_value_store"
    _write_yaml(workspace.pipeline, value)
    with pytest.raises(InvalidStateError, match="exactly curriculum"):
        load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)


def test_ledger_is_strict_and_append_only(tmp_path: Path) -> None:
    path = tmp_path / "ledger.ndjson"
    append_event(path, {"schema_version": 1, "event": "decision_recorded", "run_id": "one", "project": "p", "action": "blocked"})
    append_event(path, {"schema_version": 1, "event": "decision_recorded", "run_id": "two", "project": "p", "action": "blocked"})
    assert len(read_ledger(path)) == 2
    path.write_text(path.read_text(encoding="utf-8") + "{bad", encoding="utf-8")
    with pytest.raises(LedgerError):
        read_ledger(path)


def test_lease_is_exclusive_and_never_stolen(tmp_path: Path) -> None:
    path = tmp_path / "lease.json"
    lease = acquire(path, "one", NOW, 1)
    with pytest.raises(LeaseHeldError):
        acquire(path, "two", NOW, 2)
    assert json.loads(path.read_text(encoding="utf-8"))["owner"] == "one"
    lease.release()
    assert not path.exists()


def test_expired_lease_requires_explicit_recovery(tmp_path: Path) -> None:
    path = tmp_path / "lease.json"
    acquired = datetime(2026, 7, 24, 12, tzinfo=timezone.utc)
    lease = acquire(path, "one", acquired.isoformat(), 1, duration_seconds=60)
    with pytest.raises(LeaseHeldError, match="active process"):
        recover(path, (acquired + timedelta(seconds=30)).isoformat())
    os.close(lease.fd)
    with pytest.raises(LeaseHeldError, match="not expired"):
        recover(path, (acquired + timedelta(seconds=30)).isoformat())
    assert recover(path, (acquired + timedelta(seconds=61)).isoformat()) == "one"
    assert not path.exists()


def _request(request_id: str = "request-1") -> dict:
    return {
        "schema_version": 1, "request_id": request_id, "run_id": "run", "created_at": NOW,
        "cycle_id": "cycle-2", "project": "02_key_value_store", "active_unit": "U2-key-value-store",
        "phase": "spec", "observed_phase": "spec", "intended_phase": "spec-done",
        "command": "/devschool-spec", "producer_role": "curator",
        "verifier_role": "verifier", "producer_context_id": "producer", "verifier_context_id": "verifier",
        "fresh_verifier": True, "retry_limit": 3, "attempt": 1,
    }


def test_outbox_allows_only_table_commands_roles_and_atomic_resolution(tmp_path: Path) -> None:
    request = _request()
    path = publish(tmp_path / "outbox", request)
    assert json.loads(path.read_text(encoding="utf-8"))["command"] == "/devschool-spec"
    with pytest.raises(OutboxError):
        publish(tmp_path / "outbox", request)
    invalid = _request("bad") | {"command": "rm -rf /"}
    with pytest.raises(OutboxError):
        publish(tmp_path / "outbox", invalid)
    mismatched = _request("mismatched") | {"command": "/devschool-review"}
    with pytest.raises(OutboxError):
        publish(tmp_path / "outbox", mismatched)
    resolution = resolve(tmp_path / "resolved", "request-1", {"result": "completed", "resolved_at": NOW, "canonical_phase": "spec-done"})
    assert json.loads(resolution.read_text(encoding="utf-8"))["result"] == "completed"
    with pytest.raises(OutboxError, match="unsafe request_id"):
        publish(tmp_path / "outbox", _request("../escape"))


def test_one_tick_publishes_one_fresh_verifier_request(workspace: SupervisorPaths) -> None:
    result = tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"), process_id=7)
    assert result.action is Action.RUN_PHASE
    requests = list(workspace.outbox.glob("*.json"))
    assert len(requests) == 1
    request = json.loads(requests[0].read_text(encoding="utf-8"))
    assert request["fresh_verifier"] is True
    assert request["producer_context_id"] != request["verifier_context_id"]
    assert [event["event"] for event in read_ledger(workspace.ledger)] == ["request_planned", "request_published"]
    assert not workspace.lease.exists()


def test_tick_accepts_timezone_aware_datetime_clock(workspace: SupervisorPaths) -> None:
    result = tick(
        workspace,
        clock=lambda: datetime(2026, 7, 24, 12, tzinfo=timezone.utc),
        id_provider=_ids("run", "request", "producer", "verifier"),
    )
    assert result.action is Action.RUN_PHASE
    request = json.loads((workspace.outbox / "request.json").read_text(encoding="utf-8"))
    assert request["created_at"] == NOW


def test_pending_unchanged_prevents_duplicate_request(workspace: SupervisorPaths) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    before_pipeline = workspace.pipeline.read_bytes()
    before_learner = workspace.learner.read_bytes()
    result = tick(workspace, clock=lambda: NOW, id_provider=_ids("run-2"))
    assert result.action is Action.ALREADY_RUNNING
    assert workspace.pipeline.read_bytes() == before_pipeline
    assert workspace.learner.read_bytes() == before_learner
    assert len(list(workspace.outbox.glob("*.json"))) == 1


def test_existing_lease_prevents_request(workspace: SupervisorPaths) -> None:
    lease = acquire(workspace.lease, "other", NOW, 1)
    before_pipeline = workspace.pipeline.read_bytes()
    before_learner = workspace.learner.read_bytes()
    try:
        result = tick(workspace, clock=lambda: NOW, id_provider=_ids("run"))
        assert result.action is Action.ALREADY_RUNNING
        assert workspace.pipeline.read_bytes() == before_pipeline
        assert workspace.learner.read_bytes() == before_learner
        assert not workspace.outbox.exists()
    finally:
        lease.release()


def test_reconcile_advanced_phase_resolves_without_duplicate(workspace: SupervisorPaths) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    _set_phase(workspace, "spec-done")
    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    result = reconcile(workspace, pipeline, NOW)
    assert result.status == "advanced"
    assert (workspace.resolutions / "request.json").is_file()
    assert (workspace.retired / "request.json").is_file()
    assert not (workspace.outbox / "request.json").exists()
    assert read_ledger(workspace.ledger)[-1]["event"] == "request_resolved"


def test_reconcile_missing_request_fails_closed(workspace: SupervisorPaths) -> None:
    append_event(workspace.ledger, {
        "schema_version": 1, "event": "request_planned", "run_id": "run", "request_id": "lost",
        "project": "02_key_value_store", "cycle_id": "cycle-2", "active_unit": "U2-key-value-store",
        "observed_phase": "spec", "intended_phase": "spec-done", "attempt": 1,
    })
    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert reconcile(workspace, pipeline, NOW).status == "invalid"
    assert read_ledger(workspace.ledger)[-1]["event"] == "operational_blocked"


def test_reconcile_divergent_phase_fails_closed(workspace: SupervisorPaths) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    _set_phase(workspace, "impl-done")
    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    result = reconcile(workspace, pipeline, NOW)
    assert result.status == "invalid"
    assert not workspace.resolutions.exists()


@pytest.mark.parametrize(
    ("scenario", "expected"),
    [
        ("blocked", Action.BLOCKED),
        ("learner", Action.WAIT_FOR_LEARNER),
        ("evidence", Action.WAIT_FOR_EVIDENCE),
        ("complete", Action.CYCLE_COMPLETE),
        ("malformed", Action.INVALID_STATE),
    ],
)
def test_non_dispatch_ticks_never_mutate_domain_state(
    workspace: SupervisorPaths,
    scenario: str,
    expected: Action,
) -> None:
    if scenario == "blocked":
        value = yaml.safe_load(workspace.pipeline.read_text(encoding="utf-8"))
        value["blockers"] = ["operator recovery required"]
        _write_yaml(workspace.pipeline, value)
    elif scenario == "learner":
        _set_phase(workspace, "spec-done")
        _set_learner(workspace, blocked=True)
    elif scenario in {"evidence", "complete"}:
        _set_phase(workspace, "cycle-complete")
        if scenario == "complete":
            _set_learner(workspace, state="mastered")
    else:
        _set_phase(workspace, "unsupported")
    before_pipeline = workspace.pipeline.read_bytes()
    before_learner = workspace.learner.read_bytes()
    result = tick(workspace, clock=lambda: NOW, id_provider=_ids("run"))
    assert result.action is expected
    assert workspace.pipeline.read_bytes() == before_pipeline
    assert workspace.learner.read_bytes() == before_learner
    assert not workspace.outbox.exists()


def test_tick_with_invalid_state_creates_no_outbox(workspace: SupervisorPaths) -> None:
    workspace.pipeline.unlink()
    result = tick(workspace, clock=lambda: NOW, id_provider=_ids("run"))
    assert result.action is Action.INVALID_STATE
    assert not workspace.outbox.exists()


def test_complete_requires_canonical_advancement_and_retires_request(workspace: SupervisorPaths) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    with pytest.raises(OutboxError, match="canonical phase"):
        resolve_request(workspace, "request", "completed", NOW, pipeline, learner)
    _set_phase(workspace, "spec-done")
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    result = resolve_request(workspace, "request", "completed", NOW, pipeline, learner)
    assert result.status == "resolved"
    assert not (workspace.outbox / "request.json").exists()
    assert (workspace.retired / "request.json").is_file()
    assert (workspace.resolutions / "request.json").is_file()
    assert read_ledger(workspace.ledger)[-1]["result"] == "completed"


def test_cli_complete_is_leased_and_requires_canonical_advancement(
    workspace: SupervisorPaths,
    capsys: pytest.CaptureFixture[str],
) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    arguments = [
        "--repo-root",
        str(workspace.repo_root),
        "--operations",
        str(workspace.operations),
        "complete",
        "request",
    ]

    assert main(arguments) == 2
    failure = json.loads(capsys.readouterr().out)
    assert failure["action"] == "invalid_state"
    assert "canonical phase" in failure["reason"]
    assert (workspace.outbox / "request.json").is_file()
    assert not workspace.lease.exists()

    _set_phase(workspace, "spec-done")
    assert main(arguments) == 0
    completed = json.loads(capsys.readouterr().out)
    assert completed == {"reason": "request completed", "status": "resolved"}
    assert (workspace.retired / "request.json").is_file()
    assert (workspace.resolutions / "request.json").is_file()
    assert not workspace.lease.exists()


def test_failed_requests_exhaust_retries_and_resume_resets_them(workspace: SupervisorPaths) -> None:
    for attempt in range(1, 4):
        request_id = f"request-{attempt}"
        tick(
            workspace,
            clock=lambda: NOW,
            id_provider=_ids(f"run-{attempt}", request_id, f"producer-{attempt}", f"verifier-{attempt}"),
        )
        request = json.loads((workspace.outbox / f"{request_id}.json").read_text(encoding="utf-8"))
        assert request["attempt"] == attempt
        pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
        resolve_request(
            workspace,
            request_id,
            "failed",
            NOW,
            pipeline,
            learner,
            detail=f"verification failed {attempt}",
        )

    result = tick(workspace, clock=lambda: NOW, id_provider=_ids("blocked-run"))
    assert result.action is Action.BLOCKED
    failures, blocker = runtime_state(workspace, "cycle-2", "02_key_value_store", "spec")
    assert failures == 3
    assert blocker == "retry limit exhausted (3/3)"
    assert not list(workspace.outbox.glob("*.json"))
    blocked_events = read_ledger(workspace.ledger)
    repeated = tick(workspace, clock=lambda: NOW, id_provider=_ids("blocked-run-2"))
    assert repeated.action is Action.BLOCKED
    assert read_ledger(workspace.ledger) == blocked_events

    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    resume_operations(workspace, pipeline, "resume-run", NOW)
    result = tick(
        workspace,
        clock=lambda: NOW,
        id_provider=_ids("run-4", "request-4", "producer-4", "verifier-4"),
    )
    assert result.action is Action.RUN_PHASE
    request = json.loads((workspace.outbox / "request-4.json").read_text(encoding="utf-8"))
    assert request["attempt"] == 1


def test_operator_block_is_durable_until_resume(workspace: SupervisorPaths) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    resolve_request(
        workspace,
        "request",
        "blocked",
        NOW,
        pipeline,
        learner,
        detail="toolchain unavailable",
    )
    result = tick(workspace, clock=lambda: NOW, id_provider=_ids("blocked-run"))
    assert result.action is Action.BLOCKED
    assert result.reason == "toolchain unavailable"


def test_reconcile_repairs_receipt_without_ledger_event(workspace: SupervisorPaths) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    resolve(
        workspace.resolutions,
        "request",
        {"result": "failed", "resolved_at": NOW, "canonical_phase": "spec", "summary": "failed"},
    )
    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert reconcile(workspace, pipeline, NOW).status == "resolved"
    assert reconcile(workspace, pipeline, NOW).status == "none"
    assert read_ledger(workspace.ledger)[-1]["result"] == "failed"


def test_reconcile_blocks_receipt_that_conflicts_with_canonical_phase(
    workspace: SupervisorPaths,
) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    resolve(
        workspace.resolutions,
        "request",
        {
            "result": "failed",
            "resolved_at": NOW,
            "canonical_phase": "spec-done",
            "summary": "contradictory receipt",
        },
    )
    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)

    result = reconcile(workspace, pipeline, NOW)

    assert result.status == "invalid"
    assert "unexpected canonical phase" in result.reason
    assert (workspace.outbox / "request.json").is_file()
    assert not workspace.retired.exists()
    assert read_ledger(workspace.ledger)[-1]["event"] == "operational_blocked"


def test_invalid_resolution_result_does_not_retire_pending_request(
    workspace: SupervisorPaths,
) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)

    with pytest.raises(OutboxError, match="invalid operator resolution"):
        resolve_request(workspace, "request", "reconciled", NOW, pipeline, learner)

    assert (workspace.outbox / "request.json").is_file()
    assert not workspace.retired.exists()
    assert not workspace.resolutions.exists()


def test_retirement_repairs_link_before_pending_unlink_crash(tmp_path: Path) -> None:
    pending = tmp_path / "pending"
    retired = tmp_path / "retired"
    request_path = publish(pending, _request())
    retired.mkdir()
    os.link(request_path, retired / request_path.name)

    result = retire(pending, retired, "request-1")

    assert result == retired / "request-1.json"
    assert not request_path.exists()
    assert json.loads(result.read_text(encoding="utf-8"))["request_id"] == "request-1"


def test_resolution_crash_window_retires_request_before_ledger_completion(
    workspace: SupervisorPaths,
) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    pending = workspace.outbox / "request.json"
    workspace.retired.mkdir(parents=True)
    pending.rename(workspace.retired / "request.json")
    resolve(
        workspace.resolutions,
        "request",
        {"result": "failed", "resolved_at": NOW, "canonical_phase": "spec", "summary": "failed"},
    )

    result = tick(workspace, clock=lambda: NOW, id_provider=_ids("repair-run"))

    assert result.action is Action.RECONCILED
    assert not pending.exists()
    assert read_ledger(workspace.ledger)[-1]["result"] == "failed"
    next_result = tick(
        workspace,
        clock=lambda: NOW,
        id_provider=_ids("next-run", "next-request", "next-producer", "next-verifier"),
    )
    assert next_result.action is Action.RUN_PHASE
    assert [path.name for path in workspace.outbox.glob("*.json")] == ["next-request.json"]


def test_retired_request_without_receipt_recovers_via_repeated_resolution(
    workspace: SupervisorPaths,
) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    workspace.retired.mkdir(parents=True)
    (workspace.outbox / "request.json").rename(workspace.retired / "request.json")
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)

    interrupted = reconcile(workspace, pipeline, NOW)
    assert interrupted.status == "invalid"
    assert "rerun complete, fail, or block" in interrupted.reason

    recovered = resolve_request(
        workspace,
        "request",
        "failed",
        NOW,
        pipeline,
        learner,
        detail="verification failed before receipt persistence",
    )
    assert recovered.status == "resolved"
    assert (workspace.resolutions / "request.json").is_file()
    assert pending_request(workspace) is None


def test_status_reports_pending_request_and_attempt(
    workspace: SupervisorPaths,
    capsys: pytest.CaptureFixture[str],
) -> None:
    tick(workspace, clock=lambda: NOW, id_provider=_ids("run", "request", "producer", "verifier"))
    before_pipeline = workspace.pipeline.read_bytes()
    before_learner = workspace.learner.read_bytes()
    exit_code = main([
        "--repo-root", str(workspace.repo_root),
        "--operations", str(workspace.operations),
        "status",
    ])
    output = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert output["action"] == "already_running"
    assert output["active_unit"] == "U2-key-value-store"
    assert output["pending_request"] == {
        "request_id": "request",
        "attempt": 1,
        "command": "/devschool-spec",
    }
    assert workspace.pipeline.read_bytes() == before_pipeline
    assert workspace.learner.read_bytes() == before_learner


def test_tick_revalidates_canonical_state_before_publication(workspace: SupervisorPaths) -> None:
    def change_phase() -> None:
        _set_phase(workspace, "spec-done")

    result = tick(
        workspace,
        clock=lambda: NOW,
        id_provider=_ids("run", "request", "producer", "verifier"),
        before_publish=change_phase,
    )
    assert result.action is Action.INVALID_STATE
    assert not workspace.outbox.exists()
    assert not workspace.ledger.exists()


def test_operations_path_must_remain_inside_repository(workspace: SupervisorPaths, tmp_path: Path) -> None:
    escaped = SupervisorPaths(
        workspace.repo_root,
        workspace.pipeline,
        workspace.learner,
        workspace.curriculum,
        tmp_path.parent / "outside-supervisor-state",
    )
    with pytest.raises(ValueError, match="operations escapes"):
        escaped.validate()

    outside = tmp_path.parent / "outside-outbox"
    outside.mkdir(exist_ok=True)
    (workspace.operations / "outbox").parent.mkdir(parents=True, exist_ok=True)
    (workspace.operations / "outbox").symlink_to(outside, target_is_directory=True)
    with pytest.raises(ValueError, match="may not be a symlink"):
        workspace.validate()


def test_unpublished_request_can_be_abandoned_then_resumed(workspace: SupervisorPaths) -> None:
    append_event(workspace.ledger, {
        "schema_version": 1, "event": "request_planned", "run_id": "run", "request_id": "lost",
        "project": "02_key_value_store", "cycle_id": "cycle-2", "active_unit": "U2-key-value-store",
        "observed_phase": "spec", "intended_phase": "spec-done", "attempt": 1,
    })
    pipeline, learner = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    assert reconcile(workspace, pipeline, NOW).status == "invalid"
    outcome = abandon_unpublished_request(
        workspace,
        "lost",
        "publication interrupted",
        NOW,
        pipeline,
        learner,
    )
    assert outcome.status == "resolved"
    resume_operations(workspace, pipeline, "resume", NOW)
    result = tick(
        workspace,
        clock=lambda: NOW,
        id_provider=_ids("run-2", "request-2", "producer-2", "verifier-2"),
    )
    assert result.action is Action.RUN_PHASE


def test_retry_history_is_scoped_to_cycle(workspace: SupervisorPaths) -> None:
    for attempt in range(1, 4):
        append_event(workspace.ledger, {
            "schema_version": 1,
            "event": "request_resolved",
            "request_id": f"old-{attempt}",
            "cycle_id": "old-cycle",
            "project": "02_key_value_store",
            "observed_phase": "spec",
            "result": "failed",
        })
    failures, blocker = runtime_state(workspace, "cycle-2", "02_key_value_store", "spec")
    assert failures == 0
    assert blocker is None
