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
        "modules": [
            {"id": "mod-01", "title": "IA sem mistério", "journey": "ia_pratica"},
            {"id": "mod-05", "title": "Dev: contexto e decisão", "journey": "dev"},
        ],
        "lessons": [
            {
                "id": "l01",
                "moduleId": "mod-01",
                "title": "First conversation",
                "objective": "Treat an answer as a draft.",
                "estimatedMinutes": 3,
                "prerequisites": [],
                "status": "ready",
            },
            {
                "id": "l02",
                "moduleId": "mod-01",
                "title": "Truth needs verification",
                "objective": "Recognize an unsupported claim.",
                "estimatedMinutes": 4,
                "prerequisites": [],
                "status": "ready",
            },
            {
                "id": "l03",
                "moduleId": "mod-01",
                "title": "Know the limits",
                "objective": "Distinguish suitable tasks.",
                "estimatedMinutes": 4,
                "prerequisites": ["l02"],
                "status": "ready",
            },
            {
                "id": "l15",
                "moduleId": "mod-05",
                "title": "When to use AI",
                "objective": "Decide with technical criteria when generative AI helps.",
                "estimatedMinutes": 4,
                "prerequisites": [],
                "status": "ready",
            },
            {
                "id": "l16",
                "moduleId": "mod-05",
                "title": "First code with an AI assistant",
                "objective": "Request code with technical context and engineering criteria.",
                "estimatedMinutes": 5,
                "prerequisites": ["l15"],
                "status": "ready",
            },
            {
                "id": "l17",
                "moduleId": "mod-05",
                "title": "Integrate an AI API",
                "objective": "Connect an AI API endpoint and handle errors.",
                "estimatedMinutes": 5,
                "prerequisites": ["l16"],
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
    track_id: str = "ai-pratica",
) -> dict[str, Any]:
    return {
        "missionId": lesson_id,
        "chapterOrder": chapter_order,
        "prerequisites": prerequisites or [],
        "trackId": track_id,
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
        self.lesson_versions: dict[str, int] = {
            "l01": 1,
            "l02": 3,
            "l03": 1,
            "l15": 1,
            "l16": 1,
            "l17": 1,
        }
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
                _binding("l15", 4, [], "dev"),
                _binding("l16", 5, ["l15"], "dev"),
                _binding("l17", 6, ["l16"], "dev"),
                _dev_binding(
                    "game-06-pipeline-plant",
                    "06_file_upload_pipeline",
                    "U6-file-upload",
                    7,
                    ["game-05-relay-station"],
                    5206,
                ),
                _dev_binding(
                    "game-07-checkpoint-city",
                    "07_rest_api_auth",
                    "U7-rest-api-auth",
                    8,
                    ["game-06-pipeline-plant"],
                    5207,
                ),
                _dev_binding(
                    "game-08-timeline-tower",
                    "08_event_driven_order_system",
                    "U8-event-driven",
                    9,
                    ["game-07-checkpoint-city"],
                    5208,
                ),
                _dev_binding(
                    "game-09-docking-bay",
                    "09_plugin_system",
                    "U9-plugin-system",
                    10,
                    ["game-08-timeline-tower"],
                    5209,
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
                    {
                        "id": "game-06-pipeline-plant",
                        "name": "PIPELINE PLANT",
                        "developmentPort": 5206,
                    },
                    {
                        "id": "game-07-checkpoint-city",
                        "name": "CHECKPOINT CITY",
                        "developmentPort": 5207,
                    },
                    {
                        "id": "game-08-timeline-tower",
                        "name": "TIMELINE TOWER",
                        "developmentPort": 5208,
                    },
                    {
                        "id": "game-09-docking-bay",
                        "name": "DOCKING BAY",
                        "developmentPort": 5209,
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
                "moduleId": "mod-01",
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
        module_by_lesson = {
            lesson["id"]: lesson.get("moduleId", "mod-01")
            for lesson in self.catalog["lessons"]
        }
        for lesson_id, version in self.lesson_versions.items():
            module_dir = literacy / "modules" / module_by_lesson.get(lesson_id, "mod-01")
            module_dir.mkdir(parents=True, exist_ok=True)
            (module_dir / f"{lesson_id}.yaml").write_text(
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
