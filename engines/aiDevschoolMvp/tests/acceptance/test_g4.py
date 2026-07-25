from __future__ import annotations

import hashlib
import json
import shutil

import pytest

from engines.aiDevschoolMvp.tests.acceptance.conftest import (
    SKILL,
    ledger,
    make_state,
    run,
    write_fixture,
    write_state,
)

# PROVISIONAL (ADR-0006 not ratified): G4 acceptance via the recorded adapter is
# NOT §12-conformant until the verifier contract is ratified. Skipped by default;
# set ADR_0006_RATIFIED=1 to run. Do not strip this marker — it is the honest
# split between the §12-conformant deterministic core and provisional G4.
_G4_PROVISIONAL = "ADR-0006 not ratified; G4 recorded-adapter acceptance is provisional, not §12-conformant"
pytestmark = pytest.mark.skipif(
    __import__("os").environ.get("ADR_0006_RATIFIED") != "1", reason=_G4_PROVISIONAL
)

C13_FAIL = ("It's like autocomplete gone to university. It doesn't look things up \u2014 it guesses "
            "the next word based on everything it read, and because fluent sentences are what it was "
            "trained to make, it always sounds sure of itself. So anything that matters, I verify "
            "before I pass it on.")
C13_PASS = ("It doesn't know anything the way you and I do. It was trained on huge amounts of text and "
            "predicts which words are likely to come next, so the sentences come out smooth and confident "
            "even when they are wrong. That's why I double-check anything important it tells me.")


def test_g4_c13_teach_back_fail_and_pass_anchors(dirs, tmp_path):
    state_dir, fix = dirs
    skill_dir = tmp_path / "skill"
    shutil.copytree(SKILL, skill_dir)
    primary_reply = "Task: rewrite our return-policy email. Format: three friendly sentences."
    primary_recording = {
        "rubric_id": "c13_prompt_rewrite",
        "recordings": [{
            "artifact_sha256": hashlib.sha256(primary_reply.encode()).hexdigest(),
            "model": "acceptance-fixture",
            "judgments": {"pi1": True, "pi2": True, "pi3": True, "pi4": True},
        }],
    }
    (skill_dir / "keys/g4_recordings/c13_prompt_rewrite.json").write_text(
        json.dumps(primary_recording), encoding="utf-8"
    )

    # C13 needs M1-M3 + C10-C12 mastered; mark them to make C13 the frontier.
    st = make_state(c14="LOCKED")
    for r in [{"id": f"C{i:02d}"} for i in range(1, 14)]:
        st["concepts"][r["id"]]["status"] = "MASTERED"
    st["concepts"]["C13"]["status"] = "IN_PROGRESS"
    st["concepts"]["C13"]["scaffold_level"] = 1
    st["concepts"]["C13"]["target_days_effective"] = None
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C13", "pending_gate_id": "G4", "attempts_this_session": 0}
    write_state(state_dir, st)
    write_fixture(fix, ["A"] * 12, ["2026-08-10T19:03:26Z"] * 12)

    primary = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(skill_dir),
                  "concept_id": "C13", "attempt_id": "att_c13_0001", "reply_text": primary_reply}, state_dir, fix)
    assert primary.returncode == 0
    next_payload = json.loads(run("next_step.py", {
        "state_dir": str(state_dir), "skill_dir": str(skill_dir),
    }, state_dir, fix).stdout)
    assert next_payload["attempt_id"] == "att_c13_0002"

    # the §6.4 Example 4 fail artifact
    r = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(skill_dir),
            "concept_id": "C13", "attempt_id": next_payload["attempt_id"], "reply_text": C13_FAIL}, state_dir, fix)
    assert r.returncode == 0
    v = next(
        e["payload"] for e in ledger(state_dir)
        if e["type"] == "verdict_issued" and e["payload"]["attempt_id"] == "att_c13_0002"
    )
    assert v["evidence"]["artifact_sha256"] == "f41bbe5782d8769305c1eaa147f94bac710c5da115bf10e93ac456ee8aaf9fc1"
    assert v["verdict"] == "fail"
    assert v["scores"]["items_true"] == 3 and v["scores"]["items_required"] == 4

    # the pass anchor passes
    retry_payload = json.loads(run("next_step.py", {
        "state_dir": str(state_dir), "skill_dir": str(skill_dir),
    }, state_dir, fix).stdout)
    assert retry_payload["attempt_id"] == "att_c13_0003"
    r2 = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(skill_dir),
             "concept_id": "C13", "attempt_id": retry_payload["attempt_id"], "reply_text": C13_PASS}, state_dir, fix)
    assert r2.returncode == 0
    v2 = [e for e in ledger(state_dir) if e["type"] == "verdict_issued"][-1]["payload"]
    assert v2["verdict"] == "pass"
    replay_result = run("replay.py", {
        "state_dir": str(state_dir), "skill_dir": str(skill_dir),
    }, state_dir, fix)
    c13_diffs = [d for d in json.loads(replay_result.stdout)["diffs"] if d.startswith("C13.")]
    assert c13_diffs == []
