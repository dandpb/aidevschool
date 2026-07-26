from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from learner.substrate.mission_catalog import MissionCatalogError, load_mission_catalog
from learner.substrate.tests.mission_catalog_fixture import MissionCatalogFixture


class TestMissionCatalogGraphRules(unittest.TestCase):
    def test_preserves_prerequisites_as_mission_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        mission = next(item for item in snapshot["missions"] if item["id"] == "l03")
        self.assertEqual(mission["prerequisites"], ["l02"])

    def test_rejects_prerequisite_cycles_and_incomplete_track_counts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"][0]["prerequisites"] = ["l03"]
            fixture.catalog["lessons"][0]["prerequisites"] = ["l03"]
            fixture.bindings["bindings"][2]["prerequisites"] = ["l01"]
            fixture.catalog["lessons"][2]["prerequisites"] = ["l01"]
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "prerequisite cycle"):
                load_mission_catalog(fixture.root)

        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"].pop()
            fixture.write()
            with self.assertRaisesRegex(
                MissionCatalogError, "exactly 3 launchable missions"
            ):
                load_mission_catalog(fixture.root)
