"""Learner-state substrate: single source of truth and derived-view adapters."""

import re
from datetime import date
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
from learner.substrate.fsio import atomic_write_text
from learner.substrate.generated_views import check_views, write_views

ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_ROOT = Path(__file__).resolve().parent.parent.parent
CANONICAL_STATE_PATH = ROOT / "learner" / "learning_state.yaml"

# AIDI (AI Dependency Index) measurement-source allowlist (ADR-0003).
# Hoisted to module scope so adapters and validators agree on the vocabulary.
# Sorted for human-readable error messages; the frozenset powers membership checks.
_AIDI_VALID_SOURCES = frozenset({"self_reported", "event_computed", "derived"})
_AIDI_VALID_SOURCES_SORTED = tuple(sorted(_AIDI_VALID_SOURCES))

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
    "check",
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
    target = resolve_canonical_path(path)
    resolved_target = target.resolve()
    root = (
        resolved_target.parent.parent
        if resolved_target.parent.name == "learner"
        else ROOT
    )
    errors = validate(state, root)
    if errors:
        raise ValueError(f"invalid learner state: {'; '.join(errors)}")
    return _write_canonical(state, target)


def _write_canonical(state: dict[str, Any], target: Path) -> Path:
    """Dump and atomically write already-validated state."""
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
    """Build every derived view, then persist canonical state and views.

    For temp/test paths, only writes — same as :func:`save_canonical`.
    """
    target = resolve_canonical_path(path)
    if not is_repo_canonical_path(target):
        return save_canonical(state, target)

    resolved_target = target.resolve()
    root = resolved_target.parent.parent
    errors = validate(state, root)
    if errors:
        raise ValueError(f"invalid learner state: {'; '.join(errors)}")

    from learner.substrate.projections import build_generated_views

    views = build_generated_views(SOURCE_ROOT, ROOT, state)
    _write_canonical(state, target)
    write_views(views)
    return target


def validate(state: dict[str, Any], root: Path | None = None) -> list[str]:
    """Return a list of invariant violations for the canonical state."""
    root = root or ROOT
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
    errors.extend(_validate_aidi(state))
    errors.extend(_validate_attempt_files(state, root))
    errors.extend(_validate_evidence_files(state, root))

    return errors


def _validate_units_log(state: dict[str, Any]) -> list[str]:
    """Validate the spaced-repetition review history (ADR: spaced-repetition-streak).

    The rating vocabulary and the freeze cap are the load-bearing invariants:
    a corrupted rating poisons the scheduler, and a freeze cap > 2 contradicts
    the research (3 freezes performed no better than 2). Both are checked
    defensively so states without a ``units_log`` still validate.

    Also asserts ``active_unit.id`` is registered in ``units_log`` —
    ``units_log`` defines the universe of valid IDs and the gate has no
    destination if the active unit isn't in it.
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

    active = state.get("active_unit")
    if isinstance(active, dict):
        active_id = active.get("id")
        if active_id and not any(
            isinstance(u, dict) and u.get("unit_id") == active_id for u in units_log
        ):
            errors.append(
                f"active_unit.id={active_id!r} is not present in units_log; "
                "register the unit before activating it"
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


def _validate_aidi(state: dict[str, Any]) -> list[str]:
    """Validate the AIDI (AI Dependency Index) block (ADR-0003).

    The block is required: ADR-0003 makes it the canonical source for AI
    dependency, so an absent field is now an invariant violation (F2 — single
    source of truth, F7 — fail visibly). Load-bearing sub-invariants when
    present: ``current`` is a probability in [0, 1], the thresholds are
    ordered, and ``measurement_source`` is one of the documented provenance
    tags.

    ponytail: ``bool`` deliberately passes the numeric checks (``isinstance``
    treats ``bool`` as ``int``). Matches ``_validate_streak``; tighten both at
    once if the contract ever needs to reject booleans.
    """
    errors: list[str] = []
    learner = state.get("learner")
    if not isinstance(learner, dict):
        errors.append("learner block is required to validate aidi (ADR-0003)")
        return errors

    aidi = learner.get("aidi")
    if aidi is None:
        errors.append("learner.aidi is required (ADR-0003) — F2 single source of truth")
        return errors
    if not isinstance(aidi, dict):
        errors.append(f"learner.aidi must be a mapping, got {type(aidi).__name__}")
        return errors

    current = aidi.get("current")
    if not isinstance(current, (int, float)) or not 0.0 <= current <= 1.0:
        errors.append(f"learner.aidi.current must be in [0,1], got {current!r}")

    amber = aidi.get("threshold_amber")
    red = aidi.get("threshold_red")
    if not isinstance(amber, (int, float)) or not isinstance(red, (int, float)):
        errors.append(
            f"learner.aidi.threshold_amber and threshold_red must be numbers, "
            f"got amber={amber!r} red={red!r}"
        )
    elif not 0.0 <= amber < red <= 1.0:
        errors.append(
            f"learner.aidi.thresholds must satisfy 0 <= amber({amber}) < red({red}) <= 1"
        )

    source = aidi.get("measurement_source")
    if source not in _AIDI_VALID_SOURCES:
        errors.append(
            f"learner.aidi.measurement_source must be one of "
            f"{_AIDI_VALID_SOURCES_SORTED}, got {source!r}"
        )

    history = aidi.get("history")
    if not isinstance(history, list):
        errors.append(f"learner.aidi.history must be a list, got {history!r}")
        return errors

    previous_date: date | None = None
    for index, point in enumerate(history):
        prefix = f"learner.aidi.history[{index}]"
        if not isinstance(point, dict):
            errors.append(f"{prefix} must be a mapping")
            continue

        raw_date = point.get("date")
        point_date: date | None = None
        if not isinstance(raw_date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
            errors.append(f"{prefix}.date must be an ISO date (YYYY-MM-DD), got {raw_date!r}")
        else:
            try:
                point_date = date.fromisoformat(raw_date)
            except ValueError:
                errors.append(f"{prefix}.date must be an ISO date (YYYY-MM-DD), got {raw_date!r}")

        value = point.get("value")
        if not isinstance(value, (int, float)) or not 0.0 <= value <= 1.0:
            errors.append(f"{prefix}.value must be in [0,1], got {value!r}")

        point_source = point.get("measurement_source")
        if point_source not in _AIDI_VALID_SOURCES:
            errors.append(
                f"{prefix}.measurement_source must be one of "
                f"{_AIDI_VALID_SOURCES_SORTED}, got {point_source!r}"
            )

        if point_date is not None:
            if previous_date is not None and point_date <= previous_date:
                errors.append("learner.aidi.history dates must be strictly ascending and unique")
            previous_date = point_date

    if history and isinstance(current, (int, float)):
        final_value = history[-1].get("value") if isinstance(history[-1], dict) else None
        if final_value != current:
            errors.append(
                f"learner.aidi.history final value ({final_value!r}) must equal current ({current!r})"
            )

    return errors


def _validate_attempt_files(state: dict[str, Any], root: Path = ROOT) -> list[str]:
    """Assert that mastered units have an ``attempt_file`` that exists.

    The learning gate requires the attempt to exist before the gate review
    can fire (``empirical_gates.learning.requires_attempt_before_solution``).
    A mastered unit pointing at a missing attempt file is the failure mode
    that produced the 18 false masterizations of 2026-07-01; surfacing the
    missing path here closes that whole class (F7).

    Only enforced for ``mastered: true`` units — in-flight units may not
    have a written attempt yet. Path containment/symlink hardening is shared
    with the gate via ``learner.gate.security.secure_attempt_path``.
    """
    from learner.gate.security import secure_attempt_path

    errors: list[str] = []
    units_log = state.get("units_log")
    if not isinstance(units_log, list):
        return errors

    for index, unit in enumerate(units_log):
        if not isinstance(unit, dict) or unit.get("mastered") is not True:
            continue
        attempt_path = unit.get("attempt_file")
        if not attempt_path:
            errors.append(
                f"units_log[{index}] is mastered but missing attempt_file; "
                "the gate requires attempt-before-solution"
            )
            continue
        label = f"units_log[{index}].attempt_file"
        resolved, path_errors = secure_attempt_path(root, str(attempt_path), label=label)
        if resolved is None:
            errors.extend(path_errors)
            continue
        if resolved.stat().st_size == 0:
            errors.append(f"{label} is empty: {attempt_path!r}")

    return errors


def _validate_evidence_files(state: dict[str, Any], root: Path = ROOT) -> list[str]:
    """Assert that units with a gate review have evidence that passes the gate.

    Delegates to ``curriculum._shared.evidence.check_evidence``, which is
    shape-detecting: game evidence requires a recognized empirical rubric or a
    gate review bound to a separate verifier receipt. Bound reviews recheck the
    canonical producer-evidence digest and reject embedded verifier blocks.
    Curriculum evidence (a verifier-owned ``verifier`` block) must satisfy
    ``verdict == "PASS"``, ``mutation_score >= 0.65``, ``coverage_core >= 0.80``,
    and ``context_isolated is True``. Missing/unparseable files yield a labelled
    error. The same call replaces the former bare ``json.loads`` parseability
    check and adds the semantic gate that was previously missing (audit gap:
    the validator proved the path was readable but never checked the verdict).

    Only enforced when a review carries a recognized ``gate_outcome`` (the
    same vocabulary used by ``_validate_units_log`` via
    ``RATING_FROM_GATE``) — pure ``presented`` events don't need evidence.
    """
    from curriculum._shared.evidence import check_evidence
    from learner.gate.evidence_io import bound_evidence_violations
    from learner.substrate.scheduling import RATING_FROM_GATE

    errors: list[str] = []
    units_log = state.get("units_log")
    if not isinstance(units_log, list):
        return errors

    for index, unit in enumerate(units_log):
        if not isinstance(unit, dict):
            continue
        reviews = unit.get("reviews") or []
        has_gate_review = any(
            isinstance(r, dict) and r.get("gate_outcome") in RATING_FROM_GATE
            for r in reviews
        )
        if not has_gate_review:
            continue
        evidence_path = unit.get("evidence_file")
        if not evidence_path:
            errors.append(
                f"units_log[{index}] has a gate review but no evidence_file; "
                "the gate requires parseable evidence"
            )
            continue
        receipt_review = next(
            (
                review
                for review in reviews
                if isinstance(review, dict)
                and review.get("gate_outcome") in RATING_FROM_GATE
                and isinstance(review.get("evidence_verifier_source"), str)
                and review.get("evidence_verifier_source")
            ),
            None,
        )
        if receipt_review is None:
            errors.extend(
                check_evidence(evidence_path, label=f"units_log[{index}]", root=root)
            )
            continue
        expected_digest = receipt_review.get("evidence_digest")
        if not isinstance(expected_digest, str):
            errors.append(
                f"units_log[{index}] has a verifier receipt but no evidence_digest"
            )
            continue
        errors.extend(
            f"units_log[{index}].{error}"
            for error in bound_evidence_violations(
                evidence_path, expected_digest, root
            )
        )

    return errors


def load_and_validate(path: str | Path = "learner/learning_state.yaml") -> dict[str, Any]:
    """Load the canonical state and raise on invariant violations."""
    state = load_canonical(path)
    state_path = resolve_canonical_path(path).resolve()
    root = state_path.parent.parent if state_path.parent.name == "learner" else ROOT
    errors = validate(state, root)
    if errors:
        raise ValueError(f"invalid learner state: {'; '.join(errors)}")
    return state


def sync() -> None:
    """Regenerate the machine-readable derived views from the canonical state.

    The whiteboard Markdown files (`learner_profile.md`, `trail.md`) are kept as
    human-readable derived views: their frontmatter carries `derived_from`, and
    their body is maintained by the tutoring agents with the substrate as the
    source of truth.

    The full set of generated views (dashboard/OS learner.ts, review slices,
    catalog projections, .mavis mirror) is defined once in
    `projections.build_generated_views`.
    """
    state = load_and_validate()
    from learner.substrate.projections import build_generated_views

    views = build_generated_views(SOURCE_ROOT, ROOT, state)
    write_views(views)
    print(f"Generated projections regenerated: {len(views)}")


def check() -> list[Path]:
    from learner.substrate.projections import build_generated_views

    state = load_and_validate()
    return check_views(build_generated_views(SOURCE_ROOT, ROOT, state))
