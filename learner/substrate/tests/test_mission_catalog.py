from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from typing import Any, Callable

import yaml

from learner.substrate.mission_catalog import MissionCatalogError, load_mission_catalog
from learner.substrate.ts_render import render_mission_catalog_ts


def _project_catalog() -> str:
    return """# Curriculum

## Level 0

### 00. AI in Practice

| Field | Value |
|-------|-------|
| **Slug** | `00_ai_in_practice` |
| **Status** | scaffolded |
| **Concepts** | AI literacy |
| **Key question** | Can the learner verify an AI answer? |
| **Learning goal** | Verify before use. |
| **Directory** | `00_ai_in_practice/` |
| **Dependencies** | None |

### 01. Rate Limiter

| Field | Value |
|-------|-------|
| **Slug** | `01_rate_limiter` |
| **Status** | implemented |
| **Concepts** | Concurrency |
| **Key question** | How are requests limited? |
| **Learning goal** | Bound concurrent requests. |
| **Directory** | `01_rate_limiter/` |
| **Dependencies** | None |

### 02. Key-Value Store

| Field | Value |
|-------|-------|
| **Slug** | `02_key_value_store` |
| **Status** | implemented |
| **Concepts** | Hash maps and TTL |
| **Key question** | Where does a key live? |
| **Learning goal** | Predict hash-map CRUD and TTL behavior. |
| **Directory** | `02_key_value_store/` |
| **Dependencies** | Project 01 |

### 03. URL Shortener

| Field | Value |
|-------|-------|
| **Slug** | `03_url_shortener` |
| **Status** | scaffolded |
| **Concepts** | Short codes |
| **Key question** | How are collisions resolved? |
| **Learning goal** | Predict short-code generation and collision handling. |
| **Directory** | `03_url_shortener/` |
| **Dependencies** | Project 02 |

### 04. Concurrent Task Queue

| Field | Value |
|-------|-------|
| **Slug** | `04_concurrent_task_queue` |
| **Status** | scaffolded |
| **Concepts** | Worker pools |
| **Key question** | How is work scheduled? |
| **Learning goal** | Coordinate bounded work. |
| **Directory** | `04_concurrent_task_queue/` |
| **Dependencies** | Project 03 |

### 05. WebSocket Chat

| Field | Value |
|-------|-------|
| **Slug** | `05_websocket_chat` |
| **Status** | scaffolded |
| **Concepts** | Persistent connections |
| **Key question** | How does fan-out reach subscribers? |
| **Learning goal** | Predict connection, fan-out, and heartbeat behavior. |
| **Directory** | `05_websocket_chat/` |
| **Dependencies** | Project 03 |
"""


def _catalog() -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "contentVersion": "test.1",
        "track": {"id": "ai-literacy"},
        "lessons": [
            {
                "id": "l01",
                "title": "First conversation",
                "objective": "Treat an answer as a draft.",
                "estimatedMinutes": 3,
                "prerequisites": [],
                "status": "ready",
            },
            {
                "id": "l02",
                "title": "Truth needs verification",
                "objective": "Recognize an unsupported claim.",
                "estimatedMinutes": 4,
                "prerequisites": [],
                "status": "ready",
            },
            {
                "id": "l03",
                "title": "Know the limits",
                "objective": "Distinguish suitable tasks.",
                "estimatedMinutes": 4,
                "prerequisites": ["l02"],
                "status": "ready",
            },
        ],
    }


def _lesson(lesson_id: str, version: int) -> dict[str, Any]:
    return {
        "id": lesson_id,
        "version": version,
        "evidence": {"verifierRequired": True},
    }


def _binding(lesson_id: str) -> dict[str, Any]:
    chapter_order = {"l01": 1, "l02": 2, "l03": 3}[lesson_id]
    prerequisites = ["l02"] if lesson_id == "l03" else []
    return {
        "missionId": lesson_id,
        "chapterOrder": chapter_order,
        "prerequisites": prerequisites,
        "trackId": "ai-pratica",
        "curriculum": {
            "kind": "ai-literacy-lesson",
            "lessonId": lesson_id,
            "projectId": "00_ai_in_practice",
            "unitId": f"ai-literacy:{lesson_id}",
        },
        "runtime": {
            "engineId": "literacyDojo",
            "entrypoint": "http://127.0.0.1:5178/?hosted=1",
            "environmentKey": "VITE_LITERACYDOJO_URL",
            "protocolVersion": "1.0",
            "contentVersion": "test.1",
        },
        "evidence": {
            "schema": "literacy-evidence",
            "version": 1,
            "verifierRequired": True,
        },
        "fallback": {"kind": "dom", "summary": "Semantic lesson controls."},
    }


def _dev_binding(
    mission_id: str = "game-02-warehouse",
    project_id: str = "02_key_value_store",
    unit_id: str = "U2-key-value-store",
    chapter_order: int = 1,
    prerequisites: list[str] | None = None,
    port: int = 5202,
) -> dict[str, Any]:
    return {
        "missionId": mission_id,
        "version": 1,
        "chapterOrder": chapter_order,
        "prerequisites": prerequisites or [],
        "trackId": "dev",
        "curriculum": {
            "kind": "project-voxel-game",
            "projectId": project_id,
            "unitId": unit_id,
        },
        "estimatedMinutes": 12,
        "runtime": {
            "engineId": "voxelDojo",
            "gameId": mission_id,
            "entrypoint": f"http://127.0.0.1:{port}/?hosted=1",
            "environmentKey": f"VITE_{mission_id.removeprefix('game-').replace('-', '_').upper()}_URL",
            "protocolVersion": "1.0",
            "contentVersion": f"{mission_id}@0.1.0",
        },
        "evidence": {
            "schema": "teaching-game-evidence",
            "version": 1,
            "verifierRequired": True,
        },
        "fallback": {"kind": "dom", "summary": f"Semantic controls for {mission_id}."},
    }


class MissionCatalogFixture:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.catalog: dict[str, Any] = _catalog()
        self.bindings: dict[str, Any] = {
            "schemaVersion": 1,
            "tracks": [
                {
                    "trackId": "ai-pratica",
                    "contentVersion": "test.1",
                    "recommendedEntryMissionId": "l02",
                },
                {
                    "trackId": "dev",
                    "contentVersion": "test.1",
                    "recommendedEntryMissionId": "game-02-warehouse",
                },
            ],
            "bindings": [
                _binding("l01"),
                _binding("l02"),
                _binding("l03"),
                _dev_binding(),
                _dev_binding(
                    "game-03-wormhole",
                    "03_url_shortener",
                    "U3-url-shortener",
                    2,
                    ["game-02-warehouse"],
                    5203,
                ),
                _dev_binding(
                    "game-05-relay-station",
                    "05_websocket_chat",
                    "U5-websocket-chat",
                    3,
                    ["game-03-wormhole"],
                    5205,
                ),
            ],
        }
        (root / "curriculum" / "ai-literacy" / "modules" / "mod-01").mkdir(parents=True)
        (root / "engines" / "codexdojo-os-prototype" / "config").mkdir(parents=True)
        (root / "engines" / "voxelDojo").mkdir(parents=True)
        (root / "curriculum" / "catalog.md").write_text(_project_catalog(), encoding="utf-8")
        (root / "engines" / "voxelDojo" / "catalog.json").write_text(
            json.dumps(
                [
                    {"id": "game-02-warehouse", "name": "WAREHOUSE", "developmentPort": 5202},
                    {"id": "game-03-wormhole", "name": "WORMHOLE", "developmentPort": 5203},
                    {"id": "game-05-relay-station", "name": "RELAY STATION", "developmentPort": 5205},
                ]
            ),
            encoding="utf-8",
        )
        self.write()

    def write(self) -> None:
        literacy = self.root / "curriculum" / "ai-literacy"
        (literacy / "catalog.yaml").write_text(
            yaml.safe_dump(self.catalog, sort_keys=False), encoding="utf-8"
        )
        for lesson_id, version in (("l01", 1), ("l02", 3), ("l03", 1)):
            (literacy / "modules" / "mod-01" / f"{lesson_id}.yaml").write_text(
                yaml.safe_dump(_lesson(lesson_id, version), sort_keys=False), encoding="utf-8"
            )
        (self.root / "engines" / "codexdojo-os-prototype" / "config" / "mission-bindings.yaml").write_text(
            yaml.safe_dump(self.bindings, sort_keys=False), encoding="utf-8"
        )


class TestMissionCatalog(unittest.TestCase):
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

    def test_preserves_prerequisites_as_mission_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        mission = next(item for item in snapshot["missions"] if item["id"] == "l03")
        self.assertEqual(mission["prerequisites"], ["l02"])

    def test_joins_project_and_voxel_catalog_for_dev_mission(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        mission = next(item for item in snapshot["missions"] if item["id"] == "game-02-warehouse")
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
                lambda binding: binding["runtime"].update({"gameId": "game-99-unknown"}),
            ),
            (
                "voxel game number must match",
                lambda binding: binding["curriculum"].update({"projectId": "01_rate_limiter"}),
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
            fixture.write()
            catalog_path = fixture.root / "curriculum" / "catalog.md"
            catalog_path.write_text(
                catalog_path.read_text(encoding="utf-8").replace(
                    "| **Status** | implemented |\n| **Concepts** | Hash maps and TTL |",
                    "| **Status** | planned |\n| **Concepts** | Hash maps and TTL |",
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(MissionCatalogError, "non-ready curriculum project"):
                load_mission_catalog(fixture.root)

    def test_rejects_dev_unit_identity_from_another_project(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            binding = fixture.bindings["bindings"][3]
            binding["curriculum"]["unitId"] = "U3-url-shortener"
            fixture.write()

            with self.assertRaisesRegex(MissionCatalogError, "preserve project 2 identity"):
                load_mission_catalog(fixture.root)

    def test_rejects_unknown_non_ready_duplicate_and_unbound_prerequisites(self) -> None:
        cases: list[tuple[str, Callable[[MissionCatalogFixture], None]]] = [
            (
                "unknown curriculum lesson",
                lambda fixture: fixture.bindings["bindings"][0]["curriculum"].update(
                    {"lessonId": "l99"}
                ),
            ),
            (
                "non-ready curriculum lesson",
                lambda fixture: fixture.catalog["lessons"][0].update({"status": "planned"}),
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
            with self.assertRaisesRegex(MissionCatalogError, "fallback must be a mapping"):
                load_mission_catalog(fixture.root)

        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"][0]["runtime"]["protocolVersion"] = "2.0"
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "unsupported"):
                load_mission_catalog(fixture.root)

    def test_typescript_output_is_deterministic_and_has_no_authority_api(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        first = render_mission_catalog_ts(snapshot)
        second = render_mission_catalog_ts(snapshot)

        self.assertEqual(first, second)
        self.assertIn('id: "l02"', first)
        self.assertIn('verifierRequired: true', first)
        self.assertIn("DO NOT EDIT", first)
        for forbidden in ("markMastered", "masteryAuthority", "saveCanonical", "setState"):
            self.assertNotIn(forbidden, first)

    def test_first_release_has_six_stably_ordered_missions_without_content_copies(self) -> None:
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
            ],
        )
        self.assertEqual(
            {track["id"]: track["recommendedEntryMissionId"] for track in snapshot["tracks"]},
            {"ai-pratica": "l02", "dev": "game-02-warehouse"},
        )
        self.assertEqual(
            {track_id: sum(1 for mission in snapshot["missions"] if mission["trackId"] == track_id)
             for track_id in ("ai-pratica", "dev")},
            {"ai-pratica": 3, "dev": 3},
        )
        for mission in snapshot["missions"]:
            self.assertIn(mission["fallback"]["kind"], {"dom", "canvas2d"})
            self.assertNotIn("activities", mission)
            self.assertNotIn("lessonContent", mission)
            self.assertNotEqual(mission["runtime"]["contentVersion"], "unknown")

    def test_rejects_prerequisite_cycles_and_incomplete_track_counts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"][0]["prerequisites"] = ["l03"]
            fixture.catalog["lessons"][0]["prerequisites"] = ["l03"]
            fixture.bindings["bindings"][2]["prerequisites"] = ["l01"]
            fixture.catalog["lessons"][2]["prerequisites"] = ["l01"]
            lesson_path = fixture.root / "curriculum" / "ai-literacy" / "modules" / "mod-01" / "l01.yaml"
            lesson = yaml.safe_load(lesson_path.read_text(encoding="utf-8"))
            lesson["prerequisites"] = ["l03"]
            fixture.write()
            lesson_path.write_text(yaml.safe_dump(lesson, sort_keys=False), encoding="utf-8")
            with self.assertRaisesRegex(MissionCatalogError, "prerequisite cycle"):
                load_mission_catalog(fixture.root)

        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"].pop()
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "exactly 3 launchable missions"):
                load_mission_catalog(fixture.root)


if __name__ == "__main__":
    unittest.main()
