from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

from learner.substrate.tests.mission_catalog_project_catalog_fixture import (
    PROJECT_CATALOG,
)


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


def _binding(
    lesson_id: str,
    chapter_order: int,
    prerequisites: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "missionId": lesson_id,
        "chapterOrder": chapter_order,
        "prerequisites": prerequisites or [],
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
        self.lesson_versions: dict[str, int] = {"l01": 1, "l02": 3, "l03": 1}
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
                _binding("l01", 1),
                _binding("l02", 2),
                _binding("l03", 3, ["l02"]),
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
        (root / "curriculum" / "catalog.md").write_text(
            PROJECT_CATALOG, encoding="utf-8"
        )
        (root / "engines" / "voxelDojo" / "catalog.json").write_text(
            json.dumps(
                [
                    {
                        "id": "game-02-warehouse",
                        "name": "WAREHOUSE",
                        "developmentPort": 5202,
                    },
                    {
                        "id": "game-03-wormhole",
                        "name": "WORMHOLE",
                        "developmentPort": 5203,
                    },
                    {
                        "id": "game-05-relay-station",
                        "name": "RELAY STATION",
                        "developmentPort": 5205,
                    },
                ]
            ),
            encoding="utf-8",
        )
        self.write()

    def add_literacy_lesson(
        self,
        lesson_id: str,
        title: str,
        objective: str,
        estimated_minutes: int,
        prerequisites: list[str],
        version: int = 1,
    ) -> None:
        chapter_order = (
            max(
                binding["chapterOrder"]
                for binding in self.bindings["bindings"]
                if binding["trackId"] == "ai-pratica"
            )
            + 1
        )
        self.catalog["lessons"].append(
            {
                "id": lesson_id,
                "title": title,
                "objective": objective,
                "estimatedMinutes": estimated_minutes,
                "prerequisites": prerequisites,
                "status": "ready",
            }
        )
        self.lesson_versions[lesson_id] = version
        self.bindings["bindings"].insert(
            chapter_order - 1,
            _binding(lesson_id, chapter_order, prerequisites),
        )

    def write(self) -> None:
        literacy = self.root / "curriculum" / "ai-literacy"
        (literacy / "catalog.yaml").write_text(
            yaml.safe_dump(self.catalog, sort_keys=False), encoding="utf-8"
        )
        for lesson_id, version in self.lesson_versions.items():
            (literacy / "modules" / "mod-01" / f"{lesson_id}.yaml").write_text(
                yaml.safe_dump(_lesson(lesson_id, version), sort_keys=False),
                encoding="utf-8",
            )
        (
            self.root
            / "engines"
            / "codexdojo-os-prototype"
            / "config"
            / "mission-bindings.yaml"
        ).write_text(yaml.safe_dump(self.bindings, sort_keys=False), encoding="utf-8")
