#!/usr/bin/env python3
"""plan_recompute.py — §4.2 entry point, sole writer of plan.json. A pure
function of the curriculum graph, state.json, and the ledger; runs after every
gate verdict and review event; appends plan_recomputed with a plain-word
diff_summary. Re-running with an already-recorded trigger does not double-apply.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))

import _core
import _state


def _emit(obj: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


def _id_list(ids: list[str]) -> str:
    return "[" + ",".join(ids) + "]"


def _diff_summary(prev: dict[str, Any] | None, new: dict[str, Any], state: dict[str, Any]) -> str:
    clauses: list[str] = []
    prev_status: dict[str, str] = {}
    if prev:
        for m in prev["modules"]:
            for c in m["concepts"]:
                prev_status[c["concept_id"]] = c["status"]
    # concept status changes, in published order (modules already ordered)
    for m in new["modules"]:
        for c in m["concepts"]:
            cid = c["concept_id"]
            old = prev_status.get(cid, "LOCKED")
            if old != c["status"]:
                clause = f"{cid} {old}->{c['status']}"
                if c["status"] == "MASTERED":
                    nts = state["concepts"][cid]["next_review_ts"]
                    if nts:
                        clause += f", review {nts[:10]}"
                clauses.append(clause)
    if prev:
        om, nm = prev["counts"]["mastered"], new["counts"]["mastered"]
        if om != nm:
            clauses.append(f"mastered {om}->{nm}")
        if prev["next_available"] != new["next_available"]:
            clauses.append(f"next_available {_id_list(prev['next_available'])}->{_id_list(new['next_available'])}")
    else:
        clauses.append(f"mastered 0->{new['counts']['mastered']}")
    return "; ".join(clauses)


def main() -> None:
    args = _core.read_args()
    state_dir = Path(_core.require(args, "state_dir"))
    skill_dir = Path(_core.require(args, "skill_dir"))
    curriculum = json.loads((skill_dir / "curriculum.json").read_text(encoding="utf-8"))

    with _core.state_lock(state_dir):
        state = _core.read_json(state_dir / "state.json")
        ledger = _core.read_ledger(state_dir)
        prev = None
        plan_path = state_dir / "plan.json"
        if plan_path.is_file():
            prev = json.loads(plan_path.read_text(encoding="utf-8"))
        plan_version = (prev["plan_version"] + 1) if prev else 1
        if not ledger:
            _core.die("plan_recompute requires a triggering verdict or review event", 1)
        trigger = ledger[-1]["event_id"]
        now = _core.mint_ts(_core.ledger_line_count(state_dir))

        new_plan = _state.build_plan(state, curriculum, plan_version, trigger, generated_at=now)
        diff = _diff_summary(prev, new_plan, state)
        _core.atomic_write_json(plan_path, new_plan)
        _core.append_event(state_dir, "plan_recomputed", state["session"].get("current_concept"), {
            "plan_version": plan_version, "diff_summary": diff, "trigger_event_id": trigger})
        _emit({"ok": True, "plan_version": plan_version,
               "next_available": new_plan["next_available"], "due_reviews": new_plan["due_reviews"],
               "diff_summary": diff})


if __name__ == "__main__":
    main()
