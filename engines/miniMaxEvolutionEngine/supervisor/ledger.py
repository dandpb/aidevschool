"""Strict append-only NDJSON operational ledger."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class LedgerError(RuntimeError):
    pass


EVENT_IDENTIFIERS = {
    "request_planned": (
        "run_id",
        "request_id",
        "project",
        "cycle_id",
        "active_unit",
        "observed_phase",
        "intended_phase",
        "attempt",
    ),
    "request_published": ("run_id", "request_id", "project"),
    "request_resolved": ("request_id", "cycle_id", "project", "result"),
    "request_reconciled": ("request_id", "cycle_id", "project", "result"),
    "operational_blocked": ("cycle_id", "project", "observed_phase", "reason"),
    "operational_resumed": ("run_id", "cycle_id", "project", "observed_phase"),
    "decision_recorded": ("run_id", "project", "action"),
    "execution_started": (
        "cycle_id", "request_id", "project", "active_unit", "observed_phase",
        "role", "context_id", "status", "started_at",
    ),
    "execution_finished": (
        "cycle_id", "request_id", "project", "active_unit", "observed_phase",
        "role", "context_id", "status", "finished_at", "charged_cost_usd",
    ),
    "budget_reserved": ("cycle_id", "request_id", "project", "observed_phase", "role", "context_id", "reserved_at", "amount_usd"),
    "budget_settled": ("cycle_id", "request_id", "project", "observed_phase", "role", "context_id", "settled_at", "reserved_usd", "charged_cost_usd"),
    "advancement_authorized": ("cycle_id", "request_id", "project", "observed_phase", "intended_phase", "context_id", "authorized_at", "pipeline_digest", "resulting_pipeline_digest", "learner_digest"),
}


def _validate(event: dict[str, Any]) -> None:
    name = event.get("event")
    if name not in EVENT_IDENTIFIERS:
        raise LedgerError(f"unknown ledger event: {name}")
    if event.get("schema_version") != 1:
        raise LedgerError("ledger event requires schema_version 1")
    for key in EVENT_IDENTIFIERS[name]:
        value = event.get(key)
        if key == "attempt":
            if type(value) is not int or value < 1:
                raise LedgerError(f"{name} requires a positive attempt")
            continue
        if type(value) is not str or not value:
            raise LedgerError(f"{name} requires {key}")


def read_ledger(path: Path) -> tuple[dict[str, Any], ...]:
    if not path.exists():
        return ()
    events: list[dict[str, Any]] = []
    try:
        with path.open(encoding="utf-8") as handle:
            for number, line in enumerate(handle, 1):
                if not line.endswith("\n"):
                    raise LedgerError(f"ledger line {number} is not terminated")
                value = json.loads(line)
                if not isinstance(value, dict):
                    raise LedgerError(f"invalid ledger event at line {number}")
                _validate(value)
                events.append(value)
    except (OSError, json.JSONDecodeError) as exc:
        raise LedgerError(f"cannot read ledger {path}: {exc}") from exc
    return tuple(events)


def append_event(path: Path, event: dict[str, Any]) -> None:
    _validate(event)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(event, sort_keys=True, separators=(",", ":")) + "\n"
    try:
        fd = os.open(path, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "a", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
    except OSError as exc:
        raise LedgerError(f"cannot append ledger {path}: {exc}") from exc
