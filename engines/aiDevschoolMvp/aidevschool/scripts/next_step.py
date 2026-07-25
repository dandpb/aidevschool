#!/usr/bin/env python3
"""next_step.py — §4.2 entry point and the only concept-selection path. Fires
unlock (LOCKED→AVAILABLE) and lesson_start (AVAILABLE→IN_PROGRESS), appends
lesson_delivered, and returns the next action + content_ref for the persona to
render (wording only — this script disposes, law L2). Chooses the scaffold level
from the attempt count, never the LLM (§2.2)."""
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


def _content_ref(rec: dict[str, Any], level: int) -> str:
    refs = rec["content_refs"]
    idx = max(0, min(level - 1, len(refs) - 1))
    return refs[idx]


def main() -> None:
    args = _core.read_args()
    state_dir = Path(_core.require(args, "state_dir"))
    skill_dir = Path(_core.require(args, "skill_dir"))
    origin = args.get("origin", "learner")
    curriculum = json.loads((skill_dir / "curriculum.json").read_text(encoding="utf-8"))
    by_id = {r["id"]: r for r in curriculum}

    with _core.state_lock(state_dir):
        state = _core.read_json(state_dir / "state.json")
        session = state["session"]
        # a new session resumes from the persisted phase; feedback already rendered
        if session["phase"] == "feedback":
            session["phase"] = "idle"
            session["current_concept"] = None
            session["attempts_this_session"] = 0
            for c in state["concepts"].values():
                c["failures_this_session"] = 0

        _core.append_event(state_dir, "session_started", session.get("current_concept"),
                           {"session_id": _core.mint_ulid(_core.ledger_line_count(state_dir)), "origin": origin})

        # 1. resume an in-flight concept (lesson or remediation loop open)
        cur = session.get("current_concept")
        if cur and state["concepts"][cur]["status"] in (_state.IN_PROGRESS, _state.ATTEMPTED):
            c = state["concepts"][cur]
            rec = by_id[cur]
            level = c["scaffold_level"] or 1
            session["phase"] = "awaiting_attempt"
            _core.atomic_write_json(state_dir / "state.json", state)
            _emit({"ok": True, "action": "lesson", "concept_id": cur,
                   "content_ref": _content_ref(rec, level), "scaffold_level": level,
                   "attempt_no": c["attempts"] + 1})
            return

        # 2. a review is due (the learner replied "GO" to a nudge)
        for r in curriculum:
            c = state["concepts"][r["id"]]
            if c["status"] == _state.REVIEW_DUE:
                session["phase"] = "awaiting_attempt"
                session["current_concept"] = r["id"]
                session["pending_gate_id"] = by_id[r["id"]]["gate_id"]
                _core.atomic_write_json(state_dir / "state.json", state)
                _emit({"ok": True, "action": "review", "concept_id": r["id"],
                       "content_ref": _content_ref(by_id[r["id"]], 1), "scaffold_level": 1,
                       "attempt_no": c["attempts"] + 1})
                return

        # 3. open the frontier concept: unlock if needed, then lesson_start
        frontier = _state.next_available_frontier(state, curriculum)
        if frontier:
            cid = frontier[0]
            if state["concepts"][cid]["status"] == _state.LOCKED:
                out = _state.t_unlock(state, curriculum, cid)
                if out[0] == "moved":
                    _core.append_event(state_dir, "state_transition", cid,
                                       {"from": out[1][0], "to": out[1][1],
                                        "trigger_event_id": _core.read_ledger(state_dir)[-1]["event_id"]})
            rec = by_id[cid]
            level = 1  # the state machine always serves level 1 first (§2.2)
            out = _state.t_lesson_start(state, cid, level)
            if out[0] == "reject":
                _core.die(out[1], 1)
            lesson_id = f"lesson|{cid}|{_core.mint_ulid(_core.ledger_line_count(state_dir))}"
            _core.append_event(state_dir, "lesson_delivered", cid,
                               {"lesson_id": lesson_id, "content_ref": _content_ref(rec, level),
                                "scaffold_level": level})
            state["session"]["pending_gate_id"] = rec["gate_id"]
            _core.atomic_write_json(state_dir / "state.json", state)
            _emit({"ok": True, "action": "lesson", "concept_id": cid,
                   "content_ref": _content_ref(rec, level), "scaffold_level": level,
                   "attempt_no": 1})
            return

        # 4. nothing to teach
        all_mastered = all(c["status"] in (_state.MASTERED, _state.REVIEW_DUE) for c in state["concepts"].values())
        _core.atomic_write_json(state_dir / "state.json", state)
        if all_mastered:
            _emit({"ok": True, "action": "complete", "concept_id": None,
                   "content_ref": None, "scaffold_level": None, "attempt_no": None})
        else:
            _emit({"ok": True, "action": "idle", "concept_id": None,
                   "content_ref": None, "scaffold_level": None, "attempt_no": None})


if __name__ == "__main__":
    main()
