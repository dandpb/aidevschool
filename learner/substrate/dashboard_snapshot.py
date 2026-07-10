"""Product snapshots: derive engine-local TypeScript views from canonical learner state.

The codexDojo dashboard reads a TypeScript module at build time. This script is the only
way that module gets regenerated — manual edits to the .ts file are allowed in a hurry,
but `python3 -m learner.substrate` is the source of truth.

Inputs (all under `learner/`):
- `learning_state.yaml` — active unit, gate, profile metadata
- `learner_profile.md` — Dreyfus/Bloom position (free-form for now; first row of the matrix)
- `pitfalls.md` — top pitfalls by date/recency
- `journal.md` — AIDI trendline (scraped from any `aidi:` or `AIDI:` lines)
- `curriculum/catalog.md` + `curriculum/BACKLOG_STATUS.md` — mastered vs scaffolded counts
- `predictions.yaml` — Polyglot Arena per-metric prediction calibration counts

Outputs:
- `engines/codexDojo/src/data/learner.ts` — dashboard learner snapshot.
- `engines/codexdojo-os-prototype/src/data/learner.ts` — OS learner snapshot.

The TypeScript shape is locked at `engines/codexDojo/src/domain.ts:LearnerSnapshot`. If you
change the shape, update BOTH this script and the render code together.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

from learner.substrate import load_canonical
from learner.substrate.fsio import atomic_write_text
from learner.substrate.predictions_summary import summarize_predictions
from learner.substrate.scheduling import compute_curr, derive_next_reviews, reconcile_streak
from learner.substrate.snapshot_sources import (
    aidi_trend_from_journal,
    counts_from_backlog,
    pitfalls_from_markdown,
    profile_matrix,
    status_token as _status_token,
)
from learner.substrate.ts_render import (
    render_codexdojo_os_ts,
    render_dashboard_ts,
    render_pixel_review_ts,
    render_voxel_review_ts,
)

# `ROOT` resolves to the aidevschool repo root regardless of cwd: the substrate package
# lives at `<repo>/learner/substrate/`, so two `.parent`s gives us the repo root.
ROOT = Path(__file__).resolve().parent.parent.parent

DASHBOARD_TS = ROOT / "engines" / "codexDojo" / "src" / "data" / "learner.ts"
CODEXDOJO_OS_SNAPSHOT_TS = (
    ROOT / "engines" / "codexdojo-os-prototype" / "src" / "data" / "learner.ts"
)
PIXEL_REVIEW_TS = ROOT / "engines" / "pixelDojo" / "pixel-quest" / "src" / "content" / "reviewSlice.ts"
# Pilot destination kept for back-compat; sync fans out to every game-* slice.
VOXEL_REVIEW_TS = ROOT / "engines" / "voxelDojo" / "game-10-hash-ring" / "src" / "content" / "reviewSlice.ts"
VOXEL_DOJO_ROOT = ROOT / "engines" / "voxelDojo"
LEARNING_STATE = ROOT / "learner" / "learning_state.yaml"
LEARNER_PROFILE = ROOT / "learner" / "learner_profile.md"
PITFALLS = ROOT / "learner" / "pitfalls.md"
JOURNAL = ROOT / "learner" / "journal.md"
BACKLOG = ROOT / "curriculum" / "BACKLOG_STATUS.md"
def _streak_view(raw: dict[str, Any], today: date) -> dict[str, Any]:
    """Render the streak as a dashboard view, reconciled for missed days.

    ``reconcile_streak`` applies freeze/break consequences for any days elapsed
    since the last gate pass WITHOUT mutating the canonical state — the snapshot
    shows the streak as-of today. The runtime is responsible for persisting
    reconciled state back into ``learning_state.yaml``.
    """
    reconciled = reconcile_streak(raw or {}, today)
    freezes = reconciled.get("freezes") or {}
    last = reconciled.get("last_gate_date")
    last_gate_date = last.isoformat() if hasattr(last, "isoformat") else last
    return {
        "current": int(reconciled.get("current", 0)),
        "longest": int(reconciled.get("longest", 0)),
        "lastGateDate": last_gate_date,
        "freezesEquipped": int(freezes.get("equipped", 0)),
        "freezesMax": int(freezes.get("max", 2)),
    }


def build_snapshot() -> dict[str, Any]:
    state = load_canonical()
    learner = state.get("learner", {})
    active = state.get("active_unit", {})
    gate = state.get("gate", {})
    aidi = learner["aidi"]  # canonical; validator (ADR-0003) guarantees presence
    profile_levels = profile_matrix(LEARNER_PROFILE)

    # AIDI history: prefer journal-scraped points; fall back to a synthetic 3-point trend.
    aidi_history = aidi_trend_from_journal(JOURNAL)
    if not aidi_history:
        current = float(aidi["current"])
        aidi_history = [
            {"date": "2026-06-01", "value": round(max(0.0, current - 0.13), 2)},
            {"date": "2026-06-08", "value": round(max(0.0, current - 0.06), 2)},
            {"date": "2026-06-15", "value": round(current, 2)},
        ]

    pitfalls = pitfalls_from_markdown(PITFALLS, JOURNAL)
    mastered, scaffolded = counts_from_backlog(BACKLOG)

    snapshot = {
        "activeUnit": {
            "id": active.get("id", "unknown"),
            "title": active.get("title", "(no title)"),
            "project": active.get("project", "unknown"),
            "state": active.get("state", "presenting"),
            "retryCount": active.get("retry_count", 0),
            "retryLimit": active.get("retry_limit", 3),
        },
        "gate": {
            "implementationBlocked": bool(gate.get("implementation_blocked", True)),
            "unblockCondition": active.get("unblock_condition", "learner_attempt_evaluated"),
        },
        "profile": {
            "dreyfus": profile_levels["dreyfus"],
            "bloom": profile_levels["bloom"],
            "activeLanguage": learner.get("active_language", "TypeScript"),
            "weeklyTimeHours": learner.get("weekly_time_hours", 5),
        },
        "aidi": {
            "current": float(aidi["current"]),
            "thresholdAmber": float(aidi["threshold_amber"]),
            "thresholdRed": float(aidi["threshold_red"]),
            "trend": aidi_history,
        },
        "topPitfalls": pitfalls,
        "nextReviews": derive_next_reviews(
            state.get("units_log") or [],
            pitfalls,
            date.today(),
        ),
        "masteredCount": mastered,
        "scaffoldedCount": scaffolded,
        "streak": _streak_view(state.get("streak") or {}, date.today()),
        "curr": round(compute_curr(state.get("units_log") or [], date.today()), 2),
        "predictions": summarize_predictions(),
    }
    return snapshot


def render_ts(snapshot: dict[str, Any]) -> str:
    return render_dashboard_ts(snapshot)


def sync(snapshot: dict[str, Any] | None = None) -> Path:
    """Regenerate `engines/codexDojo/src/data/learner.ts`. Returns the file path.

    Accepts an optional prebuilt ``snapshot`` so the top-level substrate ``sync``
    can build once and share it across every TypeScript renderer
    instead of re-reading every canonical input twice.
    """
    snapshot = snapshot or build_snapshot()
    atomic_write_text(DASHBOARD_TS, render_ts(snapshot))
    return DASHBOARD_TS


def sync_codexdojo_os_snapshot(snapshot: dict[str, Any] | None = None) -> Path:
    """Regenerate the OS engine's read-only learner snapshot."""
    snapshot = snapshot or build_snapshot()
    atomic_write_text(CODEXDOJO_OS_SNAPSHOT_TS, render_codexdojo_os_ts(snapshot))
    return CODEXDOJO_OS_SNAPSHOT_TS


def build_pixel_review_slice(snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Project the read-only review slice pixelDojo consumes.

    pixelDojo reads scheduling truth (which unit is due, the streak counts) from
    this slice and emits evidence only — it never marks mastery or appends to
    units_log (GameNeverMarksMastery / evidence_only invariants). The streak is
    passed through unchanged: ``_streak_view`` (via ``build_snapshot``) already
    produces the exact shape pixelDojo needs, so there is nothing to rebuild.
    """
    snap = snapshot or build_snapshot()
    return {
        "nextReviews": snap.get("nextReviews", []),
        "streak": snap.get("streak", {}),
    }


def sync_pixel_review_slice(snapshot: dict[str, Any] | None = None) -> Path:
    """Regenerate the pixelDojo review slice. Returns the file path."""
    slice_dict = build_pixel_review_slice(snapshot)
    atomic_write_text(PIXEL_REVIEW_TS, render_pixel_review_ts(slice_dict))
    return PIXEL_REVIEW_TS


def discover_voxel_review_slice_paths() -> list[Path]:
    """Every voxelDojo game's review-slice destination (sorted, deterministic)."""
    if not VOXEL_DOJO_ROOT.is_dir():
        return []
    return sorted(VOXEL_DOJO_ROOT.glob("game-*/src/content/reviewSlice.ts"))


def sync_voxel_review_slice(snapshot: dict[str, Any] | None = None) -> list[Path]:
    """Regenerate the review slice for every voxelDojo game.

    Scheduling truth is engine-agnostic (same shape as pixelDojo). Contract §4
    requires substrate → game for all attempt surfaces, not only the game-10 pilot.
    Returns the list of paths written (empty if no game destinations exist).
    """
    slice_dict = build_pixel_review_slice(snapshot)
    text = render_voxel_review_ts(slice_dict)
    paths = discover_voxel_review_slice_paths()
    if not paths:
        # Cold start / missing fleet: keep pilot path as sole destination.
        paths = [VOXEL_REVIEW_TS]
    written: list[Path] = []
    for path in paths:
        atomic_write_text(path, text)
        written.append(path)
    return written
