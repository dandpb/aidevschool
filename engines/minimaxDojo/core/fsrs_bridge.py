"""FSRS integration bridge: minimaxDojo → learner/substrate → dojoToday (AID-5005).

Single engine-side entry point for the pedagogical scheduling contract:

- A verified guided-practice conclusion (deterministic OS receipt) is
  independently re-verified by the substrate
  (:mod:`learner.substrate.practice`) and lands as ONE gate review
  (``gate_kind = guided_practice``), advancing the unit's FSRS card
  (``stability``/``difficulty``/``due``) without ever writing mastery.
- The daily review queue read here is the SAME derivation that feeds
  ``engines/dojoToday`` (``derive_next_reviews``), so "recorded" and
  "reflected in today's queue" cannot drift apart.
- After a canonical commit, derived views regenerate via
  ``python3 -m learner.substrate`` (``sync()``), which refreshes
  ``engines/dojoToday/src/data/today.ts`` and the OS ``learner.ts`` snapshot.

Producer ≠ verifier: this bridge only transports receipts; every pedagogical
decision stays in the substrate seam (one rating vocabulary, one replay path).
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]


def _substrate():
    from learner.substrate import load_canonical

    return load_canonical


def load_practice_catalog(root: Path | None = None) -> dict[str, dict[str, Any]]:
    """Load the canonical guided-practice catalog (``curriculum/sequencia-dev-guiada``)."""
    from learner.substrate.mission_catalog_guided_practice import (
        load_guided_practice_catalog,
    )

    base = (root or REPO_ROOT) / "curriculum" / "sequencia-dev-guiada"
    return load_guided_practice_catalog(base)


def practice_card_state(
    state: dict[str, Any], practice_id: str
) -> dict[str, Any] | None:
    """Materialized FSRS card state for a practice unit, or ``None`` if absent."""
    from learner.substrate.mission_catalog_guided_practice import (
        GUIDED_PRACTICE_UNIT_PREFIX,
    )
    from learner.substrate.scheduling import build_card_from_reviews, card_state_view

    unit_id = f"{GUIDED_PRACTICE_UNIT_PREFIX}{practice_id}"
    entry = next(
        (
            unit
            for unit in state.get("units_log") or []
            if unit.get("unit_id") == unit_id
        ),
        None,
    )
    if entry is None:
        return None
    return card_state_view(build_card_from_reviews(entry.get("reviews") or []))


def record_practice_conclusion(
    receipt: dict[str, Any],
    *,
    today: date | None = None,
    root: Path | None = None,
    state_path: str | Path | None = None,
    refresh: bool = True,
) -> dict[str, Any]:
    """Apply a verified practice conclusion and return the observable result.

    Returns ``{practice_id, unit_id, outcome, rating, card_before,
    card_after, queue_after}`` — the invariant AID-5005 promises: given a
    verified conclusion on day D, the card advances exactly one step and the
    daily queue reflects the new scheduling truth on the next derivation.
    ``refresh=True`` regenerates every derived view (dojoToday ``today.ts``,
    OS ``learner.ts``) when writing the repo-canonical state.
    """
    from learner.substrate.practice import (
        commit_practice_conclusion,
        practice_unit_id,
    )
    from learner.substrate.scheduling import derive_next_reviews

    resolved_root = (root or REPO_ROOT).resolve()
    path = state_path or (resolved_root / "learner" / "learning_state.yaml")
    today = today or date.today()

    load = _substrate()
    state = load(path)
    catalog = load_practice_catalog(resolved_root)
    practice_id = receipt.get("practice_id")
    practice = catalog.get(practice_id)
    if practice is None:
        raise ValueError(
            f"unknown practice {practice_id!r}; canonical catalog has"
            f" {sorted(catalog)}"
        )

    card_before = practice_card_state(state, str(practice_id))
    new_state = commit_practice_conclusion(
        state,
        receipt=receipt,
        practice=practice,
        today=today,
        root=resolved_root,
        path=path,
    )
    card_after = practice_card_state(new_state, str(practice_id))
    queue_after = derive_next_reviews(
        new_state.get("units_log") or [], [], today
    )

    if refresh:
        _refresh_views()

    unit = next(
        (
            entry
            for entry in new_state.get("units_log") or []
            if entry.get("unit_id") == practice_unit_id(str(practice_id))
        ),
        None,
    )
    review = next(
        (
            row
            for row in reversed((unit or {}).get("reviews") or [])
            if row.get("event") == "gate"
        ),
        None,
    )
    return {
        "practice_id": practice_id,
        "unit_id": practice_unit_id(str(practice_id)),
        "outcome": review.get("gate_outcome") if review else None,
        "rating": review.get("rating") if review else None,
        "card_before": card_before,
        "card_after": card_after,
        "queue_after": queue_after,
        "state": new_state,
    }


def dojo_queue(
    *,
    today: date | None = None,
    root: Path | None = None,
    state_path: str | Path | None = None,
) -> list[dict[str, Any]]:
    """The daily review queue exactly as dojoToday derives it (same seam)."""
    from learner.substrate.scheduling import derive_next_reviews

    resolved_root = (root or REPO_ROOT).resolve()
    path = state_path or (resolved_root / "learner" / "learning_state.yaml")
    state = _substrate()(path)
    return derive_next_reviews(state.get("units_log") or [], [], today or date.today())


def _refresh_views() -> None:
    """Regenerate derived views for the repo-canonical state (no-op elsewhere)."""
    from learner.substrate import is_repo_canonical_path, sync

    if is_repo_canonical_path("learner/learning_state.yaml"):
        sync()
