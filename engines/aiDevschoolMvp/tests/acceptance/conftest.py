"""Acceptance helpers: run the skill scripts as real subprocesses (§4.2 JSON
stdin/stdout contract) under a fixture clock/ULID source so ledger bytes are
reproducible. Each test gets a fresh state dir."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

import pytest

SKILL = Path(__file__).resolve().parents[2] / "aidevschool"
SCRIPTS = SKILL / "scripts"
CURRICULUM = json.loads((SKILL / "curriculum.json").read_text(encoding="utf-8"))


def run(
    script: str,
    args: dict[str, Any],
    state_dir: Path,
    fixture_dir: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    if fixture_dir is not None:
        env["AIDEVSCHOOL_FIXTURE_DIR"] = str(fixture_dir)
    return subprocess.run(
        ["python3", str(SCRIPTS / script)],
        input=json.dumps(args), capture_output=True, text=True, env=env,
    )


def make_concept(status: str, target: int | None = None, scaffold: int | None = None) -> dict[str, Any]:
    return {
        "status": status, "scaffold_level": scaffold, "attempts": 0, "failures_this_session": 0,
        "deferred": False, "gate_progress": {"consecutive_passes": 0, "last_pass_ts": None, "asked_item_ids": []},
        "last_pass_ts": None, "next_review_ts": None, "target_days_effective": target,
    }


def make_state(active: list[str] | None = None, *, c14="LOCKED", c14_scaffold=None,
               c05="LOCKED", c17="LOCKED") -> dict[str, Any]:
    """A learner with C01..C13 MASTERED by default; C14/C05/C17 configurable."""
    mastered = active if active is not None else [f"C{i:02d}" for i in range(1, 14)]
    concepts: dict[str, Any] = {}
    for r in CURRICULUM:
        cid = r["id"]
        if cid == "C14":
            concepts[cid] = make_concept(c14, 45, c14_scaffold)
        elif cid == "C05":
            concepts[cid] = make_concept(c05, 30)
        elif cid == "C17":
            concepts[cid] = make_concept(c17, 60)
        elif cid in mastered:
            concepts[cid] = make_concept("MASTERED", r["target_retention_days"])
        else:
            concepts[cid] = make_concept("LOCKED")
    return {
        "learner": {"channel": "telegram", "peer_ref": "peer_acc",
                    "active_hours": {"start": "08:00", "end": "21:00"}, "locale": "en"},
        "concepts": concepts,
        "session": {"phase": "idle", "current_concept": None, "pending_gate_id": None, "attempts_this_session": 0},
        "last_nudge_date": None,
    }


def write_state(state_dir: Path, state: dict[str, Any]) -> None:
    (state_dir / "state.json").write_text(json.dumps(state), encoding="utf-8")
    (state_dir / "config.json").write_text(
        json.dumps({"verifier_model": "inherit",
                    "feature_flags": {"llm_gates_enabled": True}}), encoding="utf-8")


def write_fixture(fixture_dir: Path, ulids: list[str], tss: list[str]) -> None:
    (fixture_dir / "ulids.txt").write_text("\n".join(ulids) + "\n", encoding="utf-8")
    (fixture_dir / "ts.txt").write_text("\n".join(tss) + "\n", encoding="utf-8")


def ledger(state_dir: Path) -> list[dict[str, Any]]:
    return [json.loads(ln) for ln in (state_dir / "ledger.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()]


@pytest.fixture
def dirs(tmp_path):
    state_dir = tmp_path / "state"
    fixture_dir = tmp_path / "fixture"
    state_dir.mkdir()
    fixture_dir.mkdir()
    return state_dir, fixture_dir
