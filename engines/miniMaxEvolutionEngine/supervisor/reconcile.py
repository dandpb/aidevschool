"""Crash-safe reconciliation and interactive request resolution."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

from .ledger import append_event, read_ledger
from .models import LearnerState, PipelineState, Reconciliation, SupervisorPaths
from .outbox import OutboxError, read_request, read_resolution, resolve, valid_id
from .state import load_learner


def _resolved_ids(events: tuple[dict, ...]) -> set[str]:
    return {
        event["request_id"]
        for event in events
        if event["event"] in {"request_resolved", "request_reconciled"}
    }


def pending_request(paths: SupervisorPaths) -> dict | None:
    events = read_ledger(paths.ledger)
    resolved = _resolved_ids(events)
    candidates = [
        event
        for event in events
        if event["event"] == "request_planned" and event["request_id"] not in resolved
    ]
    if len(candidates) > 1:
        raise ValueError("multiple unresolved supervisor requests")
    return candidates[0] if candidates else None


def pending_request_document(paths: SupervisorPaths) -> dict | None:
    marker = pending_request(paths)
    if marker is None:
        return None
    path = paths.outbox / f"{marker['request_id']}.json"
    if not path.is_file():
        raise OutboxError("ledger request is missing without resolution receipt")
    return read_request(path)


def _append_resolution(
    paths: SupervisorPaths,
    request: dict,
    receipt: dict,
    now: str,
) -> None:
    events = read_ledger(paths.ledger)
    if request["request_id"] in _resolved_ids(events):
        return
    event = {
        "schema_version": 1,
        "event": "request_resolved",
        "request_id": request["request_id"],
        "cycle_id": request["cycle_id"],
        "project": request["project"],
        "observed_phase": request["observed_phase"],
        "result": receipt["result"],
        "at": now,
    }
    for field in ("summary", "reason"):
        if field in receipt:
            event[field] = receipt[field]
    append_event(paths.ledger, event)


def _retire(paths: SupervisorPaths, request_id: str) -> Path:
    pending = paths.outbox / f"{request_id}.json"
    retired = paths.retired / f"{request_id}.json"
    if retired.is_file():
        if pending.is_file() and read_request(pending) != read_request(retired):
            raise OutboxError("retired request conflicts with pending request")
        pending.unlink(missing_ok=True)
        return retired
    if not pending.is_file():
        raise OutboxError("request is neither pending nor retired")
    retired.parent.mkdir(parents=True, exist_ok=True)
    os.rename(pending, retired)
    for directory in {pending.parent, retired.parent}:
        directory_fd = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    return retired


def runtime_state(
    paths: SupervisorPaths,
    cycle_id: str,
    project: str,
    phase: str,
) -> tuple[int, str | None]:
    failures = 0
    blocker = None
    for event in read_ledger(paths.ledger):
        if (
            event.get("cycle_id") != cycle_id
            or event.get("project") != project
            or event.get("observed_phase") != phase
        ):
            continue
        if event["event"] == "operational_resumed":
            failures = 0
            blocker = None
        elif event["event"] == "request_resolved" and event.get("result") == "failed":
            failures += 1
        elif event["event"] == "request_resolved" and event.get("result") == "blocked":
            blocker = event.get("reason", "operator blocked request")
        elif event["event"] == "operational_blocked":
            blocker = event["reason"]
    return failures, blocker


def record_operational_blocker(
    paths: SupervisorPaths,
    cycle_id: str,
    project: str,
    phase: str,
    reason: str,
    now: str,
) -> None:
    _, current = runtime_state(paths, cycle_id, project, phase)
    if current == reason:
        return
    append_event(
        paths.ledger,
        {
            "schema_version": 1,
            "event": "operational_blocked",
            "cycle_id": cycle_id,
            "project": project,
            "observed_phase": phase,
            "reason": reason,
            "at": now,
        },
    )


def resume_operations(
    paths: SupervisorPaths,
    pipeline: PipelineState,
    run_id: str,
    now: str,
) -> None:
    append_event(
        paths.ledger,
        {
            "schema_version": 1,
            "event": "operational_resumed",
            "run_id": run_id,
            "cycle_id": pipeline.cycle_id,
            "project": pipeline.project,
            "observed_phase": pipeline.phase.value,
            "at": now,
        },
    )


def reconcile(paths: SupervisorPaths, pipeline: PipelineState, now: str) -> Reconciliation:
    marker = pending_request(paths)
    if marker is None:
        return Reconciliation("none")

    request_id = marker["request_id"]
    pending = paths.outbox / f"{request_id}.json"
    receipt_path = paths.resolutions / f"{request_id}.json"
    if receipt_path.is_file():
        receipt = read_resolution(receipt_path)
        retired = paths.retired / f"{request_id}.json"
        request = (
            read_request(pending)
            if pending.is_file()
            else read_request(retired)
            if retired.is_file()
            else marker
        )
        if pending.is_file():
            _retire(paths, request_id)
        _append_resolution(paths, request, receipt, now)
        return Reconciliation("resolved", request, "repaired resolution ledger state")

    retired = paths.retired / f"{request_id}.json"
    if not pending.is_file() and not retired.is_file():
        reason = "ledger request is missing without pending, retired, or resolution record"
        record_operational_blocker(
            paths,
            pipeline.cycle_id,
            pipeline.project,
            pipeline.phase.value,
            reason,
            now,
        )
        return Reconciliation("invalid", reason=reason)

    request = read_request(pending) if pending.is_file() else read_request(retired)
    if pipeline.project != request["project"] or pipeline.cycle_id != request["cycle_id"]:
        reason = "pending request canonical identity diverged"
        record_operational_blocker(
            paths,
            pipeline.cycle_id,
            pipeline.project,
            pipeline.phase.value,
            reason,
            now,
        )
        return Reconciliation("invalid", request, reason)
    if pipeline.phase.value == request["observed_phase"]:
        if retired.is_file():
            reason = (
                "request was retired before its resolution receipt was written; "
                "rerun complete, fail, or block for this request, then resume"
            )
            record_operational_blocker(
                paths,
                pipeline.cycle_id,
                pipeline.project,
                pipeline.phase.value,
                reason,
                now,
            )
            return Reconciliation("invalid", request, reason)
        return Reconciliation("pending", request, "canonical phase is unchanged")
    if pipeline.phase.value == request["intended_phase"]:
        events = read_ledger(paths.ledger)
        autonomous = any(event["event"] == "execution_started" and event.get("request_id") == request_id for event in events)
        pipeline_digest = hashlib.sha256(paths.pipeline.read_bytes()).hexdigest()
        learner_digest = hashlib.sha256(paths.learner.read_bytes()).hexdigest()
        learner = load_learner(paths.learner)
        authorized = any(
            event["event"] == "advancement_authorized"
            and event.get("request_id") == request_id
            and event.get("cycle_id") == request["cycle_id"]
            and event.get("project") == request["project"]
            and event.get("observed_phase") == request["observed_phase"]
            and event.get("intended_phase") == request["intended_phase"]
            and event.get("context_id") == request["verifier_context_id"]
            and event.get("resulting_pipeline_digest") == pipeline_digest
            and event.get("learner_digest") == learner_digest
            and learner.unit_id == request["active_unit"]
            and learner.project == request["project"]
            for event in events
        )
        if autonomous and not authorized:
            reason = "security blocker: autonomous canonical advancement has no matching advancement authorization"
            record_operational_blocker(paths, pipeline.cycle_id, pipeline.project, request["observed_phase"], reason, now)
            return Reconciliation("invalid", request, reason)
        receipt = {
            "result": "reconciled",
            "resolved_at": now,
            "canonical_phase": pipeline.phase.value,
        }
        if pending.is_file():
            _retire(paths, request_id)
        resolve(paths.resolutions, request_id, receipt)
        _append_resolution(paths, request, receipt, now)
        return Reconciliation("advanced", request, "canonical phase advanced after request")

    reason = "canonical phase diverged from request transition"
    record_operational_blocker(
        paths,
        pipeline.cycle_id,
        pipeline.project,
        pipeline.phase.value,
        reason,
        now,
    )
    return Reconciliation("invalid", request, reason)


def resolve_request(
    paths: SupervisorPaths,
    request_id: str,
    result: str,
    now: str,
    pipeline: PipelineState,
    learner: LearnerState,
    *,
    detail: str = "",
) -> Reconciliation:
    if not valid_id(request_id):
        raise OutboxError("unsafe request_id")
    pending = paths.outbox / f"{request_id}.json"
    retired = paths.retired / f"{request_id}.json"
    receipt_path = paths.resolutions / f"{request_id}.json"
    if receipt_path.is_file():
        receipt = read_resolution(receipt_path)
        if receipt["result"] != result:
            raise OutboxError("request already has a conflicting resolution")
        marker = pending_request(paths)
        if pending.is_file() or retired.is_file():
            request = read_request(pending) if pending.is_file() else read_request(retired)
            if pending.is_file():
                _retire(paths, request_id)
            _append_resolution(paths, request, receipt, now)
        elif marker is not None and marker["request_id"] == request_id:
            _append_resolution(paths, marker, receipt, now)
        return Reconciliation("resolved", reason="request was already resolved")
    if not pending.is_file() and not retired.is_file():
        raise OutboxError("matching pending request does not exist")

    request = read_request(pending) if pending.is_file() else read_request(retired)
    if (
        request["request_id"] != request_id
        or request["project"] != pipeline.project
        or request["cycle_id"] != pipeline.cycle_id
        or request["active_unit"] != learner.unit_id
    ):
        raise OutboxError("pending request does not match canonical identity")
    expected = request["intended_phase"] if result == "completed" else request["observed_phase"]
    if pipeline.phase.value != expected:
        raise OutboxError(f"canonical phase must equal {expected} for {result}")

    receipt = {
        "result": result,
        "resolved_at": now,
        "canonical_phase": pipeline.phase.value,
    }
    if result == "failed":
        receipt["summary"] = detail
    if result == "blocked":
        receipt["reason"] = detail
    if pending.is_file():
        _retire(paths, request_id)
    resolve(paths.resolutions, request_id, receipt)
    _append_resolution(paths, request, receipt, now)
    return Reconciliation("resolved", request, f"request {result}")


def abandon_unpublished_request(
    paths: SupervisorPaths,
    request_id: str,
    reason: str,
    now: str,
    pipeline: PipelineState,
    learner: LearnerState,
) -> Reconciliation:
    if not valid_id(request_id):
        raise OutboxError("unsafe request_id")
    marker = pending_request(paths)
    if marker is None or marker["request_id"] != request_id:
        raise OutboxError("matching unresolved request does not exist")
    if (paths.outbox / f"{request_id}.json").exists() or (paths.retired / f"{request_id}.json").exists():
        raise OutboxError("published request must be resolved with complete, fail, or block")
    if (paths.resolutions / f"{request_id}.json").exists():
        raise OutboxError("request already has a resolution receipt")
    if (
        marker["cycle_id"] != pipeline.cycle_id
        or marker["project"] != pipeline.project
        or marker["active_unit"] != learner.unit_id
        or marker["observed_phase"] != pipeline.phase.value
    ):
        raise OutboxError("unpublished request does not match canonical identity")
    receipt = {
        "result": "blocked",
        "resolved_at": now,
        "canonical_phase": pipeline.phase.value,
        "reason": reason,
    }
    resolve(paths.resolutions, request_id, receipt)
    _append_resolution(paths, marker, receipt, now)
    return Reconciliation("resolved", marker, "unpublished request abandoned")
