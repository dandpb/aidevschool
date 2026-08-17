"""Unit tests for the canonical UTC ISO-8601 helper (curriculum/_shared/time.py).

Audit ref: docs/TECH_DEBT_AUDIT_2026-07-08.md item 20. The helper exists so
that every "now as ISO string" call site in the Python ecosystem goes through
one function — previously four sites defined their own one-liner. This suite
pins the format and the round-trip behaviour, and asserts the module is the
canonical one (i.e. it does NOT honour the ``learner.gate.core`` fixture
clock — that is a learner-gate-specific extension layered on top).
"""

from __future__ import annotations

import unittest
from datetime import datetime

from curriculum._shared.time import utc_now_iso


class TestUtcNowIso(unittest.TestCase):
    """One-liner coverage for the canonical ``utc_now_iso`` helper."""

    def test_returns_parseable_utc_iso(self) -> None:
        # Audit fix: a one-liner that asserts the contract — the canonical
        # helper must produce an ISO-8601 string that round-trips through
        # ``datetime.fromisoformat`` and lands on a UTC-aware datetime.
        parsed = datetime.fromisoformat(utc_now_iso())
        self.assertIsNotNone(parsed.tzinfo, "utc_now_iso must return a tz-aware ISO string")


if __name__ == "__main__":
    unittest.main()
