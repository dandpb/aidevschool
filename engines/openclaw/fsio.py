"""Guarded filesystem helpers: atomic writes and YAML reads with clear errors."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from engines.openclaw.errors import OpenclawError, StateCorruptionError
from learner.substrate.fsio import atomic_write_text as _atomic_write_text


def atomic_write_text(path: Path, text: str) -> None:
    """Atomic write; map OSError to OpenclawError for engine callers."""
    try:
        _atomic_write_text(path, text)
    except OSError as exc:
        raise OpenclawError(f"Failed to write {path}: {exc}") from exc


def read_yaml_mapping(path: Path, what: str = "YAML file") -> dict[str, Any]:
    """Read ``path`` as a YAML mapping, raising :class:`StateCorruptionError`
    with the file path and a recovery hint on any failure."""
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
