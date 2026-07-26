"""Public learner state machine and plan projection.

Holds the §5 state machine (six states, eight transitions), state.json init,
availability computation, and the §7.2 plan.json projection. Pure functions:
(entry scripts acquire the §8.3.1 lock, call these, and atomically commit).
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from learner.gate.core import parse_iso, utc_now_iso
from .state_transitions import (
    ATTEMPTED,
    AVAILABLE,
    IN_PROGRESS,
    LOCKED,
    MASTERED,
    REVIEW_DUE,
    _prereqs_mastered,
    assessment_role as assessment_role,
    expected_attempt_id as expected_attempt_id,
    primary_pass_count as primary_pass_count,
    schedule_next_review as schedule_next_review,
    t_attempt as t_attempt,
    t_lesson_start as t_lesson_start,
    t_review_due as t_review_due,
    t_unlock as t_unlock,
    t_verdict_fail as t_verdict_fail,
    t_verdict_pass as t_verdict_pass,
)

STATUS_WORD = {
    LOCKED: "Locked",
    AVAILABLE: "Available",
    IN_PROGRESS: "In progress",
    ATTEMPTED: "In progress",
    MASTERED: "Mastered",
    REVIEW_DUE: "Review due",
}

MODULE_TITLES = {
    "M1": "What AI is",
    "M2": "How AI learns from data",
    "M3": "Generative AI and LLMs",
    "M4": "Using AI critically",
    "M5": "Using AI responsibly",
    "M6": "AI at work and in society",
}


def _empty_concept() -> dict[str, Any]:
    gp: dict[str, Any] = {
        "consecutive_passes": 0,
        "last_pass_ts": None,
        "asked_item_ids": [],
    }
    return {
        "status": LOCKED,
        "scaffold_level": None,
        "attempts": 0,
        "failures_this_session": 0,
        "deferred": False,
        "gate_progress": gp,
        "last_pass_ts": None,
        "next_review_ts": None,
        "target_days_effective": None,
    }


def initial_state(
    curriculum: list[dict[str, Any]], learner: dict[str, Any]
) -> dict[str, Any]:
    """Fresh learner state: a concept is AVAILABLE iff it has no prerequisites,
    else LOCKED (nothing is MASTERED yet). Session idle."""
    concepts: dict[str, Any] = {}
    for rec in curriculum:
        c = _empty_concept()
        if not rec["prerequisites"]:
            c["status"] = AVAILABLE
        concepts[rec["id"]] = c
    return {
        "learner": learner,
        "concepts": concepts,
        "session": {
            "phase": "idle",
            "current_concept": None,
            "pending_gate_id": None,
            "attempts_this_session": 0,
        },
        "last_nudge_date": None,
    }


def next_available_frontier(
    state: dict[str, Any], curriculum_list: list[dict[str, Any]]
) -> list[str]:
    """The plan's next_available: the single frontier concept (first not-yet-
    learned in published order), shown only if it is ready to start — status
    AVAILABLE, or LOCKED with every prerequisite MASTERED. In-flight or
    prereq-blocked frontier -> []. At most one element (§7.2, §12.2 diffs)."""
    by_id = {r["id"]: r for r in curriculum_list}
    for r in curriculum_list:
        c = state["concepts"][r["id"]]
        if c["status"] in (MASTERED, REVIEW_DUE):
            continue
        if c["status"] == AVAILABLE:
            return [r["id"]]
        if c["status"] == LOCKED and _prereqs_mastered(state, by_id, r["id"]):
            return [r["id"]]
        return []  # frontier is in-flight or prereq-blocked
    return []


def available_ids(
    state: dict[str, Any], curriculum_list: list[dict[str, Any]]
) -> list[str]:
    """Concepts EFFECTIVELY available in published order: status AVAILABLE, or
    LOCKED with every prerequisite MASTERED (unlock candidates)."""
    by_id = {r["id"]: r for r in curriculum_list}
    out = []
    for r in curriculum_list:
        c = state["concepts"][r["id"]]
        if c["status"] == AVAILABLE or (
            c["status"] == LOCKED and _prereqs_mastered(state, by_id, r["id"])
        ):
            out.append(r["id"])
    return out


def _effective_status(state: dict[str, Any], by_id: dict[str, Any], cid: str) -> str:
    c = state["concepts"][cid]
    if c["status"] == LOCKED and _prereqs_mastered(state, by_id, cid):
        return AVAILABLE
    return c["status"]


def next_available_id(
    state: dict[str, Any], curriculum_list: list[dict[str, Any]]
) -> str | None:
    ids = available_ids(state, curriculum_list)
    return ids[0] if ids else None


def compute_available(
    state: dict[str, Any], curriculum_list: list[dict[str, Any]]
) -> list[str]:
    """LOCKED concepts whose prerequisites are now all MASTERED (unlock candidates)."""
    by_id = {r["id"]: r for r in curriculum_list}
    out = []
    for r in curriculum_list:
        cid = r["id"]
        if state["concepts"][cid]["status"] == LOCKED and _prereqs_mastered(
            state, by_id, cid
        ):
            out.append(cid)
    return out


# ---------------------------------------------------------------------------
# §7.2 plan.json projection
# ---------------------------------------------------------------------------
def build_plan(
    state: dict[str, Any],
    curriculum_list: list[dict[str, Any]],
    plan_version: int,
    trigger_event_id: str,
    generated_at: str | None = None,
) -> dict[str, Any]:
    generated_at = generated_at or utc_now_iso()
    concepts = state["concepts"]
    mastered = sum(1 for c in concepts.values() if c["status"] == MASTERED)
    in_progress = sum(
        1 for c in concepts.values() if c["status"] in (IN_PROGRESS, ATTEMPTED)
    )
    review_due = sum(1 for c in concepts.values() if c["status"] == REVIEW_DUE)
    total = len(concepts)
    counts = {
        "mastered": mastered,
        "in_progress": in_progress,
        "review_due": review_due,
        "remaining": total - mastered - in_progress - review_due,
    }
    next_avail = next_available_frontier(state, curriculum_list)

    # due reviews within 7 days of generated_at, ascending
    now = parse_iso(generated_at)
    horizon = now + timedelta(days=7)
    due = []
    for cid, c in concepts.items():
        nts = c.get("next_review_ts")
        if c["status"] in (MASTERED, REVIEW_DUE) and nts:
            if parse_iso(nts) <= horizon:
                due.append({"concept_id": cid, "due_ts": nts})
    due.sort(key=lambda d: d["due_ts"])

    # group by module, published order within module. Status is the EFFECTIVE
    # status: LOCKED with all prerequisites MASTERED projects as AVAILABLE.
    by_id = {r["id"]: r for r in curriculum_list}
    modules: dict[str, list[dict[str, Any]]] = {m: [] for m in MODULE_TITLES}
    for r in curriculum_list:
        c = concepts[r["id"]]
        eff = _effective_status(state, by_id, r["id"])
        modules[r["module"]].append(
            {
                "concept_id": r["id"],
                "title": r["title"],
                "status": eff,
                "status_word": STATUS_WORD[eff],
                "scaffold_level": c["scaffold_level"],
                "attempts": c["attempts"],
                "next_review_ts": c["next_review_ts"],
            }
        )
    module_list = [
        {"module": m, "title": MODULE_TITLES[m], "concepts": modules[m]}
        for m in sorted(MODULE_TITLES)
        if modules[m]
    ]
    return {
        "plan_version": plan_version,
        "generated_at": generated_at,
        "trigger_event_id": trigger_event_id,
        "counts": counts,
        "next_available": next_avail,
        "due_reviews": due,
        "modules": module_list,
    }
