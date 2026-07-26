"""§12.1 security-baseline row + §9.3 deletion. The startup manifest over keys/
and rubrics/ detects a tampered instrument (any script exits 2); the three-file
deletion removes the learner record completely."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from conftest import SKILL, make_state, run, write_fixture, write_state

SCRIPTS = SKILL / "scripts"
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
import learner.gate.core as _core  # noqa: E402


def _prime_state(state_dir, fixture_dir):
    st = make_state(c14="IN_PROGRESS", c14_scaffold=1)
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
    write_state(state_dir, st)
    write_fixture(fixture_dir, ["A"] * 6, ["2026-08-03T09:14:36Z"] * 6)


def _gate_args(state_dir):
    return {"state_dir": str(state_dir), "skill_dir": str(SKILL), "concept_id": "C14",
            "attempt_id": "att_c14_0001", "reply_text": "2, 5, 7, 9"}


def test_manifest_refuses_tampered_keys(dirs):
    state_dir, fixture_dir = dirs
    _core.write_manifest(SKILL)  # baseline manifest over current keys/ + rubrics/
    _prime_state(state_dir, fixture_dir)
    # untampered: gate_check runs fine
    ok = run("gate_check.py", _gate_args(state_dir), state_dir, fixture_dir)
    assert ok.returncode == 0, ok.stderr
    # tamper one byte in a key file -> any script exits 2
    key = SKILL / "keys" / "c14_seeded_bio.json"
    original = key.read_text(encoding="utf-8")
    try:
        key.write_text(original.replace("Nobel", "N0bel", 1), encoding="utf-8")
        # fresh state so the earlier pass doesn't short-circuit idempotency
        st = make_state(c14="IN_PROGRESS", c14_scaffold=1)
        st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
        write_state(state_dir, st)
        bad = run("gate_check.py", _gate_args(state_dir), state_dir, fixture_dir)
        assert bad.returncode == 2, (bad.returncode, bad.stderr)
        assert "manifest" in bad.stderr.lower()
    finally:
        key.write_text(original, encoding="utf-8")  # restore the instrument
    # restored: manifest is back in sync, gate runs again on fresh state
    write_state(state_dir, make_state(c14="IN_PROGRESS", c14_scaffold=1))
    st = json.loads((state_dir / "state.json").read_text())
    st["session"] = {"phase": "awaiting_attempt", "current_concept": "C14", "pending_gate_id": "G1", "attempts_this_session": 0}
    write_state(state_dir, st)
    ok2 = run("gate_check.py", _gate_args(state_dir), state_dir, fixture_dir)
    assert ok2.returncode == 0, ok2.stderr


def test_deletion_removes_three_file_record(dirs):
    state_dir, fixture_dir = dirs
    _prime_state(state_dir, fixture_dir)
    run("gate_check.py", _gate_args(state_dir), state_dir, fixture_dir)
    run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fixture_dir)
    run("plan_recompute.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fixture_dir)
    # the three-file learner record exists
    for name in ("state.json", "plan.json", "ledger.jsonl"):
        assert (state_dir / name).is_file(), name
    # §9.3 full deletion: delete the record (config.json holds no learner data)
    for name in ("state.json", "plan.json", "ledger.jsonl", "config.json"):
        (state_dir / name).unlink()
    for name in ("state.json", "plan.json", "ledger.jsonl"):
        assert not (state_dir / name).exists(), f"{name} still present after deletion"
