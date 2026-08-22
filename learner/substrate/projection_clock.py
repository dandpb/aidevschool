"""Pinned projection clock for time-sensitive substrate outputs.

Generated views (review slices, dashboard snapshots, dojoToday) carry
relative scheduling strings such as ``overdue 4d``. Those strings must be
derived from a committed, stable clock — not ``date.today()`` — so on-disk
artifacts and CI stub detectors stay byte-stable across calendar days.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

import yaml

_CLOCK_PATH = Path(__file__).resolve().parent / "projection_clock.yaml"


def projection_today() -> date:
    """Return the pinned projection date for generated views."""
    loaded = yaml.safe_load(_CLOCK_PATH.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise ValueError(f"projection clock must be a mapping: {_CLOCK_PATH}")
    raw = loaded.get("as_of")
    if not isinstance(raw, str):
        raise ValueError(f"projection clock as_of must be an ISO date string: {_CLOCK_PATH}")
    return date.fromisoformat(raw)
