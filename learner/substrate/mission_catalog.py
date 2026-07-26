from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

from learner.substrate.catalog import load_catalog


MISSION_SCHEMA_VERSION = 1
SUPPORTED_TRACKS = frozenset({"ai-pratica", "dev"})
SUPPORTED_ENGINES = frozenset({"literacyDojo", "voxelDojo"})
SUPPORTED_PROTOCOL_VERSIONS = frozenset({"1.0"})
SUPPORTED_EVIDENCE_SCHEMAS = {
    "literacy-evidence": frozenset({1}),
    "teaching-game-evidence": frozenset({1}),
}
SUPPORTED_FALLBACKS = frozenset({"dom", "canvas2d"})
_ENVIRONMENT_KEY = re.compile(r"^VITE_[A-Z0-9_]+$")


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


def _load_yaml_mapping(path: Path, label: str) -> dict[str, Any]:
    try:
        loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise MissionCatalogError(f"{label} not found: {path}") from exc
    except yaml.YAMLError as exc:
        raise MissionCatalogError(f"{label} is not valid YAML: {exc}") from exc
    return _mapping(loaded, label)


def _load_lessons(ai_literacy_root: Path) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    catalog = _load_yaml_mapping(ai_literacy_root / "catalog.yaml", "AI-literacy catalog")
    entries = catalog.get("lessons")
    if not isinstance(entries, list):
        raise MissionCatalogError("AI-literacy catalog lessons must be a list")

    lesson_files: dict[str, dict[str, Any]] = {}
    for path in sorted((ai_literacy_root / "modules").rglob("*.yaml")):
        lesson = _load_yaml_mapping(path, f"lesson file {path}")
        lesson_id = _nonempty_string(lesson.get("id"), f"lesson file {path} id")
        if lesson_id in lesson_files:
            raise MissionCatalogError(f"duplicate lesson file id {lesson_id!r}")
        lesson_files[lesson_id] = lesson

    catalog_lessons: dict[str, dict[str, Any]] = {}
    for index, raw_entry in enumerate(entries):
        entry = _mapping(raw_entry, f"AI-literacy catalog lessons[{index}]")
        lesson_id = _nonempty_string(entry.get("id"), f"AI-literacy catalog lessons[{index}].id")
        if lesson_id in catalog_lessons:
            raise MissionCatalogError(f"duplicate curriculum lesson id {lesson_id!r}")
        catalog_lessons[lesson_id] = entry
    return catalog, {lesson_id: {"entry": entry, "file": lesson_files.get(lesson_id)} for lesson_id, entry in catalog_lessons.items()}


def _load_voxel_catalog(path: Path) -> dict[str, dict[str, Any]]:
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


def _validate_runtime(
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
    runtime_record = {
        "engineId": engine_id,
        "entrypoint": entrypoint,
        "environmentKey": environment_key,
        "protocolVersion": protocol_version,
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


def _validate_evidence(
    raw: Any,
    label: str,
    canonical_evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    evidence = _mapping(raw, label)
    schema = _nonempty_string(evidence.get("schema"), f"{label}.schema")
    version = evidence.get("version")
    if not isinstance(version, int) or isinstance(version, bool):
        raise MissionCatalogError(f"{label}.version must be an integer")
    if version not in SUPPORTED_EVIDENCE_SCHEMAS.get(schema, frozenset()):
        raise MissionCatalogError(f"{label} uses unsupported schema/version {schema!r}/{version!r}")
    if evidence.get("verifierRequired") is not True:
        raise MissionCatalogError(f"{label}.verifierRequired must be true")
    if canonical_evidence is not None:
        canonical = _mapping(canonical_evidence, "canonical lesson evidence")
        if canonical.get("verifierRequired") is not True:
            raise MissionCatalogError("canonical lesson evidence must require a verifier")
    return {"schema": schema, "version": version, "verifierRequired": True}


def _validate_fallback(raw: Any, label: str) -> dict[str, str]:
    fallback = _mapping(raw, label)
    kind = _nonempty_string(fallback.get("kind"), f"{label}.kind")
    if kind not in SUPPORTED_FALLBACKS:
        raise MissionCatalogError(f"{label}.kind {kind!r} is unsupported")
    summary = _nonempty_string(fallback.get("summary"), f"{label}.summary")
    return {"kind": kind, "summary": summary}


def load_mission_catalog(
    source_root: Path,
    bindings_path: Path | None = None,
) -> dict[str, Any]:
    bindings_path = bindings_path or (
        source_root / "engines" / "codexdojo-os-prototype" / "config" / "mission-bindings.yaml"
    )
    bindings_document = _load_yaml_mapping(bindings_path, "OS mission bindings")
    if bindings_document.get("schemaVersion") != MISSION_SCHEMA_VERSION:
        raise MissionCatalogError(
            f"OS mission bindings schemaVersion must be {MISSION_SCHEMA_VERSION}"
        )
    raw_bindings = bindings_document.get("bindings")
    if not isinstance(raw_bindings, list) or not raw_bindings:
        raise MissionCatalogError("OS mission bindings must contain a non-empty bindings list")

    literacy_catalog, lessons = _load_lessons(source_root / "curriculum" / "ai-literacy")
    projects = {
        project.slug: project
        for project in load_catalog(source_root / "curriculum" / "catalog.md")
    }
    voxel_games = _load_voxel_catalog(source_root / "engines" / "voxelDojo" / "catalog.json")

    records: list[tuple[str | None, dict[str, Any]]] = []
    mission_ids: set[str] = set()
    lesson_to_mission: dict[str, str] = {}
    for index, raw_binding in enumerate(raw_bindings):
        label = f"bindings[{index}]"
        binding = _mapping(raw_binding, label)
        mission_id = _nonempty_string(binding.get("missionId"), f"{label}.missionId")
        if mission_id in mission_ids:
            raise MissionCatalogError(f"duplicate mission id {mission_id!r}")
        mission_ids.add(mission_id)
        track_id = _nonempty_string(binding.get("trackId"), f"{label}.trackId")
        if track_id not in SUPPORTED_TRACKS:
            raise MissionCatalogError(f"{label}.trackId {track_id!r} is unsupported")

        curriculum = _mapping(binding.get("curriculum"), f"{label}.curriculum")
        curriculum_kind = curriculum.get("kind")
        project_id = _nonempty_string(curriculum.get("projectId"), f"{label}.curriculum.projectId")
        if project_id not in projects:
            raise MissionCatalogError(f"{label} references unknown curriculum project {project_id!r}")
        unit_id = _nonempty_string(curriculum.get("unitId"), f"{label}.curriculum.unitId")
        runtime, voxel_game = _validate_runtime(
            binding.get("runtime"), f"{label}.runtime", voxel_games
        )
        fallback = _validate_fallback(binding.get("fallback"), f"{label}.fallback")

        if curriculum_kind == "ai-literacy-lesson":
            if track_id != "ai-pratica" or runtime["engineId"] != "literacyDojo":
                raise MissionCatalogError(
                    f"{label} AI-literacy missions must use the ai-pratica track and literacyDojo"
                )
            lesson_id = _nonempty_string(
                curriculum.get("lessonId"), f"{label}.curriculum.lessonId"
            )
            lesson_record = lessons.get(lesson_id)
            if lesson_record is None:
                raise MissionCatalogError(
                    f"{label} references unknown curriculum lesson {lesson_id!r}"
                )
            lesson_entry = lesson_record["entry"]
            lesson_file = lesson_record["file"]
            if lesson_entry.get("status") != "ready" or lesson_file is None:
                raise MissionCatalogError(
                    f"{label} references non-ready curriculum lesson {lesson_id!r}"
                )
            if mission_id != lesson_id:
                raise MissionCatalogError(
                    f"{label}.missionId must preserve canonical lesson id {lesson_id!r}"
                )
            if lesson_id in lesson_to_mission:
                raise MissionCatalogError(
                    f"curriculum lesson {lesson_id!r} has multiple mission bindings"
                )
            lesson_to_mission[lesson_id] = mission_id
            if unit_id != f"ai-literacy:{lesson_id}":
                raise MissionCatalogError(
                    f"{label}.curriculum.unitId must be ai-literacy:{lesson_id}"
                )
            version = lesson_file.get("version")
            if not isinstance(version, int) or isinstance(version, bool) or version < 1:
                raise MissionCatalogError(
                    f"canonical lesson {lesson_id!r} has an invalid version"
                )
            evidence = _validate_evidence(
                binding.get("evidence"),
                f"{label}.evidence",
                lesson_file.get("evidence"),
            )
            title = _nonempty_string(
                lesson_entry.get("title"), f"lesson {lesson_id}.title"
            )
            objective = _nonempty_string(
                lesson_entry.get("objective"), f"lesson {lesson_id}.objective"
            )
            estimated_minutes = lesson_entry.get("estimatedMinutes")
        elif curriculum_kind == "project-voxel-game":
            lesson_id = None
            if track_id != "dev" or runtime["engineId"] != "voxelDojo" or voxel_game is None:
                raise MissionCatalogError(
                    f"{label} project voxel missions must use the dev track and voxelDojo"
                )
            if mission_id != voxel_game["id"]:
                raise MissionCatalogError(
                    f"{label}.missionId must preserve voxel game id {voxel_game['id']!r}"
                )
            project = projects[project_id]
            game_number = re.match(r"^game-(\d{2})-", mission_id)
            if game_number is None or int(game_number.group(1)) != project.number:
                raise MissionCatalogError(
                    f"{label} voxel game number must match curriculum project {project_id!r}"
                )
            version = binding.get("version")
            if not isinstance(version, int) or isinstance(version, bool) or version < 1:
                raise MissionCatalogError(f"{label}.version must be a positive integer")
            estimated_minutes = binding.get("estimatedMinutes")
            evidence = _validate_evidence(binding.get("evidence"), f"{label}.evidence")
            if evidence["schema"] != "teaching-game-evidence":
                raise MissionCatalogError(
                    f"{label}.evidence must use teaching-game-evidence"
                )
            title = f"{voxel_game['name']}: {project.title}"
            objective = project.learning_goal
        else:
            raise MissionCatalogError(f"{label}.curriculum.kind is unsupported")

        if (
            not isinstance(estimated_minutes, int)
            or isinstance(estimated_minutes, bool)
            or estimated_minutes < 1
        ):
            raise MissionCatalogError(f"{label}.estimatedMinutes must be a positive integer")
        records.append(
            (
                lesson_id,
                {
                    "id": mission_id,
                    "version": version,
                    "trackId": track_id,
                    "unitId": unit_id,
                    "projectId": project_id,
                    "title": title,
                    "objective": objective,
                    "estimatedMinutes": estimated_minutes,
                    "prerequisites": [],
                    "stages": ["understand", "respond", "apply"],
                    "runtime": runtime,
                    "evidence": evidence,
                    "fallback": fallback,
                },
            )
        )

    missions: list[dict[str, Any]] = []
    for lesson_id, mission in records:
        if lesson_id is not None:
            prerequisites = lessons[lesson_id]["entry"].get("prerequisites")
            if not isinstance(prerequisites, list) or not all(
                isinstance(item, str) for item in prerequisites
            ):
                raise MissionCatalogError(
                    f"canonical lesson {lesson_id!r} has invalid prerequisites"
                )
            missing = [item for item in prerequisites if item not in lesson_to_mission]
            if missing:
                raise MissionCatalogError(
                    f"mission {mission['id']!r} has unbound curriculum prerequisites {missing!r}"
                )
            mission["prerequisites"] = [lesson_to_mission[item] for item in prerequisites]
        missions.append(mission)

    return {
        "schemaVersion": MISSION_SCHEMA_VERSION,
        "contentVersion": _nonempty_string(
            literacy_catalog.get("contentVersion"), "AI-literacy contentVersion"
        ),
        "missions": missions,
    }
