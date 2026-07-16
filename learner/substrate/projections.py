from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

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


def build_generated_views(
    source_root: Path,
    output_root: Path,
    state: dict[str, Any],
    today: date | None = None,
) -> dict[Path, str]:
    from learner.substrate.dashboard_snapshot import build_pixel_review_slice, build_snapshot

    catalog = load_catalog(source_root / "curriculum" / "catalog.md")
    dashboard_data = load_dashboard_data(
        source_root / "engines" / "minimaxDojo" / "config" / "dashboard.yaml"
    )
    snapshot = build_snapshot(
        source_root / "learner" / "learning_state.yaml",
        state=state,
        source_root=source_root,
        catalog=catalog,
        today=today,
    )
    review_slice = build_pixel_review_slice(snapshot)
    profile = derive_whiteboard_profile(state)
    trail = derive_whiteboard_trail(state)
    views = {
        output_root / ".mavis" / "learning_state.yaml": render_mavis_yaml(state),
        output_root / "engines" / "minimaxDojo" / "whiteboard" / "profile.yaml": render_profile_yaml(profile),
        output_root / "engines" / "minimaxDojo" / "whiteboard" / "learner_profile.md": render_profile_md(profile),
        output_root / "engines" / "minimaxDojo" / "whiteboard" / "trail.md": render_trail_md(trail),
        output_root / "engines" / "codexDojo" / "src" / "data" / "learner.ts": render_dashboard_ts(snapshot),
        output_root / "engines" / "codexdojo-os-prototype" / "src" / "data" / "learner.ts": render_codexdojo_os_ts(snapshot),
        output_root / "engines" / "pixelDojo" / "pixel-quest" / "src" / "content" / "reviewSlice.ts": render_pixel_review_ts(review_slice),
        output_root / "engines" / "codexDojo" / "src" / "data" / "projects.ts": render_projects_ts(catalog),
        output_root / "engines" / "codexDojo" / "src" / "data" / "agents.ts": render_agents_ts(dashboard_data),
        output_root / "engines" / "codexDojo" / "src" / "data" / "cycle.ts": render_cycle_ts(dashboard_data),
        output_root / "curriculum" / "BACKLOG_STATUS.md": render_backlog(catalog),
    }
    voxel_root = output_root / "engines" / "voxelDojo"
    voxel_paths = sorted(voxel_root.glob("game-*/src/content/reviewSlice.ts"))
    if not voxel_paths:
        voxel_paths = [voxel_root / "game-10-hash-ring" / "src" / "content" / "reviewSlice.ts"]
    voxel_content = render_voxel_review_ts(review_slice)
    for path in voxel_paths:
        views[path] = voxel_content
    return views
