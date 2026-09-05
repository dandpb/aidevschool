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

    def test_whiteboard_stamps_use_pinned_clock(self):
        """Whiteboard updated/atualizado must not read the wall clock.

        Otherwise ``python3 -m learner.substrate --check`` drifts on every
        calendar day after the last sync (AID-396).
        """
        from learner.substrate import load_canonical
        from learner.substrate.adapters.whiteboard import (
            derive_whiteboard_profile,
            derive_whiteboard_trail,
        )

        state = load_canonical()
        pinned = projection_today().isoformat()
        profile = derive_whiteboard_profile(state)
        trail = derive_whiteboard_trail(state)
        self.assertEqual(profile["updated"], pinned)
        self.assertEqual(trail["atualizado"], pinned)


if __name__ == "__main__":
    unittest.main()
