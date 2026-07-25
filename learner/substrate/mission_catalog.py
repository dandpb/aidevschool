from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

from learner.substrate.catalog import load_catalog


MISSION_SCHEMA_VERSION = 1
SUPPORTED_TRACKS = frozenset({"ai-pratica", "dev"})
SUPPORTED_ENGINES = frozenset({"literacyDojo"})
SUPPORTED_PROTOCOL_VERSIONS = frozenset({"1.0"})
SUPPORTED_EVIDENCE_SCHEMAS = {"literacy-evidence": frozenset({1})}
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


def _validate_runtime(raw: Any, label: str) -> dict[str, Any]:
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
    return {
        "engineId": engine_id,
        "entrypoint": entrypoint,
        "environmentKey": environment_key,
        "protocolVersion": protocol_version,
    }


def _validate_evidence(raw: Any, lesson_file: dict[str, Any], label: str) -> dict[str, Any]:
    evidence = _mapping(raw, label)
    schema = _nonempty_string(evidence.get("schema"), f"{label}.schema")
    version = evidence.get("version")
    if not isinstance(version, int) or isinstance(version, bool):
        raise MissionCatalogError(f"{label}.version must be an integer")
    if version not in SUPPORTED_EVIDENCE_SCHEMAS.get(schema, frozenset()):
        raise MissionCatalogError(f"{label} uses unsupported schema/version {schema!r}/{version!r}")
    if evidence.get("verifierRequired") is not True:
        raise MissionCatalogError(f"{label}.verifierRequired must be true")
    canonical_evidence = _mapping(lesson_file.get("evidence"), "canonical lesson evidence")
    if canonical_evidence.get("verifierRequired") is not True:
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
    projects = {project.slug for project in load_catalog(source_root / "curriculum" / "catalog.md")}

    records: list[tuple[dict[str, Any], dict[str, Any]]] = []
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
        if curriculum.get("kind") != "ai-literacy-lesson":
            raise MissionCatalogError(f"{label}.curriculum.kind is unsupported")
        lesson_id = _nonempty_string(curriculum.get("lessonId"), f"{label}.curriculum.lessonId")
        lesson_record = lessons.get(lesson_id)
        if lesson_record is None:
            raise MissionCatalogError(f"{label} references unknown curriculum lesson {lesson_id!r}")
        lesson_entry = lesson_record["entry"]
        lesson_file = lesson_record["file"]
        if lesson_entry.get("status") != "ready" or lesson_file is None:
            raise MissionCatalogError(f"{label} references non-ready curriculum lesson {lesson_id!r}")
        if mission_id != lesson_id:
            raise MissionCatalogError(f"{label}.missionId must preserve canonical lesson id {lesson_id!r}")
        if lesson_id in lesson_to_mission:
            raise MissionCatalogError(f"curriculum lesson {lesson_id!r} has multiple mission bindings")
        lesson_to_mission[lesson_id] = mission_id

        project_id = _nonempty_string(curriculum.get("projectId"), f"{label}.curriculum.projectId")
        if project_id not in projects:
            raise MissionCatalogError(f"{label} references unknown curriculum project {project_id!r}")
        unit_id = _nonempty_string(curriculum.get("unitId"), f"{label}.curriculum.unitId")
        if unit_id != f"ai-literacy:{lesson_id}":
            raise MissionCatalogError(f"{label}.curriculum.unitId must be ai-literacy:{lesson_id}")

        version = lesson_file.get("version")
        if not isinstance(version, int) or isinstance(version, bool) or version < 1:
            raise MissionCatalogError(f"canonical lesson {lesson_id!r} has an invalid version")
        runtime = _validate_runtime(binding.get("runtime"), f"{label}.runtime")
        evidence = _validate_evidence(binding.get("evidence"), lesson_file, f"{label}.evidence")
        fallback = _validate_fallback(binding.get("fallback"), f"{label}.fallback")
        records.append(
            (
                binding,
                {
                    "id": mission_id,
                    "version": version,
                    "trackId": track_id,
                    "unitId": unit_id,
                    "projectId": project_id,
                    "title": _nonempty_string(lesson_entry.get("title"), f"lesson {lesson_id}.title"),
                    "objective": _nonempty_string(lesson_entry.get("objective"), f"lesson {lesson_id}.objective"),
                    "estimatedMinutes": lesson_entry.get("estimatedMinutes"),
                    "prerequisites": [],
                    "stages": ["understand", "respond", "apply"],
                    "runtime": runtime,
                    "evidence": evidence,
                    "fallback": fallback,
                },
            )
        )

    missions: list[dict[str, Any]] = []
    for binding, mission in records:
        lesson_id = mission["id"]
        prerequisites = lessons[lesson_id]["entry"].get("prerequisites")
        if not isinstance(prerequisites, list) or not all(isinstance(item, str) for item in prerequisites):
            raise MissionCatalogError(f"canonical lesson {lesson_id!r} has invalid prerequisites")
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
