from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlparse


SUPPORTED_ENGINES = frozenset({"literacyDojo", "voxelDojo"})
SUPPORTED_PROTOCOL_VERSIONS = frozenset({"1.0"})
_ENVIRONMENT_KEY = re.compile(r"^VITE_[A-Z0-9_]+$")
_RUNTIME_CONTENT_VERSION = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._@-]*$")


class MissionCatalogError(ValueError):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(f"invalid OS mission catalog: {detail}")


def _mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise MissionCatalogError(f"{label} must be a mapping")
    return value


def _nonempty_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise MissionCatalogError(f"{label} must be a non-empty string")
    return value.strip()


def load_voxel_catalog(path: Path) -> dict[str, dict[str, Any]]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise MissionCatalogError(f"voxel catalog not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise MissionCatalogError(f"voxel catalog is not valid JSON: {exc}") from exc
    if not isinstance(loaded, list):
        raise MissionCatalogError("voxel catalog must be a list")
    games: dict[str, dict[str, Any]] = {}
    for index, raw_game in enumerate(loaded):
        game = _mapping(raw_game, f"voxel catalog[{index}]")
        game_id = _nonempty_string(game.get("id"), f"voxel catalog[{index}].id")
        if game_id in games:
            raise MissionCatalogError(f"duplicate voxel game id {game_id!r}")
        name = _nonempty_string(game.get("name"), f"voxel catalog[{index}].name")
        port = game.get("developmentPort")
        if not isinstance(port, int) or isinstance(port, bool) or not 1 <= port <= 65535:
            raise MissionCatalogError(
                f"voxel catalog[{index}].developmentPort must be a valid port"
            )
        games[game_id] = {"id": game_id, "name": name, "developmentPort": port}
    return games


def validate_runtime(
    raw: Any,
    label: str,
    voxel_games: dict[str, dict[str, Any]],
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    runtime = _mapping(raw, label)
    engine_id = _nonempty_string(runtime.get("engineId"), f"{label}.engineId")
    if engine_id not in SUPPORTED_ENGINES:
        raise MissionCatalogError(f"{label}.engineId {engine_id!r} is unsupported")
    protocol_version = _nonempty_string(runtime.get("protocolVersion"), f"{label}.protocolVersion")
    if protocol_version not in SUPPORTED_PROTOCOL_VERSIONS:
        raise MissionCatalogError(f"{label}.protocolVersion {protocol_version!r} is unsupported")
    entrypoint = _nonempty_string(runtime.get("entrypoint"), f"{label}.entrypoint")
    parsed = urlparse(entrypoint)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise MissionCatalogError(f"{label}.entrypoint must be an absolute HTTP(S) URL")
    environment_key = _nonempty_string(runtime.get("environmentKey"), f"{label}.environmentKey")
    if _ENVIRONMENT_KEY.fullmatch(environment_key) is None:
        raise MissionCatalogError(f"{label}.environmentKey must be a VITE_* identifier")
    content_version = _nonempty_string(runtime.get("contentVersion"), f"{label}.contentVersion")
    if _RUNTIME_CONTENT_VERSION.fullmatch(content_version) is None:
        raise MissionCatalogError(f"{label}.contentVersion must be a stable version identifier")
    runtime_record = {
        "engineId": engine_id,
        "entrypoint": entrypoint,
        "environmentKey": environment_key,
        "protocolVersion": protocol_version,
        "contentVersion": content_version,
    }
    if engine_id != "voxelDojo":
        return runtime_record, None
    game_id = _nonempty_string(runtime.get("gameId"), f"{label}.gameId")
    game = voxel_games.get(game_id)
    if game is None:
        raise MissionCatalogError(f"{label} references unknown voxel game {game_id!r}")
    if parsed.port != game["developmentPort"]:
        raise MissionCatalogError(
            f"{label}.entrypoint port must match voxel game {game_id!r}"
        )
    return runtime_record, game


def validate_project_voxel_binding(
    binding: dict[str, Any],
    label: str,
    mission_id: str,
    track_id: str,
    project_id: str,
    unit_id: str,
    runtime: dict[str, Any],
    voxel_game: dict[str, Any] | None,
    projects: dict[str, Any],
    validate_evidence: Callable[[Any, str], dict[str, Any]],
) -> dict[str, Any]:
    if track_id != "dev" or runtime["engineId"] != "voxelDojo" or voxel_game is None:
        raise MissionCatalogError(
            f"{label} project voxel missions must use the dev track and voxelDojo"
        )
    if mission_id != voxel_game["id"]:
        raise MissionCatalogError(
            f"{label}.missionId must preserve voxel game id {voxel_game['id']!r}"
        )
    project = projects[project_id]
    normalized_status = project.status.lower().lstrip("✅ ")
    if not (normalized_status.startswith("implemented") or normalized_status.startswith("partially implemented") or normalized_status == "scaffolded"):
        raise MissionCatalogError(
            f"{label} references non-ready curriculum project {project_id!r}"
        )
    game_number = re.match(r"^game-(\d{2})-", mission_id)
    if game_number is None or int(game_number.group(1)) != project.number:
        raise MissionCatalogError(
            f"{label} voxel game number must match curriculum project {project_id!r}"
        )
    if not unit_id.startswith(f"U{project.number}-"):
        raise MissionCatalogError(
            f"{label}.curriculum.unitId must preserve project {project.number} identity"
        )
    version = binding.get("version")
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise MissionCatalogError(f"{label}.version must be a positive integer")
    estimated_minutes = binding.get("estimatedMinutes")
    evidence = validate_evidence(binding.get("evidence"), f"{label}.evidence")
    if evidence["schema"] != "teaching-game-evidence":
        raise MissionCatalogError(
            f"{label}.evidence must use teaching-game-evidence"
        )
    return {
        "lesson_id": None,
        "version": version,
        "estimated_minutes": estimated_minutes,
        "evidence": evidence,
        "title": f"{voxel_game['name']}: {project.title}",
        "objective": project.learning_goal,
    }
