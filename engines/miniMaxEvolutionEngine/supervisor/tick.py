"""One-shot supervised outbox tick."""

from __future__ import annotations

import os
from collections.abc import Callable
from datetime import datetime

from .lease import LeaseHeldError, acquire
from .ledger import append_event
from .lifecycle import RequestIds, SupervisorLifecycle, decide
from .models import Action, Decision, RuntimeSnapshot, SupervisorPaths
from .reconcile import reconcile, record_operational_blocker, runtime_state
from .state import InvalidStateError, load_canonical


def _invalid(reason: str) -> Decision:
    return Decision(Action.INVALID_STATE, reason)


def _clock_timestamp(clock: Callable[[], datetime | str]) -> str:
    value = clock()
    if isinstance(value, datetime):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("supervisor clock must return a timezone-aware datetime")
        return value.isoformat()
    if type(value) is str:
        return value
    raise ValueError("supervisor clock must return a timezone-aware datetime")


def tick(
    paths: SupervisorPaths,
    *,
    clock: Callable[[], datetime | str],
    id_provider: Callable[[], str],
    process_id: int | None = None,
    before_publish: Callable[[], None] | None = None,
    lease_duration: int = 300,
) -> Decision:
    try:
        paths.validate()
    except ValueError as exc:
        return _invalid(str(exc))
    owner = id_provider()
    try:
        now = _clock_timestamp(clock)
    except ValueError as exc:
        return _invalid(str(exc))
    try:
        lease = acquire(paths.lease, owner, now, process_id if process_id is not None else os.getpid(), lease_duration)
    except LeaseHeldError as exc:
        return Decision(Action.ALREADY_RUNNING, str(exc))
    except ValueError as exc:
        return _invalid(str(exc))
    try:
        try:
            pipeline, learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
            reconciliation = reconcile(paths, pipeline, now)
        except (InvalidStateError, ValueError, RuntimeError) as exc:
            return _invalid(str(exc))
        if reconciliation.status == "invalid":
            return _invalid(reconciliation.reason)
        if reconciliation.status == "pending":
            return Decision(
                Action.ALREADY_RUNNING, reconciliation.reason, pipeline.project, pipeline.phase
            )
        if reconciliation.status in {"advanced", "resolved"}:
            return Decision(
                Action.RECONCILED,
                reconciliation.reason, pipeline.project, pipeline.phase,
            )

        failures, blocker = runtime_state(
            paths,
            pipeline.cycle_id,
            pipeline.project,
            pipeline.phase.value,
        )
        decision = decide(
            pipeline,
            learner,
            RuntimeSnapshot(failed_attempts=failures, operational_blocker=blocker),
        )
        if decision.action is not Action.RUN_PHASE:
            if decision.action is Action.BLOCKED and blocker is None and decision.plan is not None:
                record_operational_blocker(
                    paths,
                    pipeline.cycle_id,
                    pipeline.project,
                    pipeline.phase.value,
                    decision.reason,
                    now,
                )
                return decision
            if decision.action is Action.BLOCKED and blocker is not None:
                return decision
            append_event(paths.ledger, {
                "schema_version": 1, "event": "decision_recorded", "run_id": owner,
                "project": pipeline.project, "observed_phase": pipeline.phase.value,
                "active_unit": learner.unit_id, "action": decision.action.value, "at": now,
            })
            return decision

        plan = decision.plan
        assert plan is not None
        lifecycle = SupervisorLifecycle(paths)
        request = lifecycle.build_request(
            plan,
            pipeline=pipeline,
            learner=learner,
            run_id=owner,
            now=now,
            ids=RequestIds(
                request_id=id_provider(),
                producer_context_id=id_provider(),
                verifier_context_id=id_provider(),
            ),
            attempt=failures + 1,
        )
        if before_publish:
            before_publish()
        current_pipeline, current_learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
        if current_pipeline != pipeline or current_learner != learner:
            return _invalid("canonical state changed before request publication")
        lifecycle.publish(request, now)
        return decision
    finally:
        lease.release()
