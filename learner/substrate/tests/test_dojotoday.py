from __future__ import annotations

import unittest
from datetime import date
from pathlib import Path
from typing import Any

from learner.substrate.adapters.dojotoday import (
    _build_track,
    _game_dir,
    _num_of,
    _self_check,
    derive_today_snapshot,
    render_today_ts,
)


class TestDojoTodayAdapter(unittest.TestCase):
    def test_num_of_extracts_prefix(self):
        self.assertEqual(_num_of("02_key_value_store"), "02")
        self.assertEqual(_num_of("18_stacks"), "18")
        self.assertIsNone(_num_of("no-underscore"))
        self.assertIsNone(_num_of(None))

    def test_game_dir_extracts_voxel_subdirectory(self):
        self.assertEqual(
            _game_dir("engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson", None),
            "engines/voxelDojo/game-02-warehouse",
        )

    def test_game_dir_extracts_pixel_root(self):
        self.assertEqual(
            _game_dir("engines/pixelDojo/.logs/last_run_evidence.json", None),
            "engines/pixelDojo",
        )

    def test_game_dir_returns_none_without_evidence(self):
        self.assertIsNone(_game_dir(None, "99_unknown"))

    def test_build_track_statuses_and_next(self):
        games = {
            "01": {"title": "RATE LIMITER", "gameDir": "engines/pixelDojo/pixel-quest", "port": None},
            "02": {"title": "WAREHOUSE", "gameDir": "engines/voxelDojo/game-02-warehouse", "port": 5202},
            "03": {"title": "WORMHOLE", "gameDir": "engines/voxelDojo/game-03-wormhole", "port": 5203},
        }
        units_log = [
            {"unit_id": "U0", "project": "01_rate_limiter", "concept": "GATEKEEPER", "mastered": True},
            {"unit_id": "U2", "project": "02_key_value_store", "concept": "KV WAREHOUSE", "mastered": False},
        ]
        active = {"project": "02_key_value_store", "title": "KV WAREHOUSE: hash-map-backed CRUD"}

        track, next_num = _build_track(units_log, active, games)
        by_num = {node["num"]: node for node in track}

        self.assertEqual(len(track), 18)
        self.assertEqual(by_num["01"]["status"], "mastered")
        self.assertEqual(by_num["01"]["title"], "GATEKEEPER")
        self.assertEqual(by_num["02"]["status"], "active")
        self.assertEqual(by_num["02"]["title"], active["title"])
        self.assertEqual(by_num["03"]["status"], "available")
        self.assertEqual(next_num, "02")

    def test_self_check_passes(self):
        self.assertEqual(_self_check(), 0)

    def test_render_today_ts_is_valid_typescript_literal(self):
        snapshot = {
            "asOf": "2026-07-25",
            "streak": {
                "current": 0,
                "longest": 1,
                "freezesEquipped": 0,
                "freezesMax": 2,
                "lastGateDate": "2026-07-05",
            },
            "curr": 0.0,
            "activeUnit": {
                "id": "U1",
                "title": "Unit",
                "project": "01_rate_limiter",
                "num": "01",
                "state": "presenting",
                "gameDir": "engines/pixelDojo/pixel-quest",
                "diagnosticFile": None,
            },
            "reviews": [],
            "masteredCount": 0,
            "totalUnits": 0,
            "nextProjectNum": "01",
            "track": [
                {
                    "num": "01",
                    "title": "RATE LIMITER",
                    "gameDir": "engines/pixelDojo/pixel-quest",
                    "port": None,
                    "status": "active",
                }
            ],
        }
        text = render_today_ts(snapshot)
        self.assertIn("export const today: TodaySnapshot =", text)
        self.assertIn('"asOf": "2026-07-25"', text)
        self.assertIn('"current": 0', text)
        self.assertTrue(text.endswith(" as TodaySnapshot;\n"))

    def test_derive_today_snapshot_uses_canonical_state(self):
        from learner.substrate import ROOT, load_canonical

        state = load_canonical()
        snapshot = derive_today_snapshot(ROOT, state, today=date(2026, 7, 25))

        self.assertEqual(snapshot["asOf"], "2026-07-25")
        self.assertIn("activeUnit", snapshot)
        self.assertIn("track", snapshot)
        self.assertEqual(len(snapshot["track"]), 18)
        self.assertEqual(snapshot["totalUnits"], len(state.get("units_log", [])))


if __name__ == "__main__":
    unittest.main()
