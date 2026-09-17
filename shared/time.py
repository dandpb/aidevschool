"""Canonical UTC ISO-8601 timestamp helper.

Single source of truth for "now as ISO string in UTC" across the Python
ecosystem, moved from ``curriculum/_shared/time.py`` to the neutral ``shared/``
home (2026-09-13) so engines stop importing curriculum for a timestamp.

The packaged SKILL bundle under ``engines/aiDevschoolMvp/aidevschool/scripts``
deliberately keeps its own copy because it ships as a standalone artifact
that must run without the surrounding repo on ``sys.path``; that copy is the
intentional exception, not drift.

This helper pins the format to ``datetime.now(timezone.utc).isoformat()`` so
the value round-trips through ``datetime.fromisoformat``. Callers that need
the trailing ``Z`` or second precision should format on the result.

Audit ref: ``docs/TECH_DEBT_AUDIT_2026-07-08.md`` item 20.
"""

from __future__ import annotations

from datetime import datetime, timezone


def utc_now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string (canonical helper).

    The fixture-clock seam (``learner.gate.core.set_clock``) is intentionally
    NOT honoured here: this helper is a wall-clock producer. Tests that need
    a deterministic timestamp should call :func:`datetime.now(timezone.utc)`
    directly or inject their own clock.
    """
    return datetime.now(timezone.utc).isoformat()


__all__ = ["utc_now_iso"]
