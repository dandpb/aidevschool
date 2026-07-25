"""Explicit request lifecycle state machine for the supervisor.

The lifecycle makes the previously implicit request states visible:

    NONE -> PLANNED -> PUBLISHED -> EXECUTING -> RESOLVED -> ADVANCED

Transitions that were scattered across tick/reconcile/outbox/poll are owned
here as explicit operations, while the atomic file-store primitives stay in
outbox.py and the interactive resolution details stay in reconcile.py.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any, Mapping

from .ledger import append_event, read_ledger
from .models import (
    Action,
    Decision,
    LearnerState,
    LearningState,
    PhasePlan,
    PipelinePhase,
    PipelineState,
    RuntimeSnapshot,
    SupervisorPaths,
)
from .outbox import OutboxError, publish as _outbox_publish, read_request, read_resolution, validate_request
from .plans import PHASE_PLANS
from .reconcile import pending_request_from_events as _pending_request_from_events


class LifecycleState(StrEnum):
    """Explicit states of a single supervisor phase request."""

    NONE = "none"
    PLANNED = "planned"
    PUBLISHED = "published"
    EXECUTING = "executing"
    RESOLVED = "resolved"
    ADVANCED = "advanced"


@dataclass(frozen=True, slots=True)
class RequestState:
    """Snapshot of a request's current lifecycle state."""

    state: LifecycleState
    request: Mapping[str, Any] | None = None
    request_id: str | None = None


@dataclass(frozen=True, slots=True)
class RequestIds:
    """Fresh identities produced for a single phase request."""

    request_id: str
    producer_context_id: str
    verifier_context_id: str


def decide(
    pipeline: PipelineState,
    learner: LearnerState,
    runtime: RuntimeSnapshot = RuntimeSnapshot(),
) -> Decision:
    """Pure deterministic supervisor decision kernel."""
    base = {"project": pipeline.project, "observed_phase": pipeline.phase}
    if runtime.lease_held:
        return Decision(Action.ALREADY_RUNNING, "supervisor lease is held", **base)
    if runtime.pending_request is not None:
        return Decision(Action.ALREADY_RUNNING, "a phase request is already pending", **base)
    if runtime.operational_blocker:
        return Decision(Action.BLOCKED, runtime.operational_blocker, **base)
    if pipeline.blockers:
        return Decision(Action.BLOCKED, "; ".join(pipeline.blockers), **base)
    if pipeline.phase is PipelinePhase.SPEC_DONE and learner.implementation_blocked:
        return Decision(Action.WAIT_FOR_LEARNER, "implementation gate is blocked", **base)
    if pipeline.phase is PipelinePhase.CYCLE_COMPLETE:
        if learner.state is not LearningState.MASTERED:
            return Decision(
                Action.WAIT_FOR_EVIDENCE,
                "project complete; learner evidence gate remains",
                **base,
            )
        return Decision(Action.CYCLE_COMPLETE, "project and active unit are complete", **base)

    plan = PHASE_PLANS.get(pipeline.phase)
    if plan is None:
        return Decision(Action.INVALID_STATE, "phase has no approved plan", **base)
    if runtime.failed_attempts >= plan.retry_limit:
        return Decision(
            Action.BLOCKED,
            f"retry limit exhausted ({runtime.failed_attempts}/{plan.retry_limit})",
            plan=plan,
            **base,
        )
    return Decision(Action.RUN_PHASE, f"approved {plan.name} phase is ready", plan=plan, **base)


class RequestBuilder:
    """Constructs validated supervisor phase requests.

    This is the single place that knows how to turn a phase plan and runtime
    context into the request schema consumed by the outbox. The validator
    remains in outbox.py so the file-store layer can still reject corrupted
    reads.
    """

    @staticmethod
    def build(
        plan: PhasePlan,
        *,
        pipeline: PipelineState,
        learner: LearnerState,
        run_id: str,
        now: str,
        ids: RequestIds,
        attempt: int,
    ) -> dict[str, Any]:
        """Build a complete, validated phase request dict.

        Raises OutboxError if the plan is missing or the produced ids are not
        fresh.
        """
        if ids.producer_context_id == ids.verifier_context_id:
            raise OutboxError("ID provider did not produce a fresh verifier context")
        request: dict[str, Any] = {
            "schema_version": 1,
            "request_id": ids.request_id,
            "run_id": run_id,
            "created_at": now,
            "cycle_id": pipeline.cycle_id,
            "project": pipeline.project,
            "active_unit": learner.unit_id,
            "phase": plan.name,
            "observed_phase": plan.observed_phase.value,
            "intended_phase": plan.next_phase.value,
            "command": plan.command,
            "producer_role": plan.producer_role,
            "verifier_role": plan.verifier_role,
            "producer_context_id": ids.producer_context_id,
            "verifier_context_id": ids.verifier_context_id,
            "fresh_verifier": True,
            "retry_limit": plan.retry_limit,
            "attempt": attempt,
        }
        validate_request(request)
        return request


def _has_unfinished_execution(events: tuple[dict[str, Any], ...], request_id: str) -> bool:
    """True when at least one role started execution but did not finish."""
    started = {
        (event["role"], event["context_id"])
        for event in events
        if event["event"] == "execution_started" and event.get("request_id") == request_id
    }
    finished = {
        (event["role"], event["context_id"])
        for event in events
        if event["event"] == "execution_finished" and event.get("request_id") == request_id
    }
    return bool(started - finished)


def current_request_state(paths: SupervisorPaths, pipeline: PipelineState) -> RequestState:
    """Derive the explicit lifecycle state of the current request.

    This reads the same sources the rest of the supervisor uses — ledger
    markers, outbox files, resolution receipts — but returns a single explicit
    state instead of leaving the caller to reconstruct it.
    """
    events = read_ledger(paths.ledger)
    marker = _pending_request_from_events(events)
    if marker is None:
        return RequestState(LifecycleState.NONE)

    request_id = marker["request_id"]
    pending_path = paths.outbox / f"{request_id}.json"
    retired_path = paths.retired / f"{request_id}.json"
    receipt_path = paths.resolutions / f"{request_id}.json"

    if receipt_path.is_file():
        receipt = read_resolution(receipt_path)
        if (
            receipt.get("result") == "reconciled"
            and pipeline.phase.value == marker.get("intended_phase")
        ):
            return RequestState(LifecycleState.ADVANCED, marker, request_id)
        return RequestState(LifecycleState.RESOLVED, marker, request_id)

    request: Mapping[str, Any] | None = None
    if pending_path.is_file():
        request = read_request(pending_path)
    elif retired_path.is_file():
        request = read_request(retired_path)

    if _has_unfinished_execution(events, request_id):
        return RequestState(LifecycleState.EXECUTING, request or marker, request_id)

    if pending_path.is_file() or retired_path.is_file():
        return RequestState(LifecycleState.PUBLISHED, request, request_id)

    return RequestState(LifecycleState.PLANNED, marker, request_id)


class SupervisorLifecycle:
    """Owns the supervisor request lifecycle transitions.

    This is the deep module called by tick.py and poll.py. It does not itself
    acquire leases or observe filesystem state; callers load canonical state
    and hold leases as before.
    """

    def __init__(self, paths: SupervisorPaths) -> None:
        self.paths = paths

    def state(self, pipeline: PipelineState) -> RequestState:
        """Return the explicit lifecycle state of the current request."""
        return current_request_state(self.paths, pipeline)

    def build_request(
        self,
        plan: PhasePlan,
        *,
        pipeline: PipelineState,
        learner: LearnerState,
        run_id: str,
        now: str,
        ids: RequestIds,
        attempt: int,
    ) -> dict[str, Any]:
        """Build a validated request dict for the given phase plan."""
        return RequestBuilder.build(
            plan,
            pipeline=pipeline,
            learner=learner,
            run_id=run_id,
            now=now,
            ids=ids,
            attempt=attempt,
        )

    def publish(self, request: dict[str, Any], now: str) -> Path:
        """Transition a planned request to published.

        Writes the ledger marker, atomically publishes the outbox file, and
        writes the published ledger event. This is the previously implicit
        PLANNED -> PUBLISHED transition made explicit.
        """
        append_event(self.paths.ledger, {
            "schema_version": 1,
            "event": "request_planned",
            "run_id": request["run_id"],
            "request_id": request["request_id"],
            "project": request["project"],
            "cycle_id": request["cycle_id"],
            "active_unit": request["active_unit"],
            "observed_phase": request["observed_phase"],
            "intended_phase": request["intended_phase"],
            "attempt": request["attempt"],
            "action": Action.RUN_PHASE.value,
            "at": now,
        })
        path = _outbox_publish(self.paths.outbox, request)
        append_event(self.paths.ledger, {
            "schema_version": 1,
            "event": "request_published",
            "run_id": request["run_id"],
            "request_id": request["request_id"],
            "project": request["project"],
            "observed_phase": request["observed_phase"],
            "at": now,
        })
        return path
