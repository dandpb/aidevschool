"""Canonical UTC ISO-8601 timestamp helper.

Single source of truth for "now as ISO string in UTC" across the Python
ecosystem. Prior to this module, three call sites defined their own one-liner:

- ``learner.gate.core.utc_now_iso`` (public library API; second-precision, trailing Z)
- ``engines.minimaxDojo.core.state_machine._now_iso`` (private; full microsecond precision)
- ``engines.miniMaxEvolutionEngine.supervisor.__main__._now`` (private; full precision)
- ``curriculum._shared.evidence.record_verdict`` (inline ``datetime.now(timezone.utc).isoformat()``)

The drift was cosmetic (precision and the trailing ``Z``) but the duplication
meant three places had to be updated whenever the contract changed (e.g. for
fixture-based deterministic timestamps). This helper pins the format to
``%Y-%m-%dT%H:%M:%S`` + ``.ffffff`` microseconds when the wall clock is used,
ending in ``+00:00`` (Python's default). Callers that need the trailing ``Z``
or second precision should format on the result; the canonical format here
is what ``datetime.isoformat()`` returns, so the value round-trips through
``datetime.fromisoformat``.

The packaged SKILL bundle under ``engines/aiDevschoolMvp/aidevschool/scripts``
deliberately keeps its own copy because it ships as a standalone artifact
that must run without the surrounding repo on ``sys.path``; that copy is the
intentional exception, not drift.

Audit ref: ``docs/TECH_DEBT_AUDIT_2026-07-08.md`` item 20.
"""

from __future__ import annotations

from datetime import datetime, timezone


def utc_now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string (canonical helper).

    Uses ``datetime.now(timezone.utc).isoformat()`` so the output round-trips
    through :func:`datetime.fromisoformat` without normalization. The
    microsecond component is included when non-zero (Python's default).

    The fixture-clock seam (``learner.gate.core.set_clock``) is intentionally
    NOT honoured here: this helper is a wall-clock producer. Tests that need
    a deterministic timestamp should call :func:`datetime.now(timezone.utc)`
    directly or inject their own clock.
    """
    return datetime.now(timezone.utc).isoformat()


__all__ = ["utc_now_iso"]
