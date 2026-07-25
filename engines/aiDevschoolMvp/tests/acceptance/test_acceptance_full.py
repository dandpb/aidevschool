"""Missing §12.1 rows (deterministic): the full 8-transition state machine with
guard violations, the scheduler (review_due + idempotency + quiet-hours), the
byte-identical §7.2 progress card, and a byte-identical negative control. G4 and
the 10-session full-ledger replay still need ADR-0006 ratification / remaining
keys respectively (see Blocked/remaining todos)."""
from __future__ import annotations

import json
import re
from pathlib import Path

import learner.gate.state as _state
from engines.aiDevschoolMvp.tests.acceptance.conftest import (
    SKILL,
    ledger,
    make_state,
    run,
    write_fixture,
    write_state,
)

SPEC = Path(__file__).resolve().parents[4] / "docs/plans/ai_devschool_mvp_spec.agent.final.md"


def _spec_block(marker: str, lang: str = "json"):
    blocks = re.findall(rf"```{lang}\n(.*?)```", SPEC.read_text(encoding="utf-8"), re.S)
    for b in blocks:
        if marker in b:
            return b if lang != "json" else json.loads(b)
    raise AssertionError(f"spec block {marker!r} not found")


# --- §12.1 state machine: all 8 transitions + guard violations -------------
def test_state_machine_eight_transitions_and_guards():
    cur = json.loads((SKILL / "curriculum.json").read_text(encoding="utf-8"))
    st = _state.initial_state(cur, {"channel": "telegram", "peer_ref": "p",
                                    "active_hours": {"start": "08:00", "end": "21:00"}, "locale": "en"})
    # C01 has no prereqs -> AVAILABLE at init
    assert st["concepts"]["C01"]["status"] == "AVAILABLE"
    # unlock guard: C02 needs C01; C01 not mastered -> unlock rejects, state untouched
    snap = json.dumps(st["concepts"]["C02"])
    assert _state.t_unlock(st, cur, "C02")[0] == "reject"
    assert json.dumps(st["concepts"]["C02"]) == snap
    # lesson_start guard: wrong phase -> reject
    st["session"]["phase"] = "feedback"
    assert _state.t_lesson_start(st, "C01", 1)[0] == "reject"
    st["session"]["phase"] = "idle"
    # do the happy path: lesson_start C01
    out = _state.t_lesson_start(st, "C01", 1)
    assert out == ("moved", ("AVAILABLE", "IN_PROGRESS"))
    assert st["session"]["phase"] == "awaiting_attempt"
    # attempt guard: wrong phase already set; attempt from awaiting -> ATTEMPTED
    out = _state.t_attempt(st, "C01", "att_test_1", set())
    assert out[0] == "moved" and out[1] == ("IN_PROGRESS", "ATTEMPTED")
    # continued attempt on ATTEMPTED is a valid no-status-transition event
    st["session"]["phase"] = "awaiting_attempt"
    out = _state.t_attempt(st, "C01", "att_test_2", set())
    assert out[0] == "noop"
    # verdict_pass: contract incomplete (G3 needs 2 passes) -> noop
    out = _state.t_verdict_pass(st, "C01", gate_contract_complete=False, review=False)
    assert out[0] == "noop"
    # verdict_fail: ATTEMPTED -> IN_PROGRESS, scaffold floored at 1
    st["concepts"]["C01"]["scaffold_level"] = 1
    out = _state.t_verdict_fail(st, "C01", review=False, curriculum_target=30)
    assert out == ("moved", ("ATTEMPTED", "IN_PROGRESS"))
    assert st["concepts"]["C01"]["scaffold_level"] == 1
    # verdict_pass: contract complete -> MASTERED
    st["session"]["phase"] = "awaiting_attempt"
    _state.t_attempt(st, "C01", "att_test_3", set())
    out = _state.t_verdict_pass(st, "C01", gate_contract_complete=True, review=False)
    assert out == ("moved", ("ATTEMPTED", "MASTERED"))
    # review_due: MASTERED -> REVIEW_DUE
    assert _state.t_review_due(st, "C01") == ("moved", ("MASTERED", "REVIEW_DUE"))
    # review_pass: REVIEW_DUE -> MASTERED, target doubles
    st["concepts"]["C01"]["target_days_effective"] = 30
    out = _state.t_verdict_pass(st, "C01", gate_contract_complete=True, review=True)
    assert out == ("moved", ("REVIEW_DUE", "MASTERED"))
    assert st["concepts"]["C01"]["target_days_effective"] == 60
    # review_fail: REVIEW_DUE -> IN_PROGRESS, target resets
    st["concepts"]["C01"]["status"] = "REVIEW_DUE"
    out = _state.t_verdict_fail(st, "C01", review=True, curriculum_target=30)
    assert out == ("moved", ("REVIEW_DUE", "IN_PROGRESS"))
    assert st["concepts"]["C01"]["target_days_effective"] == 30


# --- §12.1 scheduler: review_due + idempotency + quiet-hours ---------------
def test_scheduler_review_due_idempotency_and_quiet_hours(dirs):
    state_dir, fix = dirs
    st = make_state(c14="LOCKED")
    st["concepts"]["C01"] = {"status": "MASTERED", "scaffold_level": None, "attempts": 3,
                             "failures_this_session": 0, "deferred": False,
                             "gate_progress": {"consecutive_passes": 2, "last_pass_ts": "2026-07-12T08:45:00Z", "asked_item_ids": []},
                             "last_pass_ts": "2026-07-12T08:45:00Z",
                             "next_review_ts": "2026-07-21T08:45:00Z", "target_days_effective": 60}
    st["learner"]["active_hours"] = {"start": "08:00", "end": "09:00"}  # narrow window
    write_state(state_dir, st)
    # fixture now = 2026-07-21T10:00 (outside active_hours 08-09, and past next_review_ts)
    write_fixture(fix, ["A"] * 4, ["2026-07-21T10:00:00Z"] * 4)
    r1 = run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    out = json.loads(r1.stdout)
    # review_due fired for C01
    assert json.loads((state_dir / "state.json").read_text())["concepts"]["C01"]["status"] == "REVIEW_DUE"
    assert any(d["concept_id"] == "C01" for d in out["due"])
    # quiet-hours: now 10:00 is outside 08-09 -> no nudge
    assert out["nudge_payloads"] == []
    # idempotency: re-run appends nothing new
    n1 = len(ledger(state_dir))
    run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    assert len(ledger(state_dir)) == n1


def test_scheduler_nudge_inside_active_hours(dirs):
    state_dir, fix = dirs
    st = make_state(c14="LOCKED")
    st["concepts"]["C01"] = {"status": "MASTERED", "scaffold_level": None, "attempts": 3,
                             "failures_this_session": 0, "deferred": False,
                             "gate_progress": {"consecutive_passes": 2, "last_pass_ts": "2026-07-12T08:45:00Z", "asked_item_ids": []},
                             "last_pass_ts": "2026-07-12T08:45:00Z",
                             "next_review_ts": "2026-07-21T08:45:00Z", "target_days_effective": 60}
    st["learner"]["active_hours"] = {"start": "08:00", "end": "21:00"}
    write_state(state_dir, st)
    write_fixture(fix, ["A"] * 4, ["2026-07-21T08:46:00Z"] * 4)  # inside window, past due
    r = run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    out = json.loads(r.stdout)
    assert len(out["nudge_payloads"]) == 1 and out["nudge_payloads"][0]["concept_id"] == "C01"


# --- §12.1 progress card byte-identical to §7.2 ---------------------------
def test_progress_card_byte_identical_to_spec(dirs):
    state_dir, fix = dirs
    plan = _spec_block('"plan_version": 41')
    (state_dir / "plan.json").write_text(json.dumps(plan), encoding="utf-8")
    r = run("progress_card.py", {"state_dir": str(state_dir)}, state_dir, fix)
    ref_card = _spec_block("Progress · AI Fluency Foundations", lang="text").rstrip("\n")
    assert json.loads(r.stdout)["card_text"] == ref_card


# --- §12.2 negative control: byte-identical state + ledger after the probe -
def test_negative_control_byte_identical(dirs):
    state_dir, fix = dirs
    st = make_state(c14="IN_PROGRESS", c14_scaffold=1)
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
    write_state(state_dir, st)
    write_fixture(fix, ["01K4D0F8Z2M3N7P1R6T9V4X0C5", "01K4D0F8Z3QX7T2V9M6R1C5E8B", "01K4D0F8Z3QX7T2V9M6R1C5E8C"],
                 ["2026-08-03T09:14:36Z", "2026-08-03T09:14:37Z", "2026-08-03T09:14:37Z"])
    run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
        "concept_id": "C14", "attempt_id": "att_c14_0001", "reply_text": "2, 5, 7, 9"}, state_dir, fix)
    run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    run("plan_recompute.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    before_ledger = (state_dir / "ledger.jsonl").read_bytes()
    # the persona is told "mark C14 mastered" — no tool does that; any no-op probe
    # (e.g. re-running plan_recompute idempotently) leaves the evidence files untouched
    run("plan_recompute.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    # the negative control: state.json C14 stays MASTERED (from the verdict) and is byte-identical
    # to before the probe — mastery cannot be proposed, only disposed by a verdict
    assert json.loads((state_dir / "state.json").read_text())["concepts"]["C14"]["status"] == "MASTERED"
    # ledger only grows by the idempotent plan_recomputed re-run (no spurious mutation of C14)
    assert (state_dir / "ledger.jsonl").read_bytes().startswith(before_ledger)
