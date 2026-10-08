"""R3B contracts: pure replay, ordered roles, rubric IO seam and installed CLI."""
from __future__ import annotations

import builtins
import copy
import datetime
import importlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time

import pytest

SKILL = Path(__file__).resolve().parents[1] / "aidevschool"
SCRIPTS = SKILL / "scripts"
CURRICULUM = [
    {"id": "C01", "prerequisites": [], "target_retention_days": 30},
    {"id": "C02", "prerequisites": ["C01"], "target_retention_days": 15},
]
T0 = "2026-08-01T08:00:00Z"
T1 = "2026-08-02T08:00:00Z"
T2 = "2026-09-01T08:00:00Z"


@pytest.fixture
def runtimes(monkeypatch):
    monkeypatch.syspath_prepend(str(SCRIPTS))
    fold = importlib.import_module("replay_fold")
    spec = importlib.util.spec_from_file_location("mvp_replay_test", SCRIPTS / "replay.py")
    wrapper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(wrapper)
    return fold, wrapper


def event(kind, payload, cid="C01", ts=T0):
    return {"type": kind, "payload": payload, "concept_id": cid, "ts": ts}


def attempt(role=None, attempt_id="a", cid="C01"):
    payload = {"attempt_id": attempt_id, "outcome": "parsed"}
    if role is not None:
        payload["assessment_role"] = role
    return event("attempt_recorded", payload, cid)


def verdict(gate="G4", rubric="r", attempt_id="a", outcome="pass", ts=T0):
    return event("verdict_issued", {
        "attempt_id": attempt_id, "gate_id": gate, "verdict": outcome,
        "scores": {"consecutive_passes": 2, "items": [{"item_id": "i1"}, {"item_id": "i1"}, {"item_id": "i2"}]},
        "evidence": {"verifier": {"rubric_id": rubric}},
    }, ts=ts)


def journey():
    return [
        event("lesson_delivered", {"scaffold_level": 2}),
        attempt(), verdict("G3", ts=T1),
        attempt("teach_back", "tb"), verdict("G3", attempt_id="tb"),
        verdict("G3", outcome="fail"),
        event("state_transition", {"from": "ATTEMPTED", "to": "MASTERED"}),
        event("review_scheduled", {"target_days_effective": 30, "next_review_ts": T2}),
        event("review_due", {}),
        event("state_transition", {"from": "REVIEW_DUE", "to": "MASTERED"}),
        event("review_scheduled", {"next_review_ts": T2}),
        event("plan_recomputed", {}), event("session_started", {}),
    ]


def test_fold_six_fields_and_pure_with_key_present(runtimes, monkeypatch):
    fold, _ = runtimes
    ledger, curriculum, tasks = journey(), copy.deepcopy(CURRICULUM), {}
    before = copy.deepcopy((ledger, curriculum, tasks))
    monkeypatch.setenv("TYPESAFE_API_KEY", "sk-synthetic-r3b")

    def forbidden(*args, **kwargs):
        raise AssertionError("IO/env/clock reached from pure fold")

    class NoEnvironment(dict):
        __getitem__ = get = __contains__ = forbidden

    class NoClock(datetime.datetime):
        now = utcnow = today = classmethod(forbidden)

    class NoDate(datetime.date):
        today = classmethod(forbidden)

    with monkeypatch.context() as guard:
        guard.setattr(builtins, "open", forbidden)
        guard.setattr(os, "environ", NoEnvironment())
        for name in ("getenv", "open", "read", "write", "stat", "listdir", "scandir", "readlink"):
            guard.setattr(os, name, forbidden)
        for name in ("open", "read_text", "read_bytes", "write_text", "write_bytes", "stat", "exists", "is_file", "is_dir", "glob", "resolve"):
            guard.setattr(Path, name, forbidden)
        guard.setattr(socket, "socket", forbidden)
        guard.setattr(socket, "getaddrinfo", forbidden)
        guard.setattr(datetime, "datetime", NoClock)
        guard.setattr(datetime, "date", NoDate)
        for name in ("time", "monotonic", "perf_counter", "sleep"):
            guard.setattr(time, name, forbidden)
        needed = fold.required_rubric_ids(ledger, curriculum)
        result = fold.fold_ledger(ledger, curriculum, tasks)
        repeated = fold.fold_ledger(ledger, curriculum, tasks)
    assert needed == []
    assert result == repeated
    assert (ledger, curriculum, tasks) == before
    assert result["C01"] == {
        "status": "MASTERED", "scaffold_level": None, "attempts": 2,
        "gate_progress": {"consecutive_passes": 0, "last_pass_ts": T1,
                          "asked_item_ids": ["i1", "i2"], "teach_back_passed": True},
        "target_days_effective": 60, "next_review_ts": T2,
    }
    assert result["C02"] == {
        "status": "LOCKED", "scaffold_level": None, "attempts": 0,
        "gate_progress": {"consecutive_passes": 0, "last_pass_ts": None, "asked_item_ids": []},
        "target_days_effective": None, "next_review_ts": None,
    }


@pytest.mark.parametrize("ledger,needed,teach_back", [
    ([verdict()], ["r"], False),
    ([attempt("teach_back"), verdict()], [], True),
    ([verdict(), attempt("teach_back")], ["r"], False),
    ([attempt("teach_back", cid="C02"), verdict()], [], True),
    ([attempt("teach_back", cid="unknown"), verdict()], ["r"], False),
    ([attempt("teach_back"), attempt("primary"), verdict()], [], True),
])
def test_ordered_roles_and_global_attempt_ids(runtimes, ledger, needed, teach_back):
    fold, _ = runtimes
    assert fold.required_rubric_ids(ledger, CURRICULUM) == needed
    result = fold.fold_ledger(ledger, CURRICULUM, {"r": None})
    assert result["C01"]["gate_progress"].get("teach_back_passed", False) is teach_back


def test_rubric_teach_back_preserves_primary_streak(runtimes):
    fold, _ = runtimes
    ledger = [verdict("G3", ts=T1), verdict()]
    result = fold.fold_ledger(ledger, CURRICULUM, {"r": "teach_back"})
    progress = result["C01"]["gate_progress"]
    assert progress["teach_back_passed"] is True
    assert progress["consecutive_passes"] == 2
    assert progress["last_pass_ts"] == T1


def test_missing_task_is_distinct_from_absent_rubric(runtimes):
    fold, _ = runtimes
    with pytest.raises(fold.MissingRubricTaskError, match="r"):
        fold.fold_ledger([verdict()], CURRICULUM, {})
    result = fold.fold_ledger([verdict()], CURRICULUM, {"r": None})
    assert "teach_back_passed" not in result["C01"]["gate_progress"]


def test_required_ids_unique_in_first_use_order(runtimes):
    fold, _ = runtimes
    ledger = [verdict(rubric="r2"), verdict(rubric="r1"), verdict(rubric="r2")]
    assert fold.required_rubric_ids(ledger, CURRICULUM) == ["r2", "r1"]


def test_unknown_concepts_empty_curriculum_and_malformed_event(runtimes):
    fold, _ = runtimes
    unknown = event("verdict_issued", {}, cid="unknown")
    assert fold.fold_ledger([unknown], [], {}) == {}
    assert fold.required_rubric_ids([unknown], CURRICULUM) == []
    with pytest.raises(KeyError):
        fold.fold_ledger([{}], CURRICULUM, {})


@pytest.mark.parametrize("start,expected_target", [(30, 60), (300, 365), (None, 2)])
def test_review_pass_retention_and_consumed_due(runtimes, start, expected_target):
    fold, _ = runtimes
    ledger = [event("review_scheduled", {"target_days_effective": start, "next_review_ts": T2}),
              event("review_due", {}),
              event("state_transition", {"from": "REVIEW_DUE", "to": "MASTERED"})]
    result = fold.fold_ledger(ledger, CURRICULUM, {})["C01"]
    assert result["target_days_effective"] == expected_target
    assert result["next_review_ts"] is None


def test_review_fail_resets_curriculum_target(runtimes):
    fold, _ = runtimes
    ledger = [event("review_scheduled", {"target_days_effective": 60, "next_review_ts": T2}),
              event("review_due", {}),
              event("state_transition", {"from": "REVIEW_DUE", "to": "IN_PROGRESS"})]
    result = fold.fold_ledger(ledger, CURRICULUM, {})["C01"]
    assert result["status"] == "IN_PROGRESS"
    assert result["target_days_effective"] == 30
    assert result["next_review_ts"] is None


def test_wrapper_loads_once_and_matches_fold(runtimes, monkeypatch, tmp_path):
    fold, wrapper = runtimes
    ledger = [verdict(), verdict(attempt_id="b")]
    calls = []

    def task(skill_dir, rubric_id):
        calls.append((skill_dir, rubric_id))
        return "teach_back"

    monkeypatch.setattr(wrapper, "_rubric_task", task)
    before = copy.deepcopy((ledger, CURRICULUM))
    assert wrapper.replay(ledger, CURRICULUM, tmp_path) == fold.fold_ledger(ledger, CURRICULUM, {"r": "teach_back"})
    assert calls == [(tmp_path, "r")]
    assert (ledger, CURRICULUM) == before


def test_wrapper_missing_and_corrupt_rubrics(runtimes, tmp_path):
    fold, wrapper = runtimes
    assert wrapper.replay([verdict()], CURRICULUM, tmp_path) == fold.fold_ledger([verdict()], CURRICULUM, {"r": None})
    (tmp_path / "rubrics").mkdir()
    rubric = tmp_path / "rubrics/r.json"
    rubric.write_text("{invalid", encoding="utf-8")
    with pytest.raises(json.JSONDecodeError):
        wrapper.replay([verdict()], CURRICULUM, tmp_path)
    result = wrapper.replay([attempt("teach_back"), verdict()], CURRICULUM, tmp_path)
    assert result["C01"]["gate_progress"]["teach_back_passed"] is True
    assert rubric.read_text(encoding="utf-8") == "{invalid"


@pytest.mark.parametrize("diverge", [False, True])
def test_installed_cli_contract_atomic_scratch_and_unchanged_inputs(runtimes, tmp_path, diverge):
    fold, wrapper = runtimes
    installed = tmp_path / "installed"
    shutil.copytree(SKILL, installed, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    state_dir = tmp_path / "state"
    state_dir.mkdir()
    ledger = journey()
    rebuilt = fold.fold_ledger(ledger, CURRICULUM, {})
    live = copy.deepcopy(rebuilt)
    if diverge:
        live["C01"]["attempts"] += 1
    inputs = {
        installed / "curriculum.json": json.dumps(CURRICULUM),
        state_dir / "ledger.jsonl": "\n".join(json.dumps(e) for e in ledger) + "\n",
        state_dir / "state.json": json.dumps({"concepts": live}),
    }
    for path, text in inputs.items():
        path.write_text(text, encoding="utf-8")
    before = {path: path.read_bytes() for path in inputs}
    # Instrument real CLI main in a separate process; keep stdout JSON intact.
    probe = '''import json, os, runpy, sys
script = sys.argv[1]
sys.path.insert(0, os.path.dirname(script))
mutations = []
def audit(name, args):
    if name == "open" and isinstance(args[0], str) and (args[2] or 0) & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND):
        mutations.append(["open", os.path.abspath(args[0])])
    elif name == "os.rename":
        mutations.append([name, os.path.abspath(args[0]), os.path.abspath(args[1])])
    elif name in ("os.mkdir", "os.remove", "os.rmdir"):
        mutations.append([name, os.path.abspath(args[0])])
sys.addaudithook(audit)
code = 0
try:
    runpy.run_path(script, run_name="__main__")
except SystemExit as error:
    code = error.code
finally:
    sys.stderr.write("R3B_WRITES:" + json.dumps(mutations) + "\\n")
raise SystemExit(code)
'''
    result = subprocess.run([sys.executable, "-c", probe, str(installed / "scripts/replay.py")],
                            input=json.dumps({"state_dir": str(state_dir), "skill_dir": str(installed)}),
                            cwd=tmp_path, capture_output=True, text=True)
    assert result.returncode == (2 if diverge else 0), result.stderr
    output = json.loads(result.stdout)
    assert output["ok"] is (not diverge)
    assert output["diffs"] == (["C01.attempts: replay=2 != live=3"] if diverge else [])
    if not diverge:
        assert output["concepts"] == 2
    scratch = state_dir / "replay.scratch.json"
    temporary = state_dir / "replay.scratch.json.tmp"
    assert output["scratch"] == str(scratch)
    assert json.loads(scratch.read_text(encoding="utf-8")) == {"concepts": rebuilt}
    assert not temporary.exists()
    observed = json.loads(result.stderr.split("R3B_WRITES:")[1])
    assert observed == [["os.mkdir", str(state_dir)], ["open", str(temporary)],
                        ["os.rename", str(temporary), str(scratch)]]
    assert {path: path.read_bytes() for path in inputs} == before
    assert wrapper.FIELDS == ("status", "scaffold_level", "attempts", "gate_progress", "target_days_effective", "next_review_ts")
