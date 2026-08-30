from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from learner.substrate.mission_catalog import load_mission_catalog
from learner.substrate.tests.mission_catalog_fixture import MissionCatalogFixture
from learner.substrate.ts_render import render_mission_catalog_ts


class TestMissionCatalogReleaseOrder(unittest.TestCase):
    def test_typescript_output_is_deterministic_and_has_no_authority_api(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        first = render_mission_catalog_ts(snapshot)
        second = render_mission_catalog_ts(snapshot)

        self.assertEqual(first, second)
        self.assertIn('id: "l02"', first)
        self.assertIn("verifierRequired: true", first)
        self.assertIn("DO NOT EDIT", first)
        for forbidden in (
            "markMastered",
            "masteryAuthority",
            "saveCanonical",
            "setState",
        ):
            self.assertNotIn(forbidden, first)

    def test_published_tracks_are_stably_ordered_without_content_copies(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        self.assertEqual(
            [mission["id"] for mission in snapshot["missions"]],
            [
                "l01",
                "l02",
                "l03",
                "game-02-warehouse",
                "game-03-wormhole",
                "game-05-relay-station",
                "l15",
                "l16",
                "l17",
            ],
        )
        self.assertEqual(
            {
                track["id"]: track["recommendedEntryMissionId"]
                for track in snapshot["tracks"]
            },
            {"ai-pratica": "l02", "dev": "game-02-warehouse"},
        )
        for mission in snapshot["missions"]:
            self.assertNotIn("activities", mission)
            self.assertNotIn("lessonContent", mission)
