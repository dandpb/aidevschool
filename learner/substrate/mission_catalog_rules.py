from __future__ import annotations

from typing import Any

from learner.substrate.mission_catalog_voxel import MissionCatalogError


TRACK_ORDER = ("ai-pratica", "dev")
MIN_MISSIONS_PER_TRACK = 1


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


def finalize_missions(
    records: list[tuple[str | None, dict[str, Any]]],
    lessons: dict[str, dict[str, Any]],
    lesson_to_mission: dict[str, str],
    tracks: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
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

    missions.sort(
        key=lambda mission: (TRACK_ORDER.index(mission["trackId"]), mission["chapterOrder"])
    )
    for track_id in TRACK_ORDER:
        track_missions = [mission for mission in missions if mission["trackId"] == track_id]
        mission_count = len(track_missions)
        if mission_count < MIN_MISSIONS_PER_TRACK:
            raise MissionCatalogError(
                f"track {track_id!r} must declare at least "
                f"{MIN_MISSIONS_PER_TRACK} launchable mission(s)"
            )
        orders = [mission["chapterOrder"] for mission in track_missions]
        if orders != list(range(1, mission_count + 1)):
            raise MissionCatalogError(
                f"track {track_id!r} chapterOrder values must be a contiguous "
                f"run 1..{mission_count} with no gaps or duplicates"
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
    return missions
