from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from learner.substrate.catalog import load_catalog
from learner.substrate.mission_catalog_voxel import (
    MissionCatalogError,
    _mapping,
    _nonempty_string,
    load_voxel_catalog,
    validate_runtime,
    validate_project_voxel_binding,
)


MISSION_SCHEMA_VERSION = 1
SUPPORTED_TRACKS = frozenset({"ai-pratica", "dev"})
TRACK_ORDER = ("ai-pratica", "dev")
FIRST_RELEASE_MISSIONS_PER_TRACK = 3
SUPPORTED_EVIDENCE_SCHEMAS = {
    "literacy-evidence": frozenset({1}),
    "teaching-game-evidence": frozenset({1}),
}
SUPPORTED_FALLBACKS = frozenset({"dom", "canvas2d"})


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


def _validate_tracks(raw: Any, literacy_content_version: str) -> dict[str, dict[str, str]]:
    if not isinstance(raw, list):
        raise MissionCatalogError("OS mission bindings tracks must be a list")
    tracks: dict[str, dict[str, str]] = {}
    for index, raw_track in enumerate(raw):
        label = f"tracks[{index}]"
        track = _mapping(raw_track, label)
        track_id = _nonempty_string(track.get("trackId"), f"{label}.trackId")
        if track_id not in SUPPORTED_TRACKS:
            raise MissionCatalogError(f"{label}.trackId {track_id!r} is unsupported")
        if track_id in tracks:
            raise MissionCatalogError(f"duplicate track id {track_id!r}")
        content_version = _nonempty_string(track.get("contentVersion"), f"{label}.contentVersion")
        if track_id == "ai-pratica" and content_version != literacy_content_version:
            raise MissionCatalogError(
                "ai-pratica contentVersion must match the canonical AI-literacy catalog"
            )
        tracks[track_id] = {
            "id": track_id,
            "contentVersion": content_version,
            "recommendedEntryMissionId": _nonempty_string(
                track.get("recommendedEntryMissionId"),
                f"{label}.recommendedEntryMissionId",
            ),
        }
    if set(tracks) != SUPPORTED_TRACKS:
        raise MissionCatalogError("OS mission bindings must declare both first-release tracks")
    return tracks


def _validate_prerequisite_graph(missions: list[dict[str, Any]]) -> None:
    by_id = {mission["id"]: mission for mission in missions}
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(mission_id: str) -> None:
        if mission_id in visiting:
            raise MissionCatalogError(f"mission prerequisite cycle includes {mission_id!r}")
        if mission_id in visited:
            return
        visiting.add(mission_id)
        mission = by_id[mission_id]
        for prerequisite in mission["prerequisites"]:
            target = by_id.get(prerequisite)
            if target is None:
                raise MissionCatalogError(
                    f"mission {mission_id!r} references unknown prerequisite {prerequisite!r}"
                )
            if target["trackId"] != mission["trackId"]:
                raise MissionCatalogError(
                    f"mission {mission_id!r} has a cross-track prerequisite {prerequisite!r}"
                )
            visit(prerequisite)
        visiting.remove(mission_id)
        visited.add(mission_id)

    for mission_id in by_id:
        visit(mission_id)


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
    literacy_content_version = _nonempty_string(
        literacy_catalog.get("contentVersion"), "AI-literacy contentVersion"
    )
    tracks = _validate_tracks(bindings_document.get("tracks"), literacy_content_version)
    projects = {
        project.slug: project
        for project in load_catalog(source_root / "curriculum" / "catalog.md")
    }
    voxel_games = load_voxel_catalog(source_root / "engines" / "voxelDojo" / "catalog.json")

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
        chapter_order = binding.get("chapterOrder")
        if not isinstance(chapter_order, int) or isinstance(chapter_order, bool) or chapter_order < 1:
            raise MissionCatalogError(f"{label}.chapterOrder must be a positive integer")
        declared_prerequisites = binding.get("prerequisites")
        if not isinstance(declared_prerequisites, list) or not all(
            isinstance(item, str) and item for item in declared_prerequisites
        ):
            raise MissionCatalogError(f"{label}.prerequisites must be a list of mission ids")

        curriculum = _mapping(binding.get("curriculum"), f"{label}.curriculum")
        curriculum_kind = curriculum.get("kind")
        project_id = _nonempty_string(curriculum.get("projectId"), f"{label}.curriculum.projectId")
        if project_id not in projects:
            raise MissionCatalogError(f"{label} references unknown curriculum project {project_id!r}")
        unit_id = _nonempty_string(curriculum.get("unitId"), f"{label}.curriculum.unitId")
        runtime, voxel_game = validate_runtime(
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
            if evidence["schema"] != "literacy-evidence":
                raise MissionCatalogError(
                    f"{label}.evidence must use literacy-evidence"
                )
            canonical_prerequisites = lesson_entry.get("prerequisites")
            if canonical_prerequisites != declared_prerequisites:
                raise MissionCatalogError(
                    f"{label}.prerequisites must match canonical lesson prerequisites"
                )
            title = _nonempty_string(
                lesson_entry.get("title"), f"lesson {lesson_id}.title"
            )
            objective = _nonempty_string(
                lesson_entry.get("objective"), f"lesson {lesson_id}.objective"
            )
            estimated_minutes = lesson_entry.get("estimatedMinutes")
        elif curriculum_kind == "project-voxel-game":
            voxel_record = validate_project_voxel_binding(
                binding,
                label,
                mission_id,
                track_id,
                project_id,
                unit_id,
                runtime,
                voxel_game,
                projects,
                _validate_evidence,
            )
            lesson_id = voxel_record["lesson_id"]
            version = voxel_record["version"]
            estimated_minutes = voxel_record["estimated_minutes"]
            evidence = voxel_record["evidence"]
            title = voxel_record["title"]
            objective = voxel_record["objective"]
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
                    "chapterOrder": chapter_order,
                    "prerequisites": list(declared_prerequisites),
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
            resolved = [lesson_to_mission[item] for item in prerequisites]
            if mission["prerequisites"] != resolved:
                raise MissionCatalogError(
                    f"mission {mission['id']!r} prerequisites do not preserve curriculum identity"
                )
        missions.append(mission)

    missions.sort(key=lambda mission: (TRACK_ORDER.index(mission["trackId"]), mission["chapterOrder"]))
    for track_id in TRACK_ORDER:
        track_missions = [mission for mission in missions if mission["trackId"] == track_id]
        if len(track_missions) != FIRST_RELEASE_MISSIONS_PER_TRACK:
            raise MissionCatalogError(
                f"track {track_id!r} must declare exactly {FIRST_RELEASE_MISSIONS_PER_TRACK} launchable missions"
            )
        orders = [mission["chapterOrder"] for mission in track_missions]
        if orders != list(range(1, FIRST_RELEASE_MISSIONS_PER_TRACK + 1)):
            raise MissionCatalogError(
                f"track {track_id!r} chapterOrder values must be 1..{FIRST_RELEASE_MISSIONS_PER_TRACK}"
            )
        recommended = tracks[track_id]["recommendedEntryMissionId"]
        recommended_mission = next(
            (mission for mission in track_missions if mission["id"] == recommended), None
        )
        if recommended_mission is None:
            raise MissionCatalogError(
                f"track {track_id!r} recommended entry {recommended!r} is not launchable"
            )
        if recommended_mission["prerequisites"]:
            raise MissionCatalogError(
                f"track {track_id!r} recommended entry must not require prerequisites"
            )
        for mission in track_missions:
            if mission["runtime"]["contentVersion"] == "unknown":
                raise MissionCatalogError(
                    f"mission {mission['id']!r} must declare a stable runtime content version"
                )
    _validate_prerequisite_graph(missions)

    return {
        "schemaVersion": MISSION_SCHEMA_VERSION,
        "contentVersion": literacy_content_version,
        "tracks": [tracks[track_id] for track_id in TRACK_ORDER],
        "missions": missions,
    }
