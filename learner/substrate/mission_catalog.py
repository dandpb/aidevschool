from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from learner.substrate.catalog import load_catalog
from learner.substrate.mission_catalog_bindings import (
    BindingSources,
    normalize_bindings,
    validate_tracks,
)
from learner.substrate.mission_catalog_rules import TRACK_ORDER, finalize_missions
from learner.substrate.mission_catalog_voxel import (
    MissionCatalogError,
    _mapping,
    _nonempty_string,
    load_voxel_catalog,
)


MISSION_SCHEMA_VERSION = 1


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
    tracks = validate_tracks(bindings_document.get("tracks"), literacy_content_version)
    projects = {
        project.slug: project
        for project in load_catalog(source_root / "curriculum" / "catalog.md")
    }
    voxel_games = load_voxel_catalog(source_root / "engines" / "voxelDojo" / "catalog.json")

    records, lesson_to_mission = normalize_bindings(
        raw_bindings,
        BindingSources(lessons, projects, voxel_games, literacy_content_version),
    )
    missions = finalize_missions(records, lessons, lesson_to_mission, tracks)

    return {
        "schemaVersion": MISSION_SCHEMA_VERSION,
        "contentVersion": literacy_content_version,
        "tracks": [tracks[track_id] for track_id in TRACK_ORDER],
        "missions": missions,
    }
