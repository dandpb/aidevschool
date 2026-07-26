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
"""


def _catalog() -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "contentVersion": "test.1",
        "track": {"id": "ai-literacy"},
        "lessons": [
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
    return {
        "missionId": lesson_id,
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
        },
        "evidence": {
            "schema": "literacy-evidence",
            "version": 1,
            "verifierRequired": True,
        },
        "fallback": {"kind": "dom", "summary": "Semantic lesson controls."},
    }


def _dev_binding() -> dict[str, Any]:
    return {
        "missionId": "game-02-warehouse",
        "version": 1,
        "trackId": "dev",
        "curriculum": {
            "kind": "project-voxel-game",
            "projectId": "02_key_value_store",
            "unitId": "U2-key-value-store",
        },
        "estimatedMinutes": 12,
        "runtime": {
            "engineId": "voxelDojo",
            "gameId": "game-02-warehouse",
            "entrypoint": "http://127.0.0.1:5202/?hosted=1",
            "environmentKey": "VITE_WAREHOUSE_URL",
            "protocolVersion": "1.0",
        },
        "evidence": {
            "schema": "teaching-game-evidence",
            "version": 1,
            "verifierRequired": True,
        },
        "fallback": {"kind": "dom", "summary": "Semantic warehouse controls."},
    }


class MissionCatalogFixture:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.catalog: dict[str, Any] = _catalog()
        self.bindings: dict[str, Any] = {
            "schemaVersion": 1,
            "bindings": [_binding("l02")],
        }
        (root / "curriculum" / "ai-literacy" / "modules" / "mod-01").mkdir(parents=True)
        (root / "engines" / "codexdojo-os-prototype" / "config").mkdir(parents=True)
        (root / "engines" / "voxelDojo").mkdir(parents=True)
        (root / "curriculum" / "catalog.md").write_text(_project_catalog(), encoding="utf-8")
        (root / "engines" / "voxelDojo" / "catalog.json").write_text(
            json.dumps(
                [{"id": "game-02-warehouse", "name": "WAREHOUSE", "developmentPort": 5202}]
            ),
            encoding="utf-8",
        )
        self.write()

    def write(self) -> None:
        literacy = self.root / "curriculum" / "ai-literacy"
        (literacy / "catalog.yaml").write_text(
            yaml.safe_dump(self.catalog, sort_keys=False), encoding="utf-8"
        )
        for lesson_id, version in (("l02", 3), ("l03", 1)):
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
        mission = snapshot["missions"][0]
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
            fixture.bindings["bindings"].append(_binding("l03"))
            fixture.write()

            snapshot = load_mission_catalog(fixture.root)

        self.assertEqual(snapshot["missions"][1]["prerequisites"], ["l02"])

    def test_joins_project_and_voxel_catalog_for_dev_mission(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"].append(_dev_binding())
            fixture.write()

            snapshot = load_mission_catalog(fixture.root)

        mission = snapshot["missions"][1]
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
                binding = _dev_binding()
                mutate(binding)
                fixture.bindings["bindings"].append(binding)
                fixture.write()
                with self.assertRaisesRegex(MissionCatalogError, expected):
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
                lambda fixture: fixture.bindings.update(
                    {"bindings": [_binding("l03")]}
                ),
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


if __name__ == "__main__":
    unittest.main()
