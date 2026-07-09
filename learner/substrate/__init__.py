"""Learner-state substrate: single source of truth and derived-view adapters."""

from pathlib import Path
from typing import TYPE_CHECKING, Any

import yaml

from learner.substrate.adapters.mavis import derive_mavis_view, render_mavis_yaml
from learner.substrate.adapters.whiteboard import (
    derive_whiteboard_profile,
    derive_whiteboard_trail,
    render_profile_md,
    render_profile_yaml,
    render_trail_md,
)
from learner.substrate.fsio import atomic_write_text

if TYPE_CHECKING:
    from learner.substrate.dashboard_snapshot import sync as sync_dashboard_snapshot

ROOT = Path(__file__).resolve().parent.parent.parent
CANONICAL_STATE_PATH = ROOT / "learner" / "learning_state.yaml"

# Lazy-imported to avoid circular dependency (dashboard_snapshot resolves ROOT locally).
def __getattr__(name: str):
    if name == "sync_dashboard_snapshot":
        from learner.substrate.dashboard_snapshot import sync as _sync

        return _sync
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "ROOT",
    "CANONICAL_STATE_PATH",
    "load_canonical",
    "validate",
    "load_and_validate",
    "save_canonical",
    "commit_canonical",
    "is_repo_canonical_path",
    "derive_mavis_view",
    "render_mavis_yaml",
    "derive_whiteboard_profile",
    "derive_whiteboard_trail",
    "render_profile_md",
    "render_profile_yaml",
    "render_trail_md",
    "sync",
    "sync_dashboard_snapshot",
]


class _NoAliasDumper(yaml.SafeDumper):
    """Avoid anchors/aliases so the canonical YAML stays plain and greppable."""

    def ignore_aliases(self, data: Any) -> bool:  # noqa: ARG002
        return True


def resolve_canonical_path(path: str | Path = "learner/learning_state.yaml") -> Path:
    """Resolve a learner-state path relative to the repo root (absolute paths win)."""
    p = Path(path)
    return p if p.is_absolute() else ROOT / p


def is_repo_canonical_path(path: str | Path) -> bool:
    """True when ``path`` is the ecosystem's real ``learner/learning_state.yaml``."""
    return resolve_canonical_path(path).resolve() == CANONICAL_STATE_PATH.resolve()


def load_canonical(path: str | Path = "learner/learning_state.yaml") -> dict[str, Any]:
    """Load the canonical learner state from YAML."""
    with open(resolve_canonical_path(path), "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_canonical(
    state: dict[str, Any],
    path: str | Path = "learner/learning_state.yaml",
) -> Path:
    """Atomically persist canonical learner state (write only; no derived views)."""
    errors = validate(state)
    if errors:
        raise ValueError(f"invalid learner state: {'; '.join(errors)}")

    target = resolve_canonical_path(path)
    text = yaml.dump(
        state,
        Dumper=_NoAliasDumper,
        sort_keys=False,
        allow_unicode=True,
        width=100,
    )
    atomic_write_text(target, text)
    return target


def commit_canonical(
    state: dict[str, Any],
    path: str | Path = "learner/learning_state.yaml",
) -> Path:
    """Save canonical state then regenerate derived views (repo path only).

    For temp/test paths, only writes — same as :func:`save_canonical`.
    """
    target = save_canonical(state, path)
    if is_repo_canonical_path(target):
        sync()
    return target


def validate(state: dict[str, Any]) -> list[str]:
    """Return a list of invariant violations for the canonical state."""
    errors: list[str] = []

    if state.get("version") is None:
        errors.append("missing version")

    if state.get("system") != "agora-continuum":
        errors.append("system must be agora-continuum")

    learner = state.get("learner")
    if not isinstance(learner, dict):
        errors.append("missing learner")
    else:
        if not learner.get("id"):
            errors.append("learner.id is required")

        valid_levels = {"beginner", "intermediate", "advanced"}
        if learner.get("level") not in valid_levels:
            errors.append(f"learner.level must be one of {valid_levels}")

        active_language = learner.get("active_language")
        languages = learner.get("languages", [])
        if active_language and active_language not in languages:
            errors.append("learner.active_language must be in learner.languages")

    active = state.get("active_unit")
    if not isinstance(active, dict):
        errors.append("missing active_unit")
    else:
        if not active.get("id"):
            errors.append("active_unit.id is required")

        valid_states = {"presenting", "practicing", "evaluating", "mastered"}
        if active.get("state") not in valid_states:
            errors.append(f"active_unit.state must be one of {valid_states}")

        retry_count = active.get("retry_count", 0)
        retry_limit = active.get("retry_limit", 3)
        if retry_count > retry_limit:
            errors.append("active_unit.retry_count cannot exceed retry_limit")

    gate = state.get("gate")
    if isinstance(gate, dict) and gate.get("implementation_blocked") not in (True, False):
        errors.append("gate.implementation_blocked must be boolean")

    empirical = state.get("empirical_gates", {})
    learning_gate = empirical.get("learning", {}) if isinstance(empirical, dict) else {}
    if learning_gate.get("requires_attempt_before_solution") is not True:
        errors.append("empirical_gates.learning.requires_attempt_before_solution must be true")

    errors.extend(_validate_units_log(state))
    errors.extend(_validate_streak(state))

    return errors


def _validate_units_log(state: dict[str, Any]) -> list[str]:
    """Validate the spaced-repetition review history (ADR: spaced-repetition-streak).

    The rating vocabulary and the freeze cap are the load-bearing invariants:
    a corrupted rating poisons the scheduler, and a freeze cap > 2 contradicts
    the research (3 freezes performed no better than 2). Both are checked
    defensively so states without a ``units_log`` still validate.
    """
    from learner.substrate.scheduling import RATING_FROM_GATE, RATINGS

    errors: list[str] = []
    units_log = state.get("units_log")
    if not isinstance(units_log, list):
        return errors

    for index, unit in enumerate(units_log):
        if not isinstance(unit, dict):
            errors.append(f"units_log[{index}] must be a mapping")
            continue

        reviews = unit.get("reviews") or []
        has_gate_review = False
        for r_index, review in enumerate(reviews):
            if not isinstance(review, dict):
                errors.append(f"units_log[{index}].reviews[{r_index}] must be a mapping")
                continue
            rating = review.get("rating")
            if rating is not None and rating not in RATINGS:
                errors.append(
                    f"units_log[{index}].reviews[{r_index}].rating must be one of "
                    f"{sorted(RATINGS)}, got {rating!r}"
                )
            outcome = review.get("gate_outcome")
            if outcome is not None and outcome in RATING_FROM_GATE:
                has_gate_review = True
                expected = RATING_FROM_GATE[outcome]
                if rating is not None and rating != expected:
                    errors.append(
                        f"units_log[{index}].reviews[{r_index}].rating {rating!r} is "
                        f"inconsistent with gate_outcome {outcome!r} (expected {expected!r}); "
                        "the gate is the only rating producer"
                    )

        if unit.get("mastered") is True and not has_gate_review:
            errors.append(
                f"units_log[{index}] is mastered but has no gate review; mastery "
                "requires executable evidence (a gate review), never docs alone"
            )

    return errors


def _validate_streak(state: dict[str, Any]) -> list[str]:
    """Validate the streak/freeze block (ADR: spaced-repetition-streak)."""
    errors: list[str] = []
    streak = state.get("streak")
    if not isinstance(streak, dict):
        return errors

    current = streak.get("current", 0)
    if not isinstance(current, int) or current < 0:
        errors.append(f"streak.current must be a non-negative integer, got {current!r}")

    freezes = streak.get("freezes", {})
    equipped = freezes.get("equipped", 0)
    maximum = freezes.get("max", 2)
    if not (0 <= equipped <= maximum <= 2):
        errors.append(
            f"streak.freezes must satisfy 0 <= equipped({equipped}) <= max({maximum}) <= 2 "
            "(research: 3 freezes performed no better than 2)"
        )

    return errors


def load_and_validate(path: str | Path = "learner/learning_state.yaml") -> dict[str, Any]:
    """Load the canonical state and raise on invariant violations."""
    state = load_canonical(path)
    errors = validate(state)
    if errors:
        raise ValueError(f"invalid learner state: {'; '.join(errors)}")
    return state


def sync() -> None:
    """Regenerate the machine-readable derived views from the canonical state.

    The whiteboard Markdown files (`learner_profile.md`, `trail.md`) are kept as
    human-readable derived views: their frontmatter carries `derived_from`, and
    their body is maintained by the tutoring agents with the substrate as the
    source of truth.

    Also regenerates `engines/codexDojo/src/data/learner.ts` (the codexDojo dashboard's
    learner snapshot) via `dashboard_snapshot.sync`.
    """
    # Imported inside the function to break the circular dependency:
    # `dashboard_snapshot` resolves `ROOT` independently and would loop otherwise.
    from learner.substrate.dashboard_snapshot import (
        build_snapshot as _build_snapshot,
        sync as _sync_dashboard_snapshot,
        sync_pixel_review_slice as _sync_pixel_review_slice,
        sync_voxel_review_slice as _sync_voxel_review_slice,
    )

    state = load_and_validate()

    mavis_path = ROOT / ".mavis" / "learning_state.yaml"
    atomic_write_text(mavis_path, render_mavis_yaml(state))

    whiteboard = ROOT / "engines" / "minimaxDojo" / "whiteboard"
    profile = derive_whiteboard_profile(state)
    atomic_write_text(whiteboard / "profile.yaml", render_profile_yaml(profile))
    atomic_write_text(whiteboard / "learner_profile.md", render_profile_md(profile))

    trail = derive_whiteboard_trail(state)
    atomic_write_text(whiteboard / "trail.md", render_trail_md(trail))

    # Build the snapshot once and share it across both renderers so the canonical
    # inputs (learning_state.yaml, journal.md, pitfalls.md, BACKLOG_STATUS.md)
    # and the FSRS replay are not re-read twice per sync.
    snapshot = _build_snapshot()
    dashboard_path = _sync_dashboard_snapshot(snapshot)
    print(f"Dashboard snapshot regenerated: {dashboard_path.relative_to(ROOT)}")

    pixel_path = _sync_pixel_review_slice(snapshot)
    print(f"PixelDojo review slice regenerated: {pixel_path.relative_to(ROOT)}")

    voxel_paths = _sync_voxel_review_slice(snapshot)
    if isinstance(voxel_paths, list):
        print(f"voxelDojo review slices regenerated: {len(voxel_paths)} games")
    else:
        print(f"voxelDojo review slice regenerated: {voxel_paths.relative_to(ROOT)}")
