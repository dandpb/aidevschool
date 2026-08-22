"""Product snapshots: derive engine-facing snapshot dicts from canonical learner state.

Builds the `LearnerSnapshot` and review-slice dicts that the generated-view
registry (`projections.build_generated_views`) renders into engine-local
TypeScript modules — writing happens there, via `python3 -m learner.substrate`.

Inputs (all under `learner/`):
- `learning_state.yaml` — active unit, gate, profile metadata
- `learner_profile.md` — Dreyfus/Bloom position (free-form for now; first row of the matrix)
- `pitfalls.md` — top pitfalls by date/recency
- `curriculum/catalog.md` + `curriculum/BACKLOG_STATUS.md` — mastered vs scaffolded counts
- `predictions.yaml` — Polyglot Arena per-metric prediction calibration counts

The TypeScript shape is locked at `engines/codexDojo/src/domain.ts:LearnerSnapshot`. If you
change the shape, update BOTH this script and the render code together.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from pathlib import Path
from typing import Any

import json

import yaml

from curriculum._shared.evidence import statuses as challenge_statuses
from learner.substrate.predictions_summary import summarize_predictions
from learner.substrate.projection_clock import projection_today
from learner.substrate.scheduling import compute_curr, derive_next_reviews, reconcile_streak
from learner.substrate.catalog import load_catalog
from learner.substrate.snapshot_sources import (
    counts_from_backlog,
    pitfalls_from_markdown,
    profile_matrix,
)

# `ROOT` resolves to the aidevschool repo root regardless of cwd: the substrate package
# lives at `<repo>/learner/substrate/`, so two `.parent`s gives us the repo root.
ROOT = Path(__file__).resolve().parent.parent.parent

LEARNING_STATE = ROOT / "learner" / "learning_state.yaml"
LEARNER_PROFILE = ROOT / "learner" / "learner_profile.md"
PITFALLS = ROOT / "learner" / "pitfalls.md"
JOURNAL = ROOT / "learner" / "journal.md"
BACKLOG = ROOT / "curriculum" / "BACKLOG_STATUS.md"
PREDICTIONS = ROOT / "learner" / "predictions.yaml"


def load_canonical(path: str | Path) -> dict[str, Any]:
    canonical = Path(path)
    canonical = canonical if canonical.is_absolute() else ROOT / canonical
    loaded = yaml.safe_load(canonical.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise ValueError(f"canonical learner state must be a mapping: {canonical}")
    return loaded


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
    last_gate_date = last.isoformat() if isinstance(last, date) else last
    return {
        "current": int(reconciled.get("current", 0)),
        "longest": int(reconciled.get("longest", 0)),
        "lastGateDate": last_gate_date,
        "freezesEquipped": int(freezes.get("equipped", 0)),
        "freezesMax": int(freezes.get("max", 2)),
    }


def build_snapshot(
    canonical_path: str | Path = "learner/learning_state.yaml",
    *,
    state: dict[str, Any] | None = None,
    source_root: Path | None = None,
    catalog: Sequence[Any] | None = None,
    today: date | None = None,
) -> dict[str, Any]:
    if state is None:
        state = load_canonical(canonical_path)
    learner = state.get("learner", {})
    active = state.get("active_unit", {})
    gate = state.get("gate", {})
    aidi = learner["aidi"]  # canonical; validator (ADR-0003) guarantees presence
    profile_path = LEARNER_PROFILE if source_root is None else source_root / "learner" / "learner_profile.md"
    pitfalls_path = PITFALLS if source_root is None else source_root / "learner" / "pitfalls.md"
    journal_path = JOURNAL if source_root is None else source_root / "learner" / "journal.md"
    profile_levels = profile_matrix(profile_path)

    aidi_history = [
        {
            "date": point["date"],
            "value": float(point["value"]),
            "measurementSource": point["measurement_source"],
        }
        for point in aidi["history"]
    ]

    pitfalls = pitfalls_from_markdown(pitfalls_path, journal_path)
    if source_root is None:
        mastered, scaffolded = counts_from_backlog(BACKLOG)
        predictions_path = PREDICTIONS
        challenge_root = ROOT
    else:
        if catalog is None:
            catalog = load_catalog(source_root / "curriculum" / "catalog.md")
        mastered = sum(project.status.startswith("implemented") for project in catalog)
        scaffolded = sum(project.status == "scaffolded" for project in catalog)
        predictions_path = source_root / "learner" / "predictions.yaml"
        challenge_root = source_root
    snapshot_date = today or projection_today()

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
            "measurementSource": aidi["measurement_source"],
            "trend": aidi_history,
        },
        "topPitfalls": pitfalls,
        "nextReviews": derive_next_reviews(
            state.get("units_log") or [],
            pitfalls,
            snapshot_date,
        ),
        "masteredCount": mastered,
        "scaffoldedCount": scaffolded,
        "streak": _streak_view(state.get("streak") or {}, snapshot_date),
        "curr": round(compute_curr(state.get("units_log") or [], snapshot_date), 2),
        "predictions": summarize_predictions(predictions_path),
        "challenges": [
            {
                "id": s.project_id,
                "phase": s.phase.value,
                "passed": s.passed,
                "attemptPresent": s.attempt_present,
            }
            for s in challenge_statuses(root=challenge_root)
        ],
    }
    return snapshot


#: Canonical voxelDojo game → unit_id mapping, single-sourced from
#: ``engines/voxelDojo/catalog.json`` (the game registry both the Python
#: substrate and the TypeScript ``shared/gameEvidenceMeta.ts`` read, so the
#: two languages cannot drift apart).
#:
#: Key: the ``game-*`` directory name in ``engines/voxelDojo/``.
#: Value: the canonical ``unit_id`` from ``learner/learning_state.yaml`` units_log
#: and the curriculum catalog. The substrate filters the global review queue
#: to this unit, so a wrong value here silently drops a game's reviews.
VOXEL_GAME_UNIT_IDS: dict[str, str] = {
    entry["id"]: entry["unitId"]
    for entry in json.loads(
        (ROOT / "engines" / "voxelDojo" / "catalog.json").read_text(encoding="utf-8")
    )
}

#: All 16 voxelDojo game directories under ``engines/voxelDojo/``.
VOXEL_GAME_IDS: tuple[str, ...] = tuple(VOXEL_GAME_UNIT_IDS.keys())


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


def build_voxel_per_game_review_slices(
    snapshot: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """Fan out a per-game review slice for every voxelDojo game.

    Each voxelDojo game targets exactly one curriculum unit (one game = one
    concept, per the teaching-game contract). The global review queue in
    ``snapshot["nextReviews"]`` mixes all units; for a per-game slice we filter
    to the unit this game teaches. If that unit is currently due or overdue the
    slice surfaces the FSRS-computed reason (``"due"`` or ``"overdue"``);
    otherwise the slice is empty (no scheduled review, the game emits as
    deepening).

    Returning a per-game map (not a single concatenated slice) is what makes the
    15/16 "hand-copied stub" failure mode impossible: each game's file is
    derived from the canonical state with that game's unit as the filter, not
    copy-pasted from game-10.

    The streak is shared across all games (one learner, one streak) and is
    passed through unchanged.
    """
    snap = snapshot or build_snapshot()
    by_unit: dict[str, list[dict[str, Any]]] = {}
    for review in snap.get("nextReviews", []):
        by_unit.setdefault(review.get("unitId"), []).append(review)
    streak = snap.get("streak", {})
    return {
        game_id: {
            "nextReviews": by_unit.get(unit_id, []),
            "streak": streak,
        }
        for game_id, unit_id in VOXEL_GAME_UNIT_IDS.items()
    }


def build_voxel_review_slice(snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Project the read-only voxelDojo review slice (global, all units).

    Kept for backward compatibility with the legacy shared file at
    ``engines/voxelDojo/shared/content.ts``. New consumers should prefer the
    per-game slices returned by :func:`build_voxel_per_game_review_slices`.
    """
    snap = snapshot or build_snapshot()
    return {
        "nextReviews": snap.get("nextReviews", []),
        "streak": snap.get("streak", {}),
    }
