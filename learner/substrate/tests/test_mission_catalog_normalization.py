from __future__ import annotations

import copy
import tempfile
import unittest
from pathlib import Path
from typing import Any, Callable

from learner.substrate.mission_catalog import MissionCatalogError, load_mission_catalog
from learner.substrate.tests.mission_catalog_fixture import MissionCatalogFixture


class TestMissionCatalogNormalization(unittest.TestCase):
    def test_joins_ready_curriculum_identity_with_runtime_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))

            snapshot = load_mission_catalog(fixture.root)

        self.assertEqual(snapshot["schemaVersion"], 1)
        self.assertEqual(snapshot["contentVersion"], "test.1")
        mission = next(item for item in snapshot["missions"] if item["id"] == "l02")
        self.assertEqual(mission["id"], "l02")
        self.assertEqual(mission["version"], 3)
        self.assertEqual(mission["unitId"], "ai-literacy:l02")
        self.assertEqual(mission["projectId"], "00_ai_in_practice")
        self.assertEqual(mission["runtime"]["engineId"], "literacyDojo")
        self.assertEqual(mission["fallback"]["kind"], "dom")
        self.assertEqual(mission["evidence"]["verifierRequired"], True)

    def test_joins_project_and_voxel_catalog_for_dev_mission(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        mission = next(
            item for item in snapshot["missions"] if item["id"] == "game-02-warehouse"
        )
        self.assertEqual(mission["id"], "game-02-warehouse")
        self.assertEqual(mission["trackId"], "dev")
        self.assertEqual(mission["projectId"], "02_key_value_store")
        self.assertEqual(mission["unitId"], "U2-key-value-store")
        self.assertEqual(mission["runtime"]["engineId"], "voxelDojo")
        self.assertEqual(mission["evidence"]["schema"], "teaching-game-evidence")
        self.assertEqual(mission["fallback"]["kind"], "dom")

    def test_rejects_unknown_voxel_game_and_mismatched_project_number(self) -> None:
        cases: list[tuple[str, Callable[[dict[str, Any]], None]]] = [
            (
                "unknown voxel game",
                lambda binding: binding["runtime"].update(
                    {"gameId": "game-99-unknown"}
                ),
            ),
            (
                "voxel game number must match",
                lambda binding: binding["curriculum"].update(
                    {"projectId": "01_rate_limiter"}
                ),
            ),
        ]
        for expected, mutate in cases:
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as tmp:
                fixture = MissionCatalogFixture(Path(tmp))
                binding = fixture.bindings["bindings"][3]
                mutate(binding)
                fixture.write()
                with self.assertRaisesRegex(MissionCatalogError, expected):
                    load_mission_catalog(fixture.root)

    def test_rejects_planned_dev_project(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            catalog_path = fixture.root / "curriculum" / "catalog.md"
            catalog_path.write_text(
                catalog_path.read_text(encoding="utf-8").replace(
                    "| **Status** | implemented |\n| **Concepts** | Hash maps and TTL |",
                    "| **Status** | planned |\n| **Concepts** | Hash maps and TTL |",
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                MissionCatalogError, "non-ready curriculum project"
            ):
                load_mission_catalog(fixture.root)

    def test_rejects_dev_unit_identity_from_another_project(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            binding = fixture.bindings["bindings"][3]
            binding["curriculum"]["unitId"] = "U3-url-shortener"
            fixture.write()

            with self.assertRaisesRegex(
                MissionCatalogError, "preserve project 2 identity"
            ):
                load_mission_catalog(fixture.root)

    def test_rejects_unknown_non_ready_duplicate_and_unbound_prerequisites(
        self,
    ) -> None:
        cases: list[tuple[str, Callable[[MissionCatalogFixture], None]]] = [
            (
                "unknown curriculum lesson",
                lambda fixture: fixture.bindings["bindings"][0]["curriculum"].update(
                    {"lessonId": "l99"}
                ),
            ),
            (
                "non-ready curriculum lesson",
                lambda fixture: fixture.catalog["lessons"][0].update(
                    {"status": "planned"}
                ),
            ),
            (
                "duplicate mission id",
                lambda fixture: fixture.bindings["bindings"].append(
                    copy.deepcopy(fixture.bindings["bindings"][0])
                ),
            ),
            (
                "unbound curriculum prerequisites",
                lambda fixture: fixture.bindings["bindings"].pop(1),
            ),
        ]
        for expected, mutate in cases:
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as tmp:
                fixture = MissionCatalogFixture(Path(tmp))
                mutate(fixture)
                fixture.write()
                with self.assertRaisesRegex(MissionCatalogError, expected):
                    load_mission_catalog(fixture.root)

    def test_rejects_missing_fallback_and_unsupported_versions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"][0].pop("fallback")
            fixture.write()
            with self.assertRaisesRegex(
                MissionCatalogError, "fallback must be a mapping"
            ):
                load_mission_catalog(fixture.root)

        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"][0]["runtime"]["protocolVersion"] = "2.0"
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "unsupported"):
                load_mission_catalog(fixture.root)
