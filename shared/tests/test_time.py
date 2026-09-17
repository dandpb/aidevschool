"""One-liner coverage for the canonical ``utc_now_iso`` helper (moved 2026-09-13
from ``curriculum/_shared/tests/test_time.py`` to the shared home)."""

from __future__ import annotations

import unittest
from datetime import datetime

from shared.time import utc_now_iso


class TestUtcNowIso(unittest.TestCase):
    def test_returns_parseable_utc_iso(self) -> None:
        # The canonical helper must round-trip through
        # ``datetime.fromisoformat`` and land on a UTC-aware datetime.
        parsed = datetime.fromisoformat(utc_now_iso())
        self.assertIsNotNone(parsed.tzinfo, "utc_now_iso must return a tz-aware ISO string")


if __name__ == "__main__":
    unittest.main()
