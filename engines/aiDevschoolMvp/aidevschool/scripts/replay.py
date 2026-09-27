#!/usr/bin/env python3
"""replay.py — §7.1/§7.2 operator tool and the executable proof of law L1. Folds
ledger.jsonl over curriculum.json, rebuilding the per-concept state.json fields
(status, scaffold_level, attempts, gate_progress, target_days_effective,
next_review_ts) into a scratch file — never over state.json — and field-compares
the rebuilt values against live state.json. Any divergence voids the mastery
claim. Session-ephemeral fields are excluded (rendering cache, §5.1).

The assessment role is resolved per verdict: the discriminator persisted on
teach-back attempt_recorded events (required for LLM-off G3 fallbacks, which are
otherwise indistinguishable from a primary quiz), else the G4 rubric task, else
primary. Teach-back passes set teach_back_passed and never touch the primary
G3 streak."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from _runtime import core as _core

FIELDS = ("status", "scaffold_level", "attempts", "gate_progress", "target_days_effective", "next_review_ts")


def _blank() -> dict[str, Any]:
    return {
        "status": "LOCKED", "scaffold_level": None, "attempts": 0,
        "gate_progress": {"consecutive_passes": 0, "last_pass_ts": None, "asked_item_ids": []},
        "target_days_effective": None, "next_review_ts": None,
    }


def _rubric_task(skill_dir: Path, rubric_id: str) -> str | None:
    p = skill_dir / "rubrics" / f"{rubric_id}.json"
    if not p.is_file():
        return None
    return json.loads(p.read_text(encoding="utf-8")).get("task")


def replay(ledger: list[dict[str, Any]], curriculum: list[dict[str, Any]], skill_dir: Path) -> dict[str, Any]:
    by_id = {r["id"]: r for r in curriculum}
    concepts: dict[str, Any] = {}
    for r in curriculum:
        c = _blank()
        if not r["prerequisites"]:
            c["status"] = "AVAILABLE"
        concepts[r["id"]] = c

    attempt_roles: dict[str, str] = {}
    for ev in ledger:
        cid = ev.get("concept_id")
        t = ev["type"]
        p = ev["payload"]
        if cid is None or cid not in concepts:
            continue
        c = concepts[cid]
        if t == "lesson_delivered":
            c["status"] = "IN_PROGRESS"
            c["scaffold_level"] = p.get("scaffold_level")
        elif t == "attempt_recorded":
            # role persisted only on teach-back attempts
            if p.get("assessment_role") == "teach_back":
                attempt_roles[p["attempt_id"]] = "teach_back"
            if p.get("outcome") == "parsed":
                if c["status"] == "IN_PROGRESS":
                    c["status"] = "ATTEMPTED"
                c["attempts"] += 1
        elif t == "verdict_issued":
            gate = p["gate_id"]
            verdict = p["verdict"]
            scores = p["scores"]
            rid = p["evidence"]["verifier"].get("rubric_id") if gate == "G4" else None
            is_teach_back = (attempt_roles.get(p["attempt_id"]) == "teach_back") or (
                bool(rid) and _rubric_task(skill_dir, rid) == "teach_back")
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
            elif to == "IN_PROGRESS" and frm == "REVIEW_DUE":
                c["target_days_effective"] = by_id[cid]["target_retention_days"]
        elif t == "review_scheduled":
            c["target_days_effective"] = p.get("target_days_effective", c["target_days_effective"])
            c["next_review_ts"] = p.get("next_review_ts")
        elif t == "review_due":
            c["status"] = "REVIEW_DUE"
        # session_started / plan_recomputed: no per-concept effect
    return concepts


def main() -> None:
    args = _core.read_args()
    state_dir = Path(_core.require(args, "state_dir"))
    skill_dir = Path(_core.require(args, "skill_dir"))
    curriculum = json.loads((skill_dir / "curriculum.json").read_text(encoding="utf-8"))
    ledger = _core.read_ledger(state_dir)
    rebuilt = replay(ledger, curriculum, skill_dir)
    live = _core.read_json(state_dir / "state.json")

    diffs: list[str] = []
    for cid, rebuilt_c in rebuilt.items():
        live_c = live["concepts"].get(cid)
        if live_c is None:
            diffs.append(f"{cid}: missing in live state")
            continue
        for f in FIELDS:
            if rebuilt_c.get(f) != live_c.get(f):
                diffs.append(f"{cid}.{f}: replay={rebuilt_c.get(f)!r} != live={live_c.get(f)!r}")

    scratch = state_dir / "replay.scratch.json"
    _core.atomic_write_json(scratch, {"concepts": rebuilt})
    if diffs:
        sys.stdout.write(json.dumps({"ok": False, "diffs": diffs, "scratch": str(scratch)}) + "\n")
        sys.exit(2)
    sys.stdout.write(json.dumps({"ok": True, "diffs": [], "concepts": len(rebuilt), "scratch": str(scratch)}) + "\n")


if __name__ == "__main__":
    main()
