from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

from learner.substrate.adapters.dojotoday import derive_today_snapshot, render_today_ts
from learner.substrate.adapters.mavis import render_mavis_yaml
from learner.substrate.adapters.whiteboard import (
    derive_whiteboard_profile,
    derive_whiteboard_trail,
    render_profile_md,
    render_profile_yaml,
    render_trail_md,
)
from learner.substrate.catalog import load_catalog, render_backlog, render_projects_ts
from learner.substrate.dashboard_data import (
    load_dashboard_data,
    render_agents_ts,
    render_cycle_ts,
)
from learner.substrate.ts_render import (
    render_codexdojo_os_ts,
    render_dashboard_ts,
    render_pixel_review_ts,
    render_voxel_review_ts,
)


def _snapshot(
    source_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> tuple[Any, dict[str, Any]]:
    from learner.substrate.dashboard_snapshot import build_snapshot

    catalog = load_catalog(source_root / "curriculum" / "catalog.md")
    snapshot = build_snapshot(
        source_root / "learner" / "learning_state.yaml",
        state=state,
        source_root=source_root,
        catalog=catalog,
        today=today,
    )
    return catalog, snapshot


def build_mavis_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    return {
        output_root / ".mavis" / "learning_state.yaml": render_mavis_yaml(state),
    }


def build_whiteboard_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    profile = derive_whiteboard_profile(state)
    trail = derive_whiteboard_trail(state)
    return {
        output_root / "engines" / "minimaxDojo" / "whiteboard" / "profile.yaml": render_profile_yaml(profile),
        output_root / "engines" / "minimaxDojo" / "whiteboard" / "learner_profile.md": render_profile_md(profile),
        output_root / "engines" / "minimaxDojo" / "whiteboard" / "trail.md": render_trail_md(trail),
    }


def build_dashboard_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    catalog, snapshot = _snapshot(source_root, state, today)
    dashboard_data = load_dashboard_data(
        source_root / "engines" / "minimaxDojo" / "config" / "dashboard.yaml"
    )
    return {
        output_root / "engines" / "codexDojo" / "src" / "data" / "learner.ts": render_dashboard_ts(snapshot),
        output_root / "engines" / "codexDojo" / "src" / "data" / "projects.ts": render_projects_ts(catalog),
        output_root / "engines" / "codexDojo" / "src" / "data" / "agents.ts": render_agents_ts(dashboard_data),
        output_root / "engines" / "codexDojo" / "src" / "data" / "cycle.ts": render_cycle_ts(dashboard_data),
        output_root / "curriculum" / "BACKLOG_STATUS.md": render_backlog(catalog),
    }


def build_learner_snapshot_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    _, snapshot = _snapshot(source_root, state, today)
    return {
        output_root / "engines" / "codexdojo-os-prototype" / "src" / "data" / "learner.ts": render_codexdojo_os_ts(snapshot),
    }


def build_game_review_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    from learner.substrate.dashboard_snapshot import build_pixel_review_slice

    _, snapshot = _snapshot(source_root, state, today)
    review_slice = build_pixel_review_slice(snapshot)
    views = {
        output_root / "engines" / "pixelDojo" / "pixel-quest" / "src" / "content" / "reviewSlice.ts": render_pixel_review_ts(review_slice),
    }
    voxel_root = output_root / "engines" / "voxelDojo"
    voxel_paths = sorted(voxel_root.glob("game-*/src/content/reviewSlice.ts"))
    if not voxel_paths:
        voxel_paths = [voxel_root / "game-10-hash-ring" / "src" / "content" / "reviewSlice.ts"]
    voxel_content = render_voxel_review_ts(review_slice)
    for path in voxel_paths:
        views[path] = voxel_content
    return views


def build_dojotoday_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    snapshot = derive_today_snapshot(source_root, state, today)
    return {
        output_root / "engines" / "dojoToday" / "src" / "data" / "today.ts": render_today_ts(
            snapshot
        ),
    }


def build_generated_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    views: dict[Path, str] = {}
    for builder in (
        build_dashboard_views,
        build_mavis_views,
        build_whiteboard_views,
        build_learner_snapshot_views,
        build_game_review_views,
        build_dojotoday_views,
    ):
        views.update(builder(source_root, output_root, state, today))
    return views
