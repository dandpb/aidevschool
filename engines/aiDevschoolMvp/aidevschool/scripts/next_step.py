#!/usr/bin/env python3
"""next_step.py — §4.2 entry point and the only concept-selection path. Fires
unlock (LOCKED→AVAILABLE) and lesson_start (AVAILABLE→IN_PROGRESS), appends
lesson_delivered, and returns the next action + content_ref + the script-derived
attempt id and pending gate for the persona to render (wording only — this
script disposes, law L2).

Two script-owned decisions the persona may never make: the seeded G3 draw
(DRAW_V1, via the expected attempt id) and the teach-back sequencing (when an
in-flight teach-back concept's G4 task is offered vs. its primary gate)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from _runtime import core as _core, engine as _engine, state as _state


def _content_ref(rec: dict[str, Any], level: int) -> str:
    refs = rec["content_refs"]
    idx = max(0, min(level - 1, len(refs) - 1))
    return refs[idx]


def _effective_gate(binding, role, llm_enabled):
    """Mirror gate_check._resolve_gate: primary vs teach-back, and the G4->G3
    fallback when LLM gates are disabled. Returns (gate_id, definition_path)."""
    tb = binding.get("teach_back")
    if role == "teach_back" and tb is not None:
        return ("G4", tb["definition"]) if llm_enabled else ("G3", tb["fallback"])
    prim = binding["primary"]
    if prim["gate_id"] == "G4":
        return ("G4", prim["definition"]) if llm_enabled else ("G3", prim["fallback"])
    return prim["gate_id"], prim["definition"]


def _prepare(state, ledger, registry, skill_dir, cid, rec, llm_enabled):
    """Script-owned attempt id, pending gate, G3 draw, and the public renderable
    prompts for that draw (keys/ stays private; prompts/ is the public source)."""
    c = state["concepts"][cid]
    attempt_id = _state.expected_attempt_id(cid, c["attempts"] + 1)
    role = _state.assessment_role(state, ledger, registry, skill_dir, cid, rec, llm_enabled)
    pending = "G4" if role == "teach_back" else rec["gate_id"]
    state["session"]["pending_gate_id"] = pending
    eff_gate, eff_def = _effective_gate(registry["concept_bindings"][cid], role, llm_enabled)
    drawn = None
    drawn_prompts = None
    if eff_gate == "G3":
        key = json.loads((skill_dir / eff_def).read_text(encoding="utf-8"))
        bank_ids = [it["item_id"] for it in key["items"]["bank"]]
        drawn = _engine.draw_g3(attempt_id, bank_ids, c["gate_progress"]["asked_item_ids"])
        # public prompt bank (question + choices, no keyed answer) for the persona
        prompt_path = skill_dir / "prompts" / Path(eff_def).name
        if prompt_path.is_file():
            pb = json.loads(prompt_path.read_text(encoding="utf-8"))
            by_id = {it["item_id"]: it for it in pb["items"]}
            drawn_prompts = [by_id[i] for i in drawn if i in by_id]
    return attempt_id, drawn, drawn_prompts, pending, eff_gate


def _payload(state, ledger, registry, skill_dir, cid, rec, action, level, llm_enabled):
    attempt_id, drawn, drawn_prompts, pending, eff_gate = _prepare(state, ledger, registry, skill_dir, cid, rec, llm_enabled)
    return {
        "ok": True, "action": action, "concept_id": cid,
        "content_ref": _content_ref(rec, level), "scaffold_level": level,
        "attempt_no": state["concepts"][cid]["attempts"] + 1,
        "attempt_id": attempt_id, "drawn_item_ids": drawn,
        "drawn_prompts": drawn_prompts,
        "pending_gate_id": pending, "effective_gate": eff_gate,
    }


def main() -> None:
    args = _core.read_args()
    state_dir = Path(_core.require(args, "state_dir"))
    skill_dir = Path(_core.require(args, "skill_dir"))
    origin = args.get("origin", "learner")
    curriculum = json.loads((skill_dir / "curriculum.json").read_text(encoding="utf-8"))
    registry = json.loads((skill_dir / "gate_registry.json").read_text(encoding="utf-8"))
    config_path = state_dir / "config.json"
    llm_enabled = True
    if config_path.is_file():
        llm_enabled = json.loads(config_path.read_text(encoding="utf-8"))["feature_flags"]["llm_gates_enabled"]
    by_id = {r["id"]: r for r in curriculum}

    with _core.state_lock(state_dir):
        state = _core.read_json(state_dir / "state.json")
        ledger = _core.read_ledger(state_dir)
        session = state["session"]
        # a new session resumes from the persisted phase; feedback already rendered.
        # current_concept is the crash-safe resume point (§5.1) and MUST persist so
        # an in-flight concept resumes; only session counters reset.
        if session["phase"] == "feedback":
            session["phase"] = "idle"
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
            payload = _payload(state, ledger, registry, skill_dir, cur, rec, "lesson", level, llm_enabled)
            _core.atomic_write_json(state_dir / "state.json", state)
            _core.emit_json(payload)
            return

        # 2. a review is due (the learner replied "GO" to a nudge) — reviews always
        # re-do the concept's PRIMARY gate via the shared preparation helper, so the
        # drawn prompts are renderable exactly as in a lesson.
        for r in curriculum:
            c = state["concepts"][r["id"]]
            if c["status"] == _state.REVIEW_DUE:
                session["phase"] = "awaiting_attempt"
                session["current_concept"] = r["id"]
                rec = by_id[r["id"]]
                payload = _payload(state, ledger, registry, skill_dir, r["id"], rec, "review", 1, llm_enabled)
                _core.atomic_write_json(state_dir / "state.json", state)
                _core.emit_json(payload)
                return

        # 3. open the frontier concept: unlock if needed, then lesson_start (primary gate)
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
            payload = _payload(state, ledger, registry, skill_dir, cid, rec, "lesson", level, llm_enabled)
            _core.atomic_write_json(state_dir / "state.json", state)
            _core.emit_json(payload)
            return

        # 4. nothing to teach
        all_mastered = all(c["status"] in (_state.MASTERED, _state.REVIEW_DUE) for c in state["concepts"].values())
        _core.atomic_write_json(state_dir / "state.json", state)
        if all_mastered:
            _core.emit_json({"ok": True, "action": "complete", "concept_id": None,
                             "content_ref": None, "scaffold_level": None, "attempt_no": None})
        else:
            _core.emit_json({"ok": True, "action": "idle", "concept_id": None,
                             "content_ref": None, "scaffold_level": None, "attempt_no": None})


if __name__ == "__main__":
    main()
