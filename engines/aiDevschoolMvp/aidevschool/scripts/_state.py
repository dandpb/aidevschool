
from __future__ import annotations

from datetime import timedelta
from typing import Any

import importlib as _importlib
_core = _importlib.import_module("_core")
gap_days, parse_iso, utc_now_iso = _core.gap_days, _core.parse_iso, _core.utc_now_iso

LOCKED, AVAILABLE, IN_PROGRESS, ATTEMPTED, MASTERED, REVIEW_DUE = (
    "LOCKED", "AVAILABLE", "IN_PROGRESS", "ATTEMPTED", "MASTERED", "REVIEW_DUE",
)

STATUS_WORD = {
    LOCKED: "Locked", AVAILABLE: "Available", IN_PROGRESS: "In progress",
    ATTEMPTED: "In progress", MASTERED: "Mastered", REVIEW_DUE: "Review due",
}

MODULE_TITLES = {
    "M1": "What AI is", "M2": "How AI learns from data",
    "M3": "Generative AI and LLMs", "M4": "Using AI critically",
    "M5": "Using AI responsibly", "M6": "AI at work and in society",
}


def expected_attempt_id(cid: str, attempt_no: int) -> str:
    return f"att_{cid.lower()}_{attempt_no:04d}"


def _empty_concept() -> dict[str, Any]:
    gp: dict[str, Any] = {"consecutive_passes": 0, "last_pass_ts": None, "asked_item_ids": []}
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


def initial_state(curriculum: list[dict[str, Any]], learner: dict[str, Any]) -> dict[str, Any]:
    concepts: dict[str, Any] = {}
    for rec in curriculum:
        c = _empty_concept()
        if not rec["prerequisites"]:
            c["status"] = AVAILABLE
        concepts[rec["id"]] = c
    return {
        "learner": learner,
        "concepts": concepts,
        "session": {"phase": "idle", "current_concept": None, "pending_gate_id": None, "attempts_this_session": 0},
        "last_nudge_date": None,
    }


def _prereqs_mastered(state: dict[str, Any], curriculum: dict[str, dict[str, Any]], cid: str) -> bool:
    return all(state["concepts"][p]["status"] == MASTERED for p in curriculum[cid]["prerequisites"])


def next_available_frontier(state: dict[str, Any], curriculum_list: list[dict[str, Any]]) -> list[str]:
    by_id = {r["id"]: r for r in curriculum_list}
    for r in curriculum_list:
        c = state["concepts"][r["id"]]
        if c["status"] in (MASTERED, REVIEW_DUE):
            continue
        if c["status"] == AVAILABLE:
            return [r["id"]]
        if c["status"] == LOCKED and _prereqs_mastered(state, by_id, r["id"]):
            return [r["id"]]
        return []
    return []


def available_ids(state: dict[str, Any], curriculum_list: list[dict[str, Any]]) -> list[str]:
    by_id = {r["id"]: r for r in curriculum_list}
    out = []
    for r in curriculum_list:
        c = state["concepts"][r["id"]]
        if c["status"] == AVAILABLE or (c["status"] == LOCKED and _prereqs_mastered(state, by_id, r["id"])):
            out.append(r["id"])
    return out


def _effective_status(state: dict[str, Any], by_id: dict[str, Any], cid: str) -> str:
    c = state["concepts"][cid]
    if c["status"] == LOCKED and _prereqs_mastered(state, by_id, cid):
        return AVAILABLE
    return c["status"]


def next_available_id(state: dict[str, Any], curriculum_list: list[dict[str, Any]]) -> str | None:
    ids = available_ids(state, curriculum_list)
    return ids[0] if ids else None


def compute_available(state: dict[str, Any], curriculum_list: list[dict[str, Any]]) -> list[str]:
    by_id = {r["id"]: r for r in curriculum_list}
    out = []
    for r in curriculum_list:
        cid = r["id"]
        if state["concepts"][cid]["status"] == LOCKED and _prereqs_mastered(state, by_id, cid):
            out.append(cid)
    return out





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
    in_progress = sum(1 for c in concepts.values() if c["status"] in (IN_PROGRESS, ATTEMPTED))
    review_due = sum(1 for c in concepts.values() if c["status"] == REVIEW_DUE)
    total = len(concepts)
    counts = {
        "mastered": mastered,
        "in_progress": in_progress,
        "review_due": review_due,
        "remaining": total - mastered - in_progress - review_due,
    }
    next_avail = next_available_frontier(state, curriculum_list)


    now = parse_iso(generated_at)
    horizon = now + timedelta(days=7)
    due = []
    for cid, c in concepts.items():
        nts = c.get("next_review_ts")
        if c["status"] in (MASTERED, REVIEW_DUE) and nts:
            if parse_iso(nts) <= horizon:
                due.append({"concept_id": cid, "due_ts": nts})
    due.sort(key=lambda d: d["due_ts"])



    by_id = {r["id"]: r for r in curriculum_list}
    modules: dict[str, list[dict[str, Any]]] = {m: [] for m in MODULE_TITLES}
    for r in curriculum_list:
        c = concepts[r["id"]]
        eff = _effective_status(state, by_id, r["id"])
        modules[r["module"]].append({
            "concept_id": r["id"],
            "title": r["title"],
            "status": eff,
            "status_word": STATUS_WORD[eff],
            "scaffold_level": c["scaffold_level"],
            "attempts": c["attempts"],
            "next_review_ts": c["next_review_ts"],
        })
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









def t_unlock(state, curriculum_list, cid):
    by_id = {r["id"]: r for r in curriculum_list}
    c = state["concepts"][cid]
    if c["status"] != LOCKED:
        return ("noop", "not locked")
    if not _prereqs_mastered(state, by_id, cid):
        return ("reject", f"prerequisites not mastered for {cid}")
    c["status"] = AVAILABLE
    return ("moved", (LOCKED, AVAILABLE))


def t_lesson_start(state, cid, scaffold_level):
    c = state["concepts"][cid]
    if c["status"] != AVAILABLE:
        return ("reject", f"lesson_start on {cid} in state {c['status']}")
    if c["deferred"]:
        return ("reject", f"{cid} is deferred until a new session")
    if state["session"]["phase"] != "idle":
        return ("reject", f"lesson_start requires idle phase, got {state['session']['phase']}")
    c["status"] = IN_PROGRESS
    c["scaffold_level"] = scaffold_level
    state["session"]["phase"] = "awaiting_attempt"
    state["session"]["current_concept"] = cid
    return ("moved", (AVAILABLE, IN_PROGRESS))


def t_attempt(state, cid, attempt_id, ledger_keys, *, review=False):
    c = state["concepts"][cid]

    if review:
        if c["status"] != REVIEW_DUE:
            return ("reject", f"attempt on {cid} in state {c['status']}, expected REVIEW_DUE")
    else:


        if c["status"] not in (IN_PROGRESS, ATTEMPTED):
            return ("reject", f"attempt on {cid} in state {c['status']}, expected IN_PROGRESS or ATTEMPTED")
    if state["session"]["phase"] != "awaiting_attempt":
        return ("reject", f"attempt requires awaiting_attempt phase, got {state['session']['phase']}")
    if f"attempt_id|{attempt_id}" in ledger_keys:
        return ("noop", "duplicate attempt_id")

    transitioned = False
    if not review and c["status"] == IN_PROGRESS:
        c["status"] = ATTEMPTED
        transitioned = True
    c["attempts"] += 1
    state["session"]["phase"] = "feedback"
    state["session"]["attempts_this_session"] += 1
    if review:
        return ("noop", "review attempt recorded (no status transition)")
    if transitioned:
        return ("moved", (IN_PROGRESS, ATTEMPTED))
    return ("noop", "continued attempt on ATTEMPTED (no status transition)")


def t_verdict_pass(state, cid, *, gate_contract_complete: bool, review: bool):
    c = state["concepts"][cid]
    if review:
        if c["status"] != REVIEW_DUE:
            return ("reject", f"review_pass on {cid} in state {c['status']}")
        c["status"] = MASTERED
        c["scaffold_level"] = None
        c["target_days_effective"] = min(2 * (c["target_days_effective"] or 1), 365)
        return ("moved", (REVIEW_DUE, MASTERED))
    if c["status"] != ATTEMPTED:
        return ("reject", f"verdict_pass on {cid} in state {c['status']}")
    if not gate_contract_complete:
        return ("noop", "gate contract incomplete (first G3 pass; no row)")
    c["status"] = MASTERED
    c["scaffold_level"] = None
    return ("moved", (ATTEMPTED, MASTERED))


def t_verdict_fail(state, cid, *, review: bool, curriculum_target: int):
    c = state["concepts"][cid]
    expect = REVIEW_DUE if review else ATTEMPTED

    if c["status"] != expect:
        return ("reject", f"verdict_fail on {cid} in state {c['status']}, expected {expect}")

    c["scaffold_level"] = max(1, (c["scaffold_level"] or 1) - 1)
    c["failures_this_session"] += 1
    if c["failures_this_session"] >= 2:
        c["deferred"] = True
    if review:
        c["status"] = IN_PROGRESS
        c["target_days_effective"] = curriculum_target
        return ("moved", (REVIEW_DUE, IN_PROGRESS))
    c["status"] = IN_PROGRESS
    return ("moved", (ATTEMPTED, IN_PROGRESS))


def t_review_due(state, cid):
    c = state["concepts"][cid]
    if c["status"] != MASTERED:
        return ("reject", f"review_due on {cid} in state {c['status']}")
    c["status"] = REVIEW_DUE
    return ("moved", (MASTERED, REVIEW_DUE))





def schedule_next_review(c: dict[str, Any], last_pass_ts: str) -> str:
    t = c["target_days_effective"]
    gap = gap_days(t)
    from datetime import timedelta as _td

    return (parse_iso(last_pass_ts) + _td(days=gap)).replace(microsecond=0).isoformat().replace("+00:00", "Z")







def primary_pass_count(state, ledger, registry, skill_dir, cid, llm_enabled) -> int:
    import json as _json
    binding = registry["concept_bindings"][cid]
    prim = binding["primary"]
    served = "G3" if (prim["gate_id"] == "G4" and not llm_enabled) else prim["gate_id"]
    if served == "G3":
        return state["concepts"][cid]["gate_progress"]["consecutive_passes"]
    prim_rubric = None
    if prim["gate_id"] == "G4":
        prim_rubric = _json.loads((skill_dir / prim["definition"]).read_text(encoding="utf-8")).get("rubric_id")
    for ev in ledger:
        if ev["type"] != "verdict_issued":
            continue
        p = ev["payload"]
        if p.get("concept_id") != cid or p.get("gate_id") != prim["gate_id"] or p.get("verdict") != "pass":
            continue
        if prim["gate_id"] == "G4":
            if p["evidence"]["verifier"].get("rubric_id") == prim_rubric:
                return 1
        else:
            return 1
    return 0


def assessment_role(state, ledger, registry, skill_dir, cid, rec, llm_enabled) -> str:
    if not rec["teach_back"]:
        return "primary"
    if state["concepts"][cid]["gate_progress"].get("teach_back_passed"):
        return "primary"
    if primary_pass_count(state, ledger, registry, skill_dir, cid, llm_enabled) >= 1:
        return "teach_back"
    return "primary"
