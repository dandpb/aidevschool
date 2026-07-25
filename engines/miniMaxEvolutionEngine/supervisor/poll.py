"""Read-mostly local polling wrapper around the one-shot supervisor."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any, Callable

from .autonomous import execute_request
from .config import ConfigError, load_config
from .lease import LeaseHeldError, acquire, read_lease
from .ledger import read_ledger
from .lifecycle import decide
from .models import Action, RuntimeSnapshot, SupervisorPaths
from .outbox import read_request
from .reconcile import pending_request, runtime_state
from .state import load_canonical
from .tick import tick


class PollAction(StrEnum):
    PUBLISH = "publish"
    RECONCILE = "reconcile"
    PERSIST_BLOCKER = "persist_blocker"
    PENDING = "pending"
    INTERRUPTED = "interrupted"
    HELD_LEASE = "held_lease"
    WAIT = "wait"
    COMPLETE = "complete"
    BLOCKED = "blocked"


@dataclass(frozen=True, slots=True)
class PollObservation:
    fingerprint: str
    action: PollAction
    reason: str
    canonical_action: Action
    request_id: str | None = None


@dataclass(frozen=True, slots=True)
class PollResult:
    status: str
    ticks: int
    observation: PollObservation
    autonomous_result: dict[str, Any] | None = None
    disabled_reason: str | None = None


def _has_execution_history(events: tuple[dict[str, Any], ...], request_id: str) -> bool:
    execution_events = {
        "budget_reserved",
        "budget_settled",
        "execution_started",
        "execution_finished",
        "advancement_authorized",
    }
    return any(
        event.get("request_id") == request_id and event.get("event") in execution_events
        for event in events
    )


def observe(paths: SupervisorPaths, *, owned_lease: bool = False) -> PollObservation:
    """Build a strict semantic projection without creating operational state."""
    paths.validate()
    pipeline, learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
    events = read_ledger(paths.ledger)
    marker = pending_request(paths)
    request = None
    retired = False
    missing_document = False
    if marker is not None:
        request_id = marker["request_id"]
        pending_path = paths.outbox / f"{request_id}.json"
        retired_path = paths.retired / f"{request_id}.json"
        if pending_path.is_file():
            request = read_request(pending_path)
        elif retired_path.is_file():
            request = read_request(retired_path)
            retired = True
        else:
            request = marker
            missing_document = True
    failures, blocker = runtime_state(paths, pipeline.cycle_id, pipeline.project, pipeline.phase.value)
    lease_held = not owned_lease and paths.lease.is_file() and read_lease(paths.lease) is not None
    runtime = RuntimeSnapshot(lease_held=lease_held, pending_request=request,
                              failed_attempts=failures, operational_blocker=blocker)
    decision = decide(pipeline, learner, runtime)
    request_id = request["request_id"] if request else None
    interrupted = bool(request_id and _has_execution_history(events, request_id))
    receipt = bool(request_id and (paths.resolutions / f"{request_id}.json").is_file())
    advanced = bool(request and (request["cycle_id"], request["project"], request["observed_phase"])
                    != (pipeline.cycle_id, pipeline.project, pipeline.phase.value))
    if lease_held:
        action, reason = PollAction.HELD_LEASE, "supervisor lease is held"
    elif request and (receipt or advanced):
        action, reason = PollAction.RECONCILE, "pending request requires reconciliation"
    elif blocker is not None:
        action, reason = PollAction.BLOCKED, blocker
    elif request and (retired or missing_document):
        action, reason = PollAction.RECONCILE, "pending request requires reconciliation"
    elif interrupted:
        action, reason = PollAction.INTERRUPTED, "interrupted autonomous execution requires operator recovery"
    elif request:
        action, reason = PollAction.PENDING, "phase request is pending"
    elif decision.action is Action.RUN_PHASE:
        action, reason = PollAction.PUBLISH, decision.reason
    elif decision.action is Action.BLOCKED and blocker is None and decision.plan is not None:
        action, reason = PollAction.PERSIST_BLOCKER, decision.reason
    elif decision.action is Action.BLOCKED:
        action, reason = PollAction.BLOCKED, decision.reason
    elif decision.action is Action.CYCLE_COMPLETE:
        action, reason = PollAction.COMPLETE, decision.reason
    else:
        action, reason = PollAction.WAIT, decision.reason
    semantic = {
        "cycle": pipeline.cycle_id, "project": pipeline.project, "phase": pipeline.phase.value,
        "pipeline_blockers": pipeline.blockers,
        "unit": learner.unit_id, "learning": learner.state.value, "implementation_blocked": learner.implementation_blocked,
        "failures": failures, "blocker": blocker, "lease": lease_held, "request": request_id,
        "request_attempt": request.get("attempt") if request else None, "receipt": receipt,
        "retired": retired, "missing_document": missing_document,
        "interrupted": interrupted, "action": action.value,
    }
    fingerprint = hashlib.sha256(json.dumps(semantic, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return PollObservation(fingerprint, action, reason, decision.action, request_id)


def run_poll(
    paths: SupervisorPaths, *, clock: Callable[[], str], id_provider: Callable[[], str],
    wait: Callable[[float], bool], interval_seconds: float = 5, max_interval_seconds: float = 60,
    backoff_factor: float = 2, max_ticks: int | None = None, autonomous: bool = False,
    config_path: Path | None = None, tick_runner: Callable[..., Any] = tick,
    request_runner: Callable[..., dict[str, Any]] = execute_request,
    cancellation: Callable[[], bool] = lambda: False,
    emit: Callable[[dict[str, Any]], None] = lambda event: None,
) -> PollResult:
    disabled = None
    if autonomous:
        try:
            load_config(paths.repo_root, config_path or paths.operations / "autonomous.yaml")
        except ConfigError as exc:
            disabled = str(exc)
            observation = observe(paths)
            emit({"event": "autonomous_disabled", "reason": disabled})
            return PollResult("autonomous_disabled", 0, observation, disabled_reason=disabled)
    delay = interval_seconds
    previous: str | None = None
    ticks = 0
    last = observe(paths)
    while True:
        if cancellation():
            emit({"event": "shutdown"})
            return PollResult("cancelled", ticks, last, disabled_reason=disabled)
        current = observe(paths)
        changed = current.fingerprint != previous
        if changed:
            emit({"event": "observation", "action": current.action.value, "reason": current.reason,
                  "fingerprint": current.fingerprint, "request_id": current.request_id})
            delay = interval_seconds
        acted = False
        contended = False
        autonomous_result = None
        if current.action in {PollAction.PUBLISH, PollAction.RECONCILE, PollAction.PERSIST_BLOCKER}:
            if cancellation():
                emit({"event": "shutdown"})
                return PollResult("cancelled", ticks, current, disabled_reason=disabled)
            decision = tick_runner(paths, clock=clock, id_provider=id_provider)
            emit({"event": "tick", "action": decision.action.value, "reason": decision.reason})
            acted = True
            current = observe(paths)
        if autonomous and current.action is PollAction.PENDING and current.request_id:
            if cancellation():
                emit({"event": "shutdown"})
                return PollResult("cancelled", ticks, current, disabled_reason=disabled)
            try:
                lease = acquire(paths.lease, id_provider(), clock(), 0)
            except LeaseHeldError:
                current = observe(paths)
                emit({"event": "lease_contention", "reason": "supervisor lease was acquired concurrently"})
                contended = True
            else:
                try:
                    acquired_request_id = current.request_id
                    revalidated = observe(paths, owned_lease=True)
                    if (
                        revalidated.action is not PollAction.PENDING
                        or revalidated.request_id != acquired_request_id
                    ):
                        emit({
                            "event": "autonomous_request_changed",
                            "request_id": acquired_request_id,
                            "observed_request_id": revalidated.request_id,
                            "action": revalidated.action.value,
                            "reason": revalidated.reason,
                        })
                        current = revalidated
                        acted = True
                    else:
                        autonomous_result = request_runner(
                            paths,
                            acquired_request_id,
                            config_path=config_path,
                            cancellation=cancellation,
                        )
                except ConfigError as exc:
                    disabled = str(exc)
                    emit({"event": "autonomous_disabled", "reason": disabled})
                    return PollResult(
                        "autonomous_disabled",
                        ticks,
                        current,
                        disabled_reason=disabled,
                    )
                finally:
                    lease.release()
                if autonomous_result is not None:
                    emit({"event": "autonomous_result", **autonomous_result})
                    acted = True
                    current = observe(paths)
        ticks += 1
        last = current
        if max_ticks is not None and ticks >= max_ticks:
            return PollResult("max_ticks", ticks, last, autonomous_result, disabled)
        if cancellation():
            emit({"event": "shutdown"})
            return PollResult("cancelled", ticks, last, autonomous_result, disabled)
        if contended:
            delay = min(max_interval_seconds, delay * backoff_factor)
        elif acted or current.fingerprint != previous:
            delay = interval_seconds
        else:
            delay = min(max_interval_seconds, delay * backoff_factor)
        previous = current.fingerprint
        if wait(delay) or cancellation():
            emit({"event": "shutdown"})
            return PollResult("cancelled", ticks, last, autonomous_result, disabled)
