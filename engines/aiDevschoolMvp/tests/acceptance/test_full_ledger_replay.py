"""§12.1 Ledger + replay row: a scripted multi-session run from genesis masters
concepts end-to-end via the real entry scripts; then ledger_verify.py validates
the chain and replay.py rebuilds state.json with ZERO diffs on the six replayed
per-concept fields across ALL concepts. This is the executable proof of law L1."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from conftest import SKILL, run, write_state

SCRIPTS = SKILL / "scripts"
_B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _valid_ulids(n: int) -> list[str]:
    return ["01K" + "".join(_B32[(i * (j + 3) + j) % 32] for j in range(23)) for i in range(n)]


def _day_clock(n: int) -> list[str]:
    base = datetime(2026, 8, 1, 8, 0, 0, tzinfo=timezone.utc)
    return [(base + timedelta(days=i, seconds=i)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(n)]


def _genesis_state(curriculum):
    def mk(status):
        return {"status": status, "scaffold_level": None, "attempts": 0, "failures_this_session": 0,
                "deferred": False, "gate_progress": {"consecutive_passes": 0, "last_pass_ts": None, "asked_item_ids": []},
                "last_pass_ts": None, "next_review_ts": None, "target_days_effective": None}
    concepts = {r["id"]: (mk("AVAILABLE") if not r["prerequisites"] else mk("LOCKED")) for r in curriculum}
    return {"learner": {"channel": "telegram", "peer_ref": "peer_gen", "active_hours": {"start": "08:00", "end": "21:00"}, "locale": "en"},
            "concepts": concepts,
            "session": {"phase": "idle", "current_concept": None, "pending_gate_id": None, "attempts_this_session": 0},
            "last_nudge_date": None}


def _master(state_dir, fixture_dir, cid, keymap, max_steps=10):
    for _ in range(max_steps):
        live = json.loads((state_dir / "state.json").read_text())
        if live["concepts"][cid]["status"] == "MASTERED":
            return True
        n = json.loads(run("next_step.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fixture_dir).stdout)
        assert n["concept_id"] == cid, n
        drawn = n.get("drawn_item_ids") or []
        if n.get("effective_gate") == "G3" and drawn:
            reply = ", ".join(keymap[i] for i in drawn)
            r = json.loads(run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
                                                 "concept_id": cid, "attempt_id": n["attempt_id"],
                                                 "reply_text": reply}, state_dir, fixture_dir).stdout)
            assert r["verdict"] == "pass", r
    return json.loads((state_dir / "state.json").read_text())["concepts"][cid]["status"] == "MASTERED"


def test_scripted_learner_full_ledger_replay_zero_diff(dirs):
    state_dir, fixture_dir = dirs
    curriculum = json.loads((SKILL / "curriculum.json").read_text())
    write_state(state_dir, _genesis_state(curriculum))
    (fixture_dir / "ulids.txt").write_text("\n".join(_valid_ulids(400)) + "\n")
    (fixture_dir / "ts.txt").write_text("\n".join(_day_clock(400)) + "\n")

    # master three G3 concepts in order (each needs two passes >= 24 h apart)
    for cid in ("C01", "C02", "C03"):
        keymap = {it["item_id"]: it["keyed"]
                  for it in json.loads((SKILL / "keys" / f"{cid.lower()}_quiz_bank.json").read_text())["items"]["bank"]}
        assert _master(state_dir, fixture_dir, cid, keymap), cid

    lv = json.loads(run("ledger_verify.py", {"state_dir": str(state_dir)}, state_dir, fixture_dir).stdout)
    assert lv["ok"] and lv["chain_valid"], lv

    rp = json.loads(run("replay.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fixture_dir).stdout)
    assert rp["ok"] and rp["diffs"] == [], rp.get("diffs")
