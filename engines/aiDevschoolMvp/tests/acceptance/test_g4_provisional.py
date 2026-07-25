"""PROVISIONAL G4 acceptance (c13 Example 4 + pass anchor) via the ADR-0006
recorded adapter. These are NOT §12-conformant yet: ADR-0006 is `Proposed ·
pendente ratificação`, and its own text blocks G4 acceptance without
ratification. The recorded adapter is the proposed mechanism; a live LLM path
and a ratified contract are required before §12.1 G4 / §12.3 are claimed.
Tests are skipped unless ADR_0006_RATIFIED=1 is set, so a default `pytest` run
reports the deterministic core only."""
from __future__ import annotations

import json
import os

import pytest

from conftest import SKILL, dirs, ledger, make_state, run, write_fixture, write_state

PROVISIONAL = "ADR-0006 not ratified; G4 acceptance is provisional, not §12-conformant"
RUN_G4 = os.environ.get("ADR_0006_RATIFIED") == "1"
C13_FAIL = ("It's like autocomplete gone to university. It doesn't look things up \u2014 it guesses "
            "the next word based on everything it read, and because fluent sentences are what it was "
            "trained to make, it always sounds sure of itself. So anything that matters, I verify "
            "before I pass it on.")
C13_PASS = ("It doesn't know anything the way you and I do. It was trained on huge amounts of text and "
            "predicts which words are likely to come next, so the sentences come out smooth and confident "
            "even when they are wrong. That's why I double-check anything important it tells me.")


@pytest.mark.skipif(not RUN_G4, reason=PROVISIONAL)
def test_g4_c13_teach_back_fail_and_pass_anchors(dirs):
    state_dir, fix = dirs
    # C13 needs M1-M3 + C10-C12 mastered; mark them to make C13 the frontier.
    st = make_state(c14="LOCKED")
    for r in [{"id": f"C{i:02d}"} for i in range(1, 14)]:
        st["concepts"][r["id"]]["status"] = "MASTERED"
    st["concepts"]["C13"]["status"] = "IN_PROGRESS"
    st["concepts"]["C13"]["scaffold_level"] = 1
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C13", "pending_gate_id": "G4", "attempts_this_session": 0}
    write_state(state_dir, st)
    write_fixture(fix, ["A"] * 6, ["2026-08-10T19:03:26Z"] * 6)
    # the §6.4 Example 4 fail artifact
    r = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
            "concept_id": "C13", "attempt_id": "att_c13_0005", "reply_text": C13_FAIL}, state_dir, fix)
    assert r.returncode == 0
    v = next(e for e in ledger(state_dir) if e["type"] == "verdict_issued")["payload"]
    assert v["evidence"]["artifact_sha256"] == "f41bbe5782d8769305c1eaa147f94bac710c5da115bf10e93ac456ee8aaf9fc1"
    assert v["verdict"] == "fail"
    assert v["scores"]["items_true"] == 3 and v["scores"]["items_required"] == 4
    # the pass anchor passes
    st2 = json.loads((state_dir / "state.json").read_text())
    st2["session"]["phase"] = "awaiting_attempt"
    write_state(state_dir, st2)
    r2 = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
             "concept_id": "C13", "attempt_id": "att_c13_0006", "reply_text": C13_PASS}, state_dir, fix)
    assert r2.returncode == 0
    v2 = [e for e in ledger(state_dir) if e["type"] == "verdict_issued"][-1]["payload"]
    assert v2["verdict"] == "pass"
