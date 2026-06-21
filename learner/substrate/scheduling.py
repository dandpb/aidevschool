"""Spaced-repetition scheduling for the learner substrate.

This module owns the *scheduling* seam between the executable-evidence gate and
re-exposure of past concepts. It is deliberately split from
`dashboard_snapshot.py` so the rules are testable in isolation.

Non-negotiable rule (anchored in the deep-research run `wf_f154f0ca-00a` and the
ADR `docs/design/spaced-repetition-streak/README.md`): the rating that feeds the
scheduler comes ONLY from gate outcomes, never from learner self-report. Learners
systematically misjudge spaced practice as ineffective, so a subjective rating
would corrupt the schedule.

Phase 1 wires in FSRS (the ``fsrs`` PyPI package, v6) as the scheduler, replacing
the Phase-0 naive fixed intervals. The scheduler is configured for the
code-concept domain: day-scale learning steps (not flashcard minutes) and fuzzing
disabled so the schedule is deterministic and testable. Per-user parameter
personalization is deferred (PLAN open question) until units_log carries enough
reviews.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fsrs import Card, Rating, Scheduler

# --- Gate outcome → FSRS rating ----------------------------------------------

#: Canonical gate outcomes, produced by the verifier against `empirical_gates`.
GATE_OUTCOMES = frozenset({"fail", "pass_retried", "pass_first_try", "pass_exceeds"})

#: The four FSRS rating names. This mapping is the single source of truth for
#: "gate result → scheduler rating" and MUST stay deterministic; nothing else
#: may invent a rating.
RATING_FROM_GATE: dict[str, str] = {
    "fail": "again",
    "pass_retried": "hard",
    "pass_first_try": "good",
    "pass_exceeds": "easy",
}

#: Valid rating vocabulary (subset of FSRS ratings).
RATINGS = frozenset(RATING_FROM_GATE.values())

#: Rating name → ``fsrs.Rating`` enum. The scheduler consumes the enum.
_RATING_ENUM: dict[str, Rating] = {
    "again": Rating.Again,
    "hard": Rating.Hard,
    "good": Rating.Good,
    "easy": Rating.Easy,
}


def rating_from_gate_outcome(outcome: str) -> str:
    """Map a gate outcome to an FSRS rating name.

    The gate (executable evidence: coverage / mutation / benchmark) is the only
    legitimate producer of a rating. Raises ``ValueError`` on an unknown outcome
    rather than guessing — a wrong rating poisons the whole schedule.
    """
    try:
        return RATING_FROM_GATE[outcome]
    except KeyError as exc:
        raise ValueError(
            f"unknown gate outcome {outcome!r}; expected one of {sorted(GATE_OUTCOMES)}"
        ) from exc


# --- FSRS scheduler (Phase 1) ------------------------------------------------

#: Domain-tuned scheduler. ``learning_steps`` are day-scale because code concepts
#: are not flashcards — re-exposing a concept one minute after learning it is
#: nonsensical in this domain. ``enable_fuzzing=False`` makes the schedule
#: deterministic so derivation and tests are reproducible. Default parameters and
#: retention are kept; per-user personalization is deferred (PLAN open question).
_SCHEDULER = Scheduler(
    learning_steps=(timedelta(days=1), timedelta(days=4)),
    relearning_steps=(timedelta(days=1),),
    enable_fuzzing=False,
)


def _to_datetime(when: date | datetime) -> datetime:
    """Coerce a date/datetime to a UTC-aware datetime (fsrs requires aware dt)."""
    if isinstance(when, datetime):
        return when if when.tzinfo else when.replace(tzinfo=timezone.utc)
    return datetime(when.year, when.month, when.day, tzinfo=timezone.utc)


def apply_gate_review(
    card: Card, rating_name: str, reviewed_at: date | datetime
) -> tuple[Card, Any]:
    """Advance an FSRS card by one gate review.

    Used by the runtime gate process when the executable-evidence gate evaluates
    an attempt: the outcome maps to a rating via ``rating_from_gate_outcome``,
    then this advances the card. The returned card carries the new ``due`` and
    ``stability``/``difficulty`` to persist back into ``units_log``.
    """
    if rating_name not in _RATING_ENUM:
        raise ValueError(
            f"unknown rating {rating_name!r}; expected one of {sorted(RATINGS)}"
        )
    new_card, review_log = _SCHEDULER.review_card(
        card, _RATING_ENUM[rating_name], _to_datetime(reviewed_at)
    )
    return new_card, review_log


def build_card_from_reviews(reviews: list[dict[str, Any]]) -> Card | None:
    """Replay a unit's gate-rated reviews through FSRS to reconstruct its card.

    Returns the resulting ``Card`` (with its ``due``), or ``None`` if the unit
    has no gate-rated reviews yet (e.g. only ``presented``). Replaying from the
    review log keeps the substrate read-only: the canonical truth is the
    ``reviews`` list, not a separately-persisted card. Reviews are replayed in
    chronological order; non-gate events (e.g. ``presented``) are skipped.
    """
    card = Card()
    gate_events = [
        r
        for r in (reviews or [])
        if r.get("event") == "gate" and r.get("rating") in _RATING_ENUM
    ]
    gate_events.sort(key=lambda r: r.get("date") or date.min)
    has_gate_review = False
    for event in gate_events:
        has_gate_review = True
        card, _log = _SCHEDULER.review_card(
            card, _RATING_ENUM[event["rating"]], _to_datetime(event["date"])
        )
    return card if has_gate_review else None


def _format_due_in(due: date, today: date) -> str:
    """Human-readable delta for the dashboard, e.g. 'today', 'overdue 2d'."""
    delta = (due - today).days
    if delta == 0:
        return "today"
    if delta == 1:
        return "tomorrow"
    if delta < 0:
        return f"overdue {-delta}d"
    return f"in {delta}d"


# --- Streak + freeze (Phase 2) -----------------------------------------------

def record_gate_outcome(
    streak: dict[str, Any], passed: bool, today: date
) -> dict[str, Any]:
    """Record a gate outcome against the streak.

    A passed gate extends the streak (``current`` + 1, ``last_gate_date`` = today)
    and tracks ``longest``. A failed gate is a no-op — the ADR is explicit that a
    failed attempt does NOT break the streak (the gate, not the attempt, is the
    scarcity). Returns a new streak dict; the input is not mutated.
    """
    if not passed:
        return streak
    new_current = int(streak.get("current", 0)) + 1
    longest = max(int(streak.get("longest", new_current)), new_current)
    return {
        "current": new_current,
        "longest": longest,
        "last_gate_date": today,
        "freezes": dict(streak.get("freezes") or {}),
    }


def reconcile_streak(streak: dict[str, Any], today: date) -> dict[str, Any]:
    """Apply missed-day consequences, idempotent within a day.

    If a full day elapsed with no gate pass (``last_gate_date`` older than
    yesterday), each missed day consumes one freeze; once freezes are exhausted
    the streak breaks (``current`` = 0). ``today`` is injected for determinism.
    A streak that has never passed a gate (``last_gate_date`` is null) is left
    untouched. Returns a new dict; the input is not mutated.
    """
    last = streak.get("last_gate_date")
    if last is None:
        return streak
    if isinstance(last, datetime):
        last = last.date()
    missed_days = (today - last).days - 1
    if missed_days <= 0:
        return streak

    freezes = dict(streak.get("freezes") or {})
    current = int(streak.get("current", 0))
    for _ in range(missed_days):
        if int(freezes.get("equipped", 0)) > 0:
            freezes["equipped"] = int(freezes.get("equipped", 0)) - 1
        else:
            current = 0
            break

    result = dict(streak)
    result["current"] = current
    result["freezes"] = freezes
    return result


# --- CURR (Phase 4) -----------------------------------------------------------

#: Trailing window for the CURR (Current-user Retention Rate) proxy, in days.
#: Mirrors Duolingo's "current" notion: a unit counts as retained if it saw a
#: gate review within this window. UNVALIDATED — see ADR open questions.
CURR_WINDOW_DAYS = 7


def compute_curr(units_log: list[dict[str, Any]], today: date) -> float:
    """Compute the CURR retention proxy in [0, 1].

    CURR = (units with a gate review in the trailing ``CURR_WINDOW_DAYS``) /
    (units with ANY gate review). Returns 0.0 when no unit has a gate review yet
    — retention cannot be measured before any gate has been passed. This is an
    UNVALIDATED proxy (ADR open question); it must not drive any automated
    decision (scheduling, gating, streaks).
    """
    gate_count = 0
    recent = 0
    for unit in units_log:
        gate_dates: list[date] = []
        for r in (unit.get("reviews") or []):
            if r.get("event") != "gate":
                continue
            when = r.get("date")
            if isinstance(when, datetime):
                when = when.date()
            if isinstance(when, date):
                gate_dates.append(when)
        if not gate_dates:
            continue
        gate_count += 1
        if any(0 <= (today - d).days <= CURR_WINDOW_DAYS for d in gate_dates):
            recent += 1
    return recent / gate_count if gate_count else 0.0


def derive_next_reviews(
    units_log: list[dict[str, Any]],
    pitfalls: list[dict[str, Any]],
    today: date,
) -> list[dict[str, str]]:
    """Derive the next-review queue from real ``units_log`` history using FSRS.

    Each unit's gate-rated reviews are replayed into an FSRS card; the card's
    ``due`` date (vs the injected ``today``) decides whether the unit surfaces as
    overdue/due or stays hidden. A unit with no gate reviews yet is "due" (it
    needs a first gate attempt). Recurring traps come from the pitfalls log
    (real history), not invented.

    ``today`` is injected (never read from the clock inside pure logic) so the
    derivation is deterministic and testable.
    """
    reviews: list[dict[str, str]] = []

    for unit in units_log:
        unit_id = unit.get("unit_id")
        if not unit_id:
            continue
        title = unit.get("concept") or unit_id

        card = build_card_from_reviews(unit.get("reviews") or [])
        if card is None or card.due is None:
            # No gate review yet — the unit is due for a first attempt.
            due = today
        else:
            due = card.due.astimezone(timezone.utc).date()

        if due > today:
            continue  # not due yet — not surfaced

        reason = "overdue" if due < today else "due"
        reviews.append(
            {
                "unitId": unit_id,
                "title": title,
                "dueIn": _format_due_in(due, today),
                "reason": reason,
            }
        )

    # Recurring traps are real pegadinha history, surfaced for re-exposure.
    for pitfall in pitfalls[:1]:
        reviews.append(
            {
                "unitId": pitfall.get("id", "P-000"),
                "title": pitfall.get("description", "Recurring trap"),
                "dueIn": "today",
                "reason": "recurring-trap",
            }
        )

    return reviews
