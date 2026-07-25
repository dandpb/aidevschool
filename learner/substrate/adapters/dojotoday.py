"""Adapter that derives the dojoToday read model from the canonical learner state.

dojoToday is a "lição de hoje" surface for programmers: it consumes scheduling
 truth (next reviews, streak, CURR) from the shared substrate and renders it
without deciding mastery or writing back to the canonical state.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

from learner.substrate.dashboard_snapshot import build_snapshot
from learner.substrate.scheduling import derive_next_reviews


def _game_dir(evidence_file: str | None, project: str | None) -> str | None:
    """Extract the voxel/pixel game directory from a unit's evidence_file path."""
    if not evidence_file:
        return None
    parts = Path(evidence_file).parts
    for marker in ("voxelDojo", "pixelDojo"):
        if marker in parts:
            idx = parts.index(marker)
            end = idx + 2 if marker == "voxelDojo" and idx + 1 < len(parts) else idx + 1
            return "/".join(parts[:end])
    return project


def _num_of(project: str | None) -> str | None:
    """Project number from a slug such as ``02_key_value_store`` → ``02``."""
    return project.split("_")[0] if project and "_" in project else None


def _build_track(
    units_log: list[dict[str, Any]], active: dict[str, Any], games: dict[str, dict[str, Any]]
) -> tuple[list[dict[str, Any]], str | None]:
    """Build the 18-project track as playable atoms with learner status.

    Status: ``mastered`` if any mastered unit matches the number; ``active`` if
    it is the active project; ``available`` otherwise. The next project is the
    first active node, falling back to the first available node.
    """
    rich_title: dict[str, str] = {}
    for unit in units_log:
        num = _num_of(unit.get("project"))
        if num:
            rich_title[num] = unit.get("concept") or unit.get("unit_id")

    active_num = _num_of(active.get("project"))
    if active_num:
        rich_title[active_num] = active.get("title") or active.get("id")

    mastered_nums = {_num_of(unit.get("project")) for unit in units_log if unit.get("mastered")}
    mastered_nums.discard(None)

    track: list[dict[str, Any]] = []
    for n in range(1, 19):
        num = f"{n:02d}"
        game = games.get(num) or {}
        status = (
            "mastered"
            if num in mastered_nums
            else "active"
            if num == active_num
            else "available"
        )
        track.append(
            {
                "num": num,
                "title": rich_title.get(num) or game.get("title") or num,
                "gameDir": game.get("gameDir"),
                "port": game.get("port"),
                "status": status,
            }
        )

    next_num = next((node["num"] for node in track if node["status"] == "active"), None) or next(
        (node["num"] for node in track if node["status"] == "available"), None
    )
    return track, next_num


def _load_games(source_root: Path) -> dict[str, dict[str, Any]]:
    """Load the voxel game catalog and add the 2D pixel-quest defaults."""
    catalog_path = source_root / "engines" / "voxelDojo" / "catalog.json"
    games: dict[str, dict[str, Any]] = {}
    if catalog_path.exists():
        for game in json.loads(catalog_path.read_text(encoding="utf-8")):
            game_id = game.get("id", "")
            num = str(game_id).split("-")[1] if isinstance(game_id, str) and "-" in game_id else None
            if num is None:
                continue
            games[num] = {
                "title": game.get("name", num),
                "gameDir": f"engines/voxelDojo/{game_id}",
                "port": game.get("developmentPort"),
            }

    # 01 and 04 are 2D sessions inside pixel-quest (no dedicated voxel game).
    games.setdefault("01", {"title": "RATE LIMITER", "gameDir": "engines/pixelDojo/pixel-quest", "port": None})
    games.setdefault("04", {"title": "TASK QUEUE", "gameDir": "engines/pixelDojo/pixel-quest", "port": None})
    return games


def derive_today_snapshot(
    source_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[str, Any]:
    """Return the dojoToday snapshot dict derived from the canonical state.

    Reuses :func:`build_snapshot` for streak and CURR, and
    :func:`derive_next_reviews` for the review queue, so the same scheduling
    truth feeds every engine-facing view.
    """
    today = today or date.today()
    canonical_path = source_root / "learner" / "learning_state.yaml"
    snapshot = build_snapshot(canonical_path, state=state, source_root=source_root, today=today)

    units_log = state.get("units_log") or []
    by_id = {unit.get("unit_id"): unit for unit in units_log if unit.get("unit_id")}

    reviews = derive_next_reviews(units_log, [], today)
    for review in reviews:
        unit = by_id.get(review["unitId"], {})
        review["gameDir"] = _game_dir(unit.get("evidence_file"), unit.get("project"))
        review["project"] = unit.get("project")

    active = state.get("active_unit") or {}
    active_view = {
        "id": active.get("id"),
        "title": active.get("title"),
        "project": active.get("project"),
        "num": _num_of(active.get("project")),
        "state": active.get("state"),
        "gameDir": _game_dir(active.get("evidence_file"), active.get("project")),
        "diagnosticFile": active.get("diagnostic_file"),
    }

    games = _load_games(source_root)
    track, next_num = _build_track(units_log, active, games)

    streak = snapshot["streak"]
    # Key order matches the historical gen-today.py output.
    streak_view = {
        "current": streak["current"],
        "longest": streak["longest"],
        "freezesEquipped": streak["freezesEquipped"],
        "freezesMax": streak["freezesMax"],
        "lastGateDate": streak["lastGateDate"],
    }

    return {
        "asOf": today.isoformat(),
        "streak": streak_view,
        "curr": snapshot["curr"],
        "activeUnit": active_view,
        "reviews": reviews,
        "masteredCount": sum(1 for unit in units_log if unit.get("mastered")),
        "totalUnits": len(units_log),
        "nextProjectNum": next_num,
        "track": track,
    }


def render_today_ts(snapshot: dict[str, Any]) -> str:
    """Render the dojoToday TypeScript module for the derived snapshot."""
    payload = json.dumps(snapshot, indent=2, ensure_ascii=False)
    return (
        "// AUTO-GERADO por learner/substrate/adapters/dojotoday.py — NÃO EDITAR À MÃO.\n"
        "// Fonte: learner/learning_state.yaml + scheduler learner.substrate.scheduling.\n"
        f"// Regenerado em {snapshot['asOf']}.\n"
        'import type { TodaySnapshot } from "../types";\n\n'
        f"export const today: TodaySnapshot = {payload} as TodaySnapshot;\n"
    )


def _self_check() -> int:
    """Framework-free check for the non-trivial track and game-dir logic."""
    games = {
        "01": {"title": "RATE LIMITER", "gameDir": "engines/pixelDojo/pixel-quest", "port": None},
        "02": {"title": "WAREHOUSE", "gameDir": "engines/voxelDojo/game-02-warehouse", "port": 5202},
        "03": {"title": "WORMHOLE", "gameDir": "engines/voxelDojo/game-03-wormhole", "port": 5203},
    }
    units_log = [
        {"unit_id": "U0", "project": "01_rate_limiter", "concept": "GATEKEEPER", "mastered": True},
        {"unit_id": "U2", "project": "02_key_value_store", "concept": "KV WAREHOUSE", "mastered": False},
    ]
    active = {"project": "02_key_value_store", "title": "KV WAREHOUSE: hash-map-backed CRUD"}

    track, next_num = _build_track(units_log, active, games)
    by_num = {node["num"]: node for node in track}

    assert len(track) == 18, f"track must have 18 nodes, got {len(track)}"
    assert by_num["01"]["status"] == "mastered", "01 must be mastered (U0 mastered)"
    assert by_num["01"]["title"] == "GATEKEEPER", "rich title for 01 must come from concept"
    assert by_num["02"]["status"] == "active", "02 must be active (active project)"
    assert by_num["02"]["title"] == active["title"], "rich title for 02 must come from active unit"
    assert by_num["03"]["status"] == "available", "03 must be available"
    assert next_num == "02", f"next must be 02 (active), got {next_num}"

    assert (
        _game_dir("engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson", None)
        == "engines/voxelDojo/game-02-warehouse"
    )
    assert _game_dir("engines/pixelDojo/.logs/last_run_evidence.json", None) == "engines/pixelDojo"
    assert _game_dir(None, "99_unknown") is None, "without evidence_file there is no game dir"

    _, next_no_active = _build_track(units_log, {}, games)
    assert next_no_active == "02", f"without active, next must be 02, got {next_no_active}"

    print("OK: dojotoday self-check passed (track + game_dir).")
    return 0


if __name__ == "__main__":
    raise SystemExit(_self_check())
