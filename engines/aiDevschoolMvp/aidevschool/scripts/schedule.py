#!/usr/bin/env python3
"""schedule.py — §4.2 entry point and the §5.3 spaced-repetition engine. Writes
next_review_ts on a mastery-completing pass, fires review_due transitions, and
emits nudge payloads (never messages). Re-running with identical input MUST NOT
double-apply (idempotency keys, §5.3)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

import learner.gate.core as _core
import learner.gate.state as _state


def _emit(obj: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


def _in_active_hours(now, active):
    hhmm = now.strftime("%H:%M")
    start, end = active["start"], active["end"]
    return (start <= hhmm <= end) if start <= end else (hhmm >= start or hhmm <= end)


def main() -> None:
    args = _core.read_args()
    state_dir = Path(_core.require(args, "state_dir"))
    skill_dir = Path(_core.require(args, "skill_dir"))
    curriculum = json.loads((skill_dir / "curriculum.json").read_text(encoding="utf-8"))

    with _core.state_lock(state_dir):
        state = _core.read_json(state_dir / "state.json")
        ledger = _core.read_ledger(state_dir)
        keys = _core.idempotency_keys(state_dir)
        now = _core.parse_iso(_core.mint_ts(_core.ledger_line_count(state_dir)))

        # most recent state_transition to MASTERED per concept (for review_scheduled trigger)
        mastered_trigger: dict[str, str] = {}
        for ev in ledger:
            if ev["type"] == "state_transition" and ev["payload"].get("to") == "MASTERED":
                mastered_trigger[ev["concept_id"]] = ev["event_id"]

        due: list[dict[str, Any]] = []
        # 1. schedule any mastery-completing pass not yet scheduled
        for r in curriculum:
            cid = r["id"]
            c = state["concepts"][cid]
            if c["status"] == "MASTERED" and c["next_review_ts"] is None and c["last_pass_ts"]:
                target = c["target_days_effective"] or r["target_retention_days"]
                c["target_days_effective"] = target
                next_ts = _state.schedule_next_review(c, c["last_pass_ts"])
                c["next_review_ts"] = next_ts
                gap = _core.gap_days(target)
                _core.append_event(state_dir, "review_scheduled", cid, {
                    "target_days_effective": target, "gap_days": gap, "next_review_ts": next_ts,
                    "trigger_event_id": mastered_trigger.get(cid)})

        # 2. fire review_due transitions (idempotent on review_due|cid|next_review_ts)
        for r in curriculum:
            cid = r["id"]
            c = state["concepts"][cid]
            if c["status"] == "MASTERED" and c["next_review_ts"] and _core.parse_iso(c["next_review_ts"]) <= now:
                idem = f"review_due|{cid}|{c['next_review_ts']}"
                if f"idem_key|{idem}" not in keys:
                    out = _state.t_review_due(state, cid)
                    if out[0] == "moved":
                        _core.append_event(state_dir, "review_due", cid, {
                            "next_review_ts": c["next_review_ts"], "idem_key": idem})
                        due.append({"concept_id": cid, "due_ts": c["next_review_ts"]})

        # 3. nudge payload: <=1/day, only in active_hours, never a message
        nudge_payloads: list[dict[str, Any]] = []
        today = now.date().isoformat()
        if due and _in_active_hours(now, state["learner"]["active_hours"]) and state.get("last_nudge_date") != today:
            nudge_payloads = [{"concept_id": due[0]["concept_id"], "kind": "review_nudge"}]
            state["last_nudge_date"] = today

        _core.atomic_write_json(state_dir / "state.json", state)

        # next_due_ts: earliest pending review among MASTERED with a future next_review_ts
        future = [c["next_review_ts"] for c in state["concepts"].values()
                  if c["status"] == "MASTERED" and c["next_review_ts"] and _core.parse_iso(c["next_review_ts"]) > now]
        next_due_ts = min(future) if future else None
        _emit({"ok": True, "due": due, "nudge_payloads": nudge_payloads, "next_due_ts": next_due_ts})


if __name__ == "__main__":
    main()
