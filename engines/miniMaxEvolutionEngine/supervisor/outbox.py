"""Strict, atomic supervised request publication and resolution."""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from .plans import PHASE_PLANS

SCHEMA_VERSION = 1
SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
MAX_DETAIL_LENGTH = 2000
REQUEST_FIELDS = {
    "schema_version", "request_id", "run_id", "created_at", "cycle_id", "project",
    "active_unit", "phase", "observed_phase", "intended_phase", "command",
    "producer_role", "verifier_role", "producer_context_id", "verifier_context_id",
    "fresh_verifier", "retry_limit", "attempt",
}
RESOLUTION_FIELDS = {
    "schema_version", "request_id", "result", "resolved_at", "summary", "reason",
    "canonical_phase",
}


class OutboxError(RuntimeError):
    pass


def valid_id(value: Any) -> bool:
    return type(value) is str and SAFE_ID.fullmatch(value) is not None and value not in {".", ".."}


def validate_request(request: dict[str, Any]) -> None:
    if set(request) != REQUEST_FIELDS or request.get("schema_version") != SCHEMA_VERSION:
        raise OutboxError("request does not match schema version 1")
    for key in ("request_id", "run_id", "producer_context_id", "verifier_context_id"):
        if not valid_id(request.get(key)):
            raise OutboxError(f"unsafe {key}")
    plan = PHASE_PLANS.get(request.get("observed_phase"))
    bound = (plan.name, plan.command, plan.producer_role, plan.verifier_role,
             plan.observed_phase.value, plan.next_phase.value, plan.retry_limit) if plan else None
    actual = tuple(request.get(k) for k in ("phase", "command", "producer_role", "verifier_role",
                                             "observed_phase", "intended_phase", "retry_limit"))
    if bound != actual:
        raise OutboxError("request is not bound to exactly one immutable phase plan")
    if any(type(request.get(k)) is not str or not request[k] for k in
           ("created_at", "cycle_id", "project", "active_unit")):
        raise OutboxError("request identities must be non-empty strings")
    if type(request.get("attempt")) is not int or request["attempt"] < 1:
        raise OutboxError("attempt must be a positive integer")
    if request.get("fresh_verifier") is not True or request["producer_context_id"] == request["verifier_context_id"]:
        raise OutboxError("verifier context must be fresh")


def validate_resolution(value: dict[str, Any]) -> None:
    if not set(value) <= RESOLUTION_FIELDS or value.get("schema_version") != SCHEMA_VERSION:
        raise OutboxError("resolution does not match schema version 1")
    if set(value) < {"schema_version", "request_id", "result", "resolved_at", "canonical_phase"}:
        raise OutboxError("resolution is missing required identifiers")
    if not valid_id(value.get("request_id")) or value.get("result") not in {"completed", "failed", "blocked", "reconciled"}:
        raise OutboxError("invalid resolution")
    if any(k in value and type(value[k]) is not str for k in ("resolved_at", "canonical_phase", "summary", "reason")):
        raise OutboxError("resolution text fields must be strings")
    if any(len(value[k]) > MAX_DETAIL_LENGTH for k in ("summary", "reason") if k in value):
        raise OutboxError("resolution detail is too long")


def publish_json_no_replace(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()
    fd, temporary = tempfile.mkstemp(prefix=".supervisor-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            fd = -1
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(temporary, path)
        except FileExistsError as exc:
            raise OutboxError(f"refusing to replace existing file: {path}") from exc
        os.unlink(temporary)
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try: os.fsync(directory_fd)
        finally: os.close(directory_fd)
    finally:
        if fd >= 0: os.close(fd)
        try: os.unlink(temporary)
        except FileNotFoundError: pass


def publish(directory: Path, request: dict[str, Any]) -> Path:
    validate_request(request)
    path = directory / f"{request['request_id']}.json"
    publish_json_no_replace(path, request)
    return path


def resolve(directory: Path, request_id: str, resolution: dict[str, Any]) -> Path:
    value = {"schema_version": SCHEMA_VERSION, "request_id": request_id, **resolution}
    validate_resolution(value)
    path = directory / f"{request_id}.json"
    if path.exists():
        existing = read_resolution(path)
        if existing == value:
            return path
        raise OutboxError("conflicting resolution receipt")
    publish_json_no_replace(path, value)
    return path


def read_request(path: Path) -> dict[str, Any]:
    value = _read(path, "request")
    validate_request(value)
    return value


def read_resolution(path: Path) -> dict[str, Any]:
    value = _read(path, "resolution")
    validate_resolution(value)
    return value


def _read(path: Path, kind: str) -> dict[str, Any]:
    try: value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc: raise OutboxError(f"cannot read {kind} {path}: {exc}") from exc
    if not isinstance(value, dict): raise OutboxError(f"{kind} is not an object: {path}")
    return value
