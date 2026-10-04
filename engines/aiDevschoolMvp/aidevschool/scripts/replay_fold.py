"""Pure MVP ledger projection; rubric loading and CLI effects live in replay.py."""
from __future__ import annotations

from typing import Any, Collection, Iterator


class MissingRubricTaskError(ValueError):
    """A rubric needed by this ledger was not supplied by the IO adapter."""


def _loaded_rubric_task(tasks: dict[str, str | None], rubric_id: str) -> str | None:
    if rubric_id not in tasks:
        raise MissingRubricTaskError(f"rubric task not loaded: {rubric_id}")
    return tasks[rubric_id]


def _classified_events(
    ledger: list[dict[str, Any]], concept_ids: Collection[str],
) -> Iterator[tuple[dict[str, Any], str, bool, str | None]]:
    """Resolve only persisted roles seen so far, globally by attempt_id."""
    attempt_roles: dict[str, str] = {}
    for ev in ledger:
        cid = ev.get("concept_id")
        kind = ev["type"]
        payload = ev["payload"]
        if cid is None or cid not in concept_ids:
            continue
        persisted_teach_back = False
        rubric_id = None
        if kind == "attempt_recorded" and payload.get("assessment_role") == "teach_back":
            attempt_roles[payload["attempt_id"]] = "teach_back"
        elif kind == "verdict_issued":
            rubric_id = payload["evidence"]["verifier"].get("rubric_id") if payload["gate_id"] == "G4" else None
            persisted_teach_back = attempt_roles.get(payload["attempt_id"]) == "teach_back"
        yield ev, cid, persisted_teach_back, rubric_id


def required_rubric_ids(
    ledger: list[dict[str, Any]], curriculum: list[dict[str, Any]],
) -> list[str]:
    """Necessary G4 lookups, deduplicated in first-use order."""
    concept_ids = {row["id"] for row in curriculum}
    return list(dict.fromkeys(
        rid for _, _, persisted_teach_back, rid in _classified_events(ledger, concept_ids)
        if rid and not persisted_teach_back
    ))


def _blank() -> dict[str, Any]:
    return {
        "status": "LOCKED", "scaffold_level": None, "attempts": 0,
        "gate_progress": {"consecutive_passes": 0, "last_pass_ts": None, "asked_item_ids": []},
        "target_days_effective": None, "next_review_ts": None,
    }


def fold_ledger(ledger: list[dict[str, Any]], curriculum: list[dict[str, Any]], rubric_tasks: dict[str, str | None]) -> dict[str, Any]:
    by_id = {r["id"]: r for r in curriculum}
    concepts: dict[str, Any] = {}
    for r in curriculum:
        c = _blank()
        if not r["prerequisites"]:
            c["status"] = "AVAILABLE"
        concepts[r["id"]] = c

    for ev, cid, persisted_teach_back, rid in _classified_events(ledger, by_id):
        t = ev["type"]
        p = ev["payload"]
        c = concepts[cid]
        if t == "lesson_delivered":
            c["status"] = "IN_PROGRESS"
            c["scaffold_level"] = p.get("scaffold_level")
        elif t == "attempt_recorded":
            if p.get("outcome") == "parsed":
                if c["status"] == "IN_PROGRESS":
                    c["status"] = "ATTEMPTED"
                c["attempts"] += 1
        elif t == "verdict_issued":
            gate = p["gate_id"]
            verdict = p["verdict"]
            scores = p["scores"]
            is_teach_back = persisted_teach_back or (
                bool(rid) and _loaded_rubric_task(rubric_tasks, rid) == "teach_back")
            if is_teach_back:
                if verdict == "pass":
                    c["gate_progress"]["teach_back_passed"] = True  # flag only, never the streak
            elif verdict == "pass":
                if gate == "G3":
                    c["gate_progress"]["consecutive_passes"] = scores.get(
                        "consecutive_passes", c["gate_progress"]["consecutive_passes"])
                    drawn = [it["item_id"] for it in scores.get("items", [])]
                    c["gate_progress"]["asked_item_ids"] = list(
                        dict.fromkeys(c["gate_progress"]["asked_item_ids"] + drawn))
                    c["gate_progress"]["last_pass_ts"] = ev["ts"]  # G3 "last quiz pass" only
            else:
                if gate == "G3":
                    c["gate_progress"]["consecutive_passes"] = 0
        elif t == "state_transition":
            frm, to = p["from"], p["to"]
            c["status"] = to
            if to == "MASTERED":
                c["scaffold_level"] = None
                if frm == "REVIEW_DUE":
                    c["target_days_effective"] = min(2 * (c["target_days_effective"] or 1), 365)
                    c["next_review_ts"] = None  # mirror t_verdict_pass (AID-2687)
            elif to == "IN_PROGRESS" and frm == "REVIEW_DUE":
                c["target_days_effective"] = by_id[cid]["target_retention_days"]
                c["next_review_ts"] = None  # mirror t_verdict_fail (AID-2687)
        elif t == "review_scheduled":
            c["target_days_effective"] = p.get("target_days_effective", c["target_days_effective"])
            c["next_review_ts"] = p.get("next_review_ts")
        elif t == "review_due":
            c["status"] = "REVIEW_DUE"
        # session_started / plan_recomputed: no per-concept effect
    return concepts
