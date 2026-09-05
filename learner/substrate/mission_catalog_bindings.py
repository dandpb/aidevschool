from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from learner.substrate.mission_catalog_voxel import (
    MissionCatalogError,
    _mapping,
    _nonempty_string,
    validate_project_voxel_binding,
    validate_runtime,
)


SUPPORTED_TRACKS = frozenset({"ai-pratica", "dev"})
SUPPORTED_EVIDENCE_SCHEMAS = {
    "literacy-evidence": frozenset({1}),
    "teaching-game-evidence": frozenset({1}),
}
SUPPORTED_FALLBACKS = frozenset({"dom", "canvas2d"})
LESSON_JOURNEY_TRACKS = {"ia_pratica": "ai-pratica", "dev": "dev"}


@dataclass(frozen=True, slots=True)
class BindingSources:
    lessons: dict[str, dict[str, Any]]
    projects: dict[str, Any]
    voxel_games: dict[str, dict[str, Any]]
    literacy_content_version: str


def validate_tracks(raw: Any, literacy_content_version: str) -> dict[str, dict[str, str]]:
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


def normalize_bindings(
    raw_bindings: list[Any],
    sources: BindingSources,
) -> tuple[list[tuple[str | None, dict[str, Any]]], dict[str, str]]:
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
        if project_id not in sources.projects:
            raise MissionCatalogError(f"{label} references unknown curriculum project {project_id!r}")
        unit_id = _nonempty_string(curriculum.get("unitId"), f"{label}.curriculum.unitId")
        runtime, voxel_game = validate_runtime(
            binding.get("runtime"), f"{label}.runtime", sources.voxel_games
        )
        fallback = _validate_fallback(binding.get("fallback"), f"{label}.fallback")

        if curriculum_kind == "ai-literacy-lesson":
            if runtime["contentVersion"] != sources.literacy_content_version:
                raise MissionCatalogError(
                    f"{label}.runtime.contentVersion must match the canonical AI-literacy catalog"
                    f" ({sources.literacy_content_version!r}) — the hosted literacyDojo engine"
                    " serves exactly that version"
                )
            lesson_id = _nonempty_string(
                curriculum.get("lessonId"), f"{label}.curriculum.lessonId"
            )
            lesson_record = sources.lessons.get(lesson_id)
            if lesson_record is None:
                raise MissionCatalogError(
                    f"{label} references unknown curriculum lesson {lesson_id!r}"
                )
            journey_track = LESSON_JOURNEY_TRACKS.get(lesson_record.get("module_journey"))
            if (
                journey_track is None
                or track_id != journey_track
                or runtime["engineId"] != "literacyDojo"
            ):
                raise MissionCatalogError(
                    f"{label} AI-literacy missions must use the track declared by their"
                    f" canonical module journey ({lesson_record.get('module_journey')!r})"
                    " and the literacyDojo engine"
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
                raise MissionCatalogError(f"canonical lesson {lesson_id!r} has an invalid version")
            evidence = _validate_evidence(
                binding.get("evidence"),
                f"{label}.evidence",
                lesson_file.get("evidence"),
            )
            if evidence["schema"] != "literacy-evidence":
                raise MissionCatalogError(f"{label}.evidence must use literacy-evidence")
            canonical_prerequisites = lesson_entry.get("prerequisites")
            if canonical_prerequisites != declared_prerequisites:
                raise MissionCatalogError(
                    f"{label}.prerequisites must match canonical lesson prerequisites"
                )
            title = _nonempty_string(lesson_entry.get("title"), f"lesson {lesson_id}.title")
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
                sources.projects,
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
    return records, lesson_to_mission
