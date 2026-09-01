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
            fixture.bindings["bindings"][2]["chapterOrder"] = 5
            fixture.write()
            with self.assertRaisesRegex(
                MissionCatalogError, "contiguous run 1\\..* with no gaps"
            ):
                load_mission_catalog(fixture.root)

    def test_supports_tracks_longer_than_the_first_release_batch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_literacy_lesson(
                "l04",
                "Give a clear goal",
                "Turn a vague request into a verifiable goal.",
                3,
                ["l03"],
            )
            fixture.add_literacy_lesson(
                "l05",
                "Give useful context",
                "Fill structured context fields.",
                5,
                ["l04"],
            )
            fixture.write()
            snapshot = load_mission_catalog(fixture.root)

        self.assertEqual(
            [mission["id"] for mission in snapshot["missions"] if mission["trackId"] == "ai-pratica"],
            ["l01", "l02", "l03", "l04", "l05"],
        )
        self.assertEqual(
            [mission["chapterOrder"] for mission in snapshot["missions"] if mission["trackId"] == "ai-pratica"],
            [1, 2, 3, 4, 5],
        )
        l05 = next(item for item in snapshot["missions"] if item["id"] == "l05")
        self.assertEqual(l05["prerequisites"], ["l04"])

    def test_binds_dev_journey_lessons_to_the_dev_track(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        dev_lessons = [
            mission for mission in snapshot["missions"] if mission["id"].startswith("l1")
        ]
        self.assertEqual(
            [(mission["id"], mission["prerequisites"]) for mission in dev_lessons],
            [("l15", []), ("l16", ["l15"]), ("l17", ["l16"])],
        )
        self.assertTrue(all(mission["trackId"] == "dev" for mission in dev_lessons))

    def test_rejects_lesson_bound_against_its_module_journey_track(self) -> None:
        # l15 pertence ao módulo dev (mod-05): vinculá-la na trilha ai-pratica
        # viola a identidade canônica de journey.
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            l15_binding = next(
                binding
                for binding in fixture.bindings["bindings"]
                if binding["missionId"] == "l15"
            )
            l15_binding["trackId"] = "ai-pratica"
            l15_binding["chapterOrder"] = 4
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "canonical module journey"):
                load_mission_catalog(fixture.root)

        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            l01_binding = next(
                binding
                for binding in fixture.bindings["bindings"]
                if binding["missionId"] == "l01"
            )
            l01_binding["trackId"] = "dev"
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "canonical module journey"):
                load_mission_catalog(fixture.root)
