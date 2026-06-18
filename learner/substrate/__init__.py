"""Learner-state substrate: single source of truth and derived-view adapters."""

from pathlib import Path
from typing import Any

import yaml

from learner.substrate.adapters.mavis import derive_mavis_view, render_mavis_yaml
from learner.substrate.adapters.whiteboard import (
    derive_whiteboard_profile,
    derive_whiteboard_trail,
    render_profile_md,
    render_profile_yaml,
    render_trail_md,
)

ROOT = Path(__file__).resolve().parent.parent.parent

__all__ = [
    "ROOT",
    "load_canonical",
    "validate",
    "load_and_validate",
    "derive_mavis_view",
    "render_mavis_yaml",
    "derive_whiteboard_profile",
    "derive_whiteboard_trail",
    "render_profile_md",
    "render_profile_yaml",
    "render_trail_md",
    "sync",
]


def load_canonical(path: str | Path = "learner/learning_state.yaml") -> dict[str, Any]:
    """Load the canonical learner state from YAML."""
    with open(ROOT / path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


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
    """
    state = load_and_validate()

    mavis_path = ROOT / ".mavis" / "learning_state.yaml"
    mavis_path.write_text(render_mavis_yaml(state), encoding="utf-8")

    profile = derive_whiteboard_profile(state)
    (ROOT / "engines" / "minimaxDojo" / "whiteboard" / "profile.yaml").write_text(
        render_profile_yaml(profile), encoding="utf-8"
    )
