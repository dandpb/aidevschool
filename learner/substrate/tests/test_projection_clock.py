"""Tests for the pinned projection clock."""

from __future__ import annotations

import unittest
from datetime import date

from learner.substrate.projection_clock import projection_today


class TestProjectionClock(unittest.TestCase):
    def test_projection_today_is_iso_date(self):
        today = projection_today()
        self.assertIsInstance(today, date)

    def test_projection_today_matches_committed_clock(self):
        self.assertEqual(projection_today(), date(2026, 8, 21))


if __name__ == "__main__":
    unittest.main()
