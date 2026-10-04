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
from replay_fold import _blank, fold_ledger, required_rubric_ids

FIELDS = ("status", "scaffold_level", "attempts", "gate_progress", "target_days_effective", "next_review_ts")


def _rubric_task(skill_dir: Path, rubric_id: str) -> str | None:
    p = skill_dir / "rubrics" / f"{rubric_id}.json"
    if not p.is_file():
        return None
    return json.loads(p.read_text(encoding="utf-8")).get("task")


def replay(ledger: list[dict[str, Any]], curriculum: list[dict[str, Any]], skill_dir: Path) -> dict[str, Any]:
    rubric_tasks = {
        rubric_id: _rubric_task(skill_dir, rubric_id)
        for rubric_id in required_rubric_ids(ledger, curriculum)
    }
    return fold_ledger(ledger, curriculum, rubric_tasks)


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
