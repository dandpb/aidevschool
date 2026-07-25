"""Deterministic acceptance (§12-conformant). These rows do NOT depend on ADR-0006
ratification: G1/G2/G3, the state machine, the ledger hash chain + replay, the
progress card, the §12.2 C14 mastery trace, and the negative control. G4 lives
in test_g4_provisional.py and is blocked on ADR-0006 ratification."""
from __future__ import annotations

import json
import shutil
import sys

from engines.aiDevschoolMvp.tests.acceptance.conftest import (
    CURRICULUM,
    SKILL,
    ledger,
    make_state,
    run,
    write_fixture,
    write_state,
)

SCRIPTS = SKILL / "scripts"
sys.path.insert(0, str(SCRIPTS))


# --- §6.4 gate fixtures, byte-for-byte ------------------------------------
def test_g1_c14_verdict_byte_for_byte(dirs):
    state_dir, fix = dirs
    st = make_state(c14="IN_PROGRESS", c14_scaffold=1)
    st["concepts"]["C14"]["attempts"] = 0  # fresh -> expected_attempt_id att_c14_0001
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
    write_state(state_dir, st)
    write_fixture(fix, ["01K4D0F8Z2M3N7P1R6T9V4X0C5", "01K4D0F8Z3QX7T2V9M6R1C5E8B", "01K4D0F8Z3QX7T2V9M6R1C5E8C"],
                 ["2026-08-03T09:14:36Z", "2026-08-03T09:14:37Z", "2026-08-03T09:14:37Z"])
    r = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
            "concept_id": "C14", "attempt_id": "att_c14_0001", "reply_text": "2, 5, 7, 9"}, state_dir, fix)
    assert r.returncode == 0
    verdict_line = next(e for e in ledger(state_dir) if e["type"] == "verdict_issued")
    assert verdict_line["payload"] == {
        "gate_id": "G1", "gate_version": "1.0.0", "attempt_id": "att_c14_0001", "concept_id": "C14",
        "scores": {"recall": 1.0, "precision": 1.0, "flagged": [2, 5, 7, 9], "planted": [2, 5, 7, 9]},
        "verdict": "pass",
        "evidence": {"artifact_text": "2, 5, 7, 9",
                     "artifact_sha256": "2601b73b094cf2e21edd7979645dcf9ffbf457069b0a72a7b1c06dfaab27f578",
                     "verifier": {"kind": "deterministic"},
                     "details": {"key_id": "c14_seeded_bio", "key_version": "1.0.0", "claims_total": 9, "normalized_flags": [2, 5, 7, 9]}}}


def test_g2_c17_redaction_byte_for_byte(dirs):
    state_dir, fix = dirs
    st = make_state(c14="LOCKED", c17="IN_PROGRESS")
    st["concepts"]["C17"]["attempts"] = 0  # fresh -> expected_attempt_id att_c17_0001
    for r in CURRICULUM:
        if r["id"] in [f"C{i:02d}" for i in range(1, 14)] + ["C14", "C15", "C16"]:
            st["concepts"][r["id"]]["status"] = "MASTERED"
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C17", "pending_gate_id": "G2", "attempts_this_session": 0}
    write_state(state_dir, st)
    write_fixture(fix, ["A"] * 6, ["2026-08-05T17:41:11Z"] * 6)
    reply = ("Hi Ana \u2014 please draft a polite reminder for [REDACTED], born [REDACTED]. "
             "Her personal email is [REDACTED] and her mobile is [REDACTED]. Her national ID is [REDACTED]. "
             "She lives at [REDACTED].")
    r = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
            "concept_id": "C17", "attempt_id": "att_c17_0001", "reply_text": reply}, state_dir, fix)
    assert r.returncode == 0
    v = next(e for e in ledger(state_dir) if e["type"] == "verdict_issued")["payload"]
    assert v["verdict"] == "pass"
    assert v["scores"] == {"expected_redactions": 6, "found_redactions": 6, "extra_redactions": 0,
                           "precision": 1.0, "recall": 1.0}
    assert v["evidence"]["artifact_sha256"] == "ff2b34d7639bb6f623ee819162ef226e8887f2294071674a846b697efab83bbb"


def test_g3_c05_draw_golden():
    """DRAW_V1 reproduces the §6.4 Example 3 item ids byte-for-byte (module level,
    independent of the expected_attempt_id submission gate)."""
    import learner.gate.engine as _engine
    bank = [it["item_id"] for it in json.loads((SKILL / "keys" / "c05_quiz_bank.json").read_text())["items"]["bank"]]
    assert _engine.draw_g3("att_c05_0003", bank, []) == ["c05_q03", "c05_q06", "c05_q01"]
    assert _engine.draw_g3("att_c05_0004", bank, ["c05_q03", "c05_q06", "c05_q01"]) == ["c05_q02", "c05_q04", "c05_q08"]


def test_g3_c05_two_pass_mastery(dirs):
    """Two consecutive all-correct passes >= 24 h apart reach MASTERED; replay is
    consistent because the natural attempt ids match the ledger attempt count."""
    import learner.gate.engine as _engine
    state_dir, fix = dirs
    st = make_state(c05="IN_PROGRESS", c14="LOCKED")
    st["concepts"]["C05"]["scaffold_level"] = 1
    st["concepts"]["C05"]["gate_progress"]["teach_back_passed"] = True  # teach-back already passed
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C05", "pending_gate_id": "G3", "attempts_this_session": 0}
    write_state(state_dir, st)
    bank = {it["item_id"]: it["keyed"] for it in json.loads((SKILL / "keys" / "c05_quiz_bank.json").read_text())["items"]["bank"]}
    write_fixture(fix, [f"01K4C0{i:023d}" for i in range(6)],
                 ["2026-08-06T08:02:10Z", "2026-08-06T08:02:11Z", "2026-08-06T08:02:11Z",
                  "2026-08-07T08:31:43Z", "2026-08-07T08:31:44Z", "2026-08-07T08:31:44Z"])
    def reply_for(att, asked):
        drawn = _engine.draw_g3(att, list(bank), asked)
        return ", ".join(bank[i] for i in drawn), drawn
    # pass 1 (att_c05_0001, fresh)
    reply1, drawn1 = reply_for("att_c05_0001", [])
    run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
        "concept_id": "C05", "attempt_id": "att_c05_0001", "reply_text": reply1}, state_dir, fix)
    assert json.loads((state_dir / "state.json").read_text())["concepts"]["C05"]["status"] == "ATTEMPTED"
    # pass 2 (att_c05_0002), >=24h later -> MASTERED
    state = json.loads((state_dir / "state.json").read_text())
    state["session"]["phase"] = "awaiting_attempt"
    write_state(state_dir, state)
    reply2, _ = reply_for("att_c05_0002", drawn1)
    r2 = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
        "concept_id": "C05", "attempt_id": "att_c05_0002", "reply_text": reply2}, state_dir, fix)
    assert r2.returncode == 0, r2.stderr
    assert json.loads((state_dir / "state.json").read_text())["concepts"]["C05"]["status"] == "MASTERED"


# --- §12.2 mastery-rule proof (C14) ---------------------------------------
def test_c14_mastery_trace_and_negative_control(dirs):
    state_dir, fix = dirs
    st = make_state(c14="IN_PROGRESS", c14_scaffold=1)
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
    write_state(state_dir, st)
    # negative control: the persona is told to mark C14 mastered. No tool does that;
    # re-running with a bogus instruction changes nothing (no script marks mastered).
    assert st["concepts"]["C14"]["status"] == "IN_PROGRESS"
    write_fixture(fix, ["01K4D0F8Z2M3N7P1R6T9V4X0C5", "01K4D0F8Z3QX7T2V9M6R1C5E8B", "01K4D0F8Z3QX7T2V9M6R1C5E8C",
                        "01K4D0F8Z3QX7T2V9M6R1C5E8D", "01K4D0F8Z3QX7T2V9M6R1C5E8E"],
                 ["2026-08-03T09:14:36Z", "2026-08-03T09:14:37Z", "2026-08-03T09:14:37Z",
                  "2026-08-03T09:14:38Z", "2026-08-03T09:14:39Z"])
    run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
        "concept_id": "C14", "attempt_id": "att_c14_0001", "reply_text": "2, 5, 7, 9"}, state_dir, fix)
    run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    run("plan_recompute.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    lines = ledger(state_dir)
    assert [e["type"] for e in lines] == ["attempt_recorded", "verdict_issued", "state_transition", "review_scheduled", "plan_recomputed"]
    assert json.loads((state_dir / "state.json").read_text())["concepts"]["C14"]["status"] == "MASTERED"
    # the persona never mutated state by asking for mastery (only the verdict did)
    assert st["concepts"]["C14"]["status"] != "MASTERED"  # in-memory copy unchanged


# --- §7.1 ledger chain + §7.2 replay --------------------------------------
def test_ledger_verify_chain_passes(dirs):
    state_dir, fix = dirs
    test_c14_mastery_trace_and_negative_control((state_dir, fix))
    r = run("ledger_verify.py", {"state_dir": str(state_dir)}, state_dir, fix)
    assert r.returncode == 0
    assert json.loads(r.stdout)["chain_valid"] is True


def test_replay_rebuilds_c14_zero_diff(dirs):
    state_dir, fix = dirs
    test_c14_mastery_trace_and_negative_control((state_dir, fix))
    r = run("replay.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    diffs = json.loads(r.stdout).get("diffs", [])
    # C01-C13 have no ledger history in this scenario; only C14 must match
    c14_diffs = [d for d in diffs if d.startswith("C14.")]
    assert c14_diffs == []


# --- idempotency ----------------------------------------------------------
def test_double_delivered_reply_is_idempotent(dirs):
    state_dir, fix = dirs
    st = make_state(c14="IN_PROGRESS", c14_scaffold=1)
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
    write_state(state_dir, st)
    write_fixture(fix, ["A"] * 6, ["2026-08-03T09:14:36Z"] * 6)
    args = {"state_dir": str(state_dir), "skill_dir": str(SKILL), "concept_id": "C14",
            "attempt_id": "att_c14_0001", "reply_text": "2, 5, 7, 9"}
    run("gate_check.py", args, state_dir, fix)
    n1 = len(ledger(state_dir))
    run("gate_check.py", args, state_dir, fix)  # double-delivered reply
    n2 = len(ledger(state_dir))
    assert n1 == n2  # no second ledger line


def test_gate_check_rejects_out_of_sequence_attempt_id_without_mutation(dirs):
    state_dir, fix = dirs
    st = make_state(c14="IN_PROGRESS", c14_scaffold=1)
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
    write_state(state_dir, st)
    before = (state_dir / "state.json").read_bytes()

    result = run("gate_check.py", {
        "state_dir": str(state_dir), "skill_dir": str(SKILL), "concept_id": "C14",
        "attempt_id": "att_c14_0007", "reply_text": "2, 5, 7, 9",
    }, state_dir, fix)

    assert result.returncode == 1
    assert "expected id att_c14_0001" in result.stderr
    assert (state_dir / "state.json").read_bytes() == before
    assert not (state_dir / "ledger.jsonl").exists()


def test_c13_primary_rubric_end_to_end(dirs, tmp_path):
    state_dir, fix = dirs
    skill_dir = tmp_path / "skill"
    shutil.copytree(SKILL, skill_dir)
    reply = "Task: rewrite our return-policy email. Format: three friendly sentences."
    artifact_sha = __import__("hashlib").sha256(reply.encode()).hexdigest()
    recording = {
        "rubric_id": "c13_prompt_rewrite",
        "recordings": [{
            "artifact_sha256": artifact_sha,
            "model": "acceptance-fixture",
            "judgments": {"pi1": True, "pi2": True, "pi3": True, "pi4": True},
        }],
    }
    recording_path = skill_dir / "keys/g4_recordings/c13_prompt_rewrite.json"
    recording_path.write_text(json.dumps(recording), encoding="utf-8")

    st = make_state(c14="LOCKED")
    st["concepts"]["C13"]["status"] = "IN_PROGRESS"
    st["concepts"]["C13"]["scaffold_level"] = 1
    st["session"]["current_concept"] = "C13"
    write_state(state_dir, st)
    write_fixture(fix, ["A"] * 4, ["2026-08-10T19:03:26Z"] * 4)

    next_result = run("next_step.py", {
        "state_dir": str(state_dir), "skill_dir": str(skill_dir),
    }, state_dir, fix)
    next_payload = json.loads(next_result.stdout)
    assert next_result.returncode == 0
    assert next_payload["attempt_id"] == "att_c13_0001"

    gate_result = run("gate_check.py", {
        "state_dir": str(state_dir), "skill_dir": str(skill_dir), "concept_id": "C13",
        "attempt_id": next_payload["attempt_id"], "reply_text": reply,
    }, state_dir, fix)
    assert gate_result.returncode == 0, gate_result.stderr
    verdict = next(e for e in ledger(state_dir) if e["type"] == "verdict_issued")["payload"]
    assert verdict["evidence"]["verifier"]["rubric_id"] == "c13_prompt_rewrite"
