"""Guarded filesystem helpers: atomic writes and JSON reads with clear errors.

All OpenClaw state files (scheduler state, pipeline status, Hermes events)
go through these helpers so that (a) readers never observe a half-written
file and (b) unreadable files fail with an actionable message instead of a
bare traceback.
"""

from __future__ import annotations

import contextlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import yaml

from engines.openclaw.errors import OpenclawError, StateCorruptionError


def atomic_write_text(path: Path, text: str) -> None:
    """Write ``text`` to ``path`` via temp-file-then-``os.replace``.

    The rename is atomic on POSIX, so a crash mid-write leaves the previous
    file intact instead of a truncated one. Parent directories are created
    as needed.
    """
    tmp_name = ""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(
            dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
        )
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(tmp_name, path)
    except OSError as exc:
        if tmp_name:
            with contextlib.suppress(OSError):
                os.unlink(tmp_name)
        raise OpenclawError(f"Failed to write {path}: {exc}") from exc


def write_json_atomic(path: Path, data: Any) -> None:
    """Serialize ``data`` as pretty JSON and write it atomically to ``path``."""
    atomic_write_text(path, json.dumps(data, indent=2))


def read_json_object(path: Path, what: str = "JSON file") -> dict[str, Any]:
    """Read ``path`` as a JSON object, raising :class:`StateCorruptionError`
    with the file path and a recovery hint on any failure."""
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise StateCorruptionError(f"Cannot read {what} at {path}: {exc}") from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise StateCorruptionError(
            f"{what} at {path} is not valid JSON ({exc}). "
            "Inspect or delete the file and re-run."
        ) from exc
    if not isinstance(data, dict):
        raise StateCorruptionError(
            f"{what} at {path} must be a JSON object, got {type(data).__name__}. "
            "Inspect or delete the file and re-run."
        )
    return data


def read_yaml_mapping(path: Path, what: str = "YAML file") -> dict[str, Any]:
    """Read ``path`` as a YAML mapping, raising :class:`StateCorruptionError`
    with the file path and a recovery hint on any failure. Mirrors
    :func:`read_json_object` so callers get identical error semantics across
    JSON and YAML state files."""
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise StateCorruptionError(f"Cannot read {what} at {path}: {exc}") from exc
    try:
        data = yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        raise StateCorruptionError(
            f"{what} at {path} is not valid YAML ({exc}). "
            "Inspect or delete the file and re-run."
        ) from exc
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise StateCorruptionError(
            f"{what} at {path} must be a YAML mapping, got {type(data).__name__}. "
            "Inspect or delete the file and re-run."
        )
    return data
