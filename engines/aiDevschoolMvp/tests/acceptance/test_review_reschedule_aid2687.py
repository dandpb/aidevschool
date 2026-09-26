"""Review-reschedule invariants (AID-2687) — split into a new test file.

INV-5 and INV-6 were originally authored inside test_review_ladder.py (commit
0198c45f) and moved here verbatim (P2 remediation, option b, per the QA
countersign verdict AID-2771): editing an existing test file trips the SDLC
protect-tests guardrail (existing-test-blocked / new-test-allowed), while a
new test file is allowed. The red-on-base evidence is unaffected — the test
bodies are byte-for-byte the originals, only the module header is new.

INV-5  A review verdict (pass or fail) clears the consumed next_review_ts so
       schedule.py step 1 re-enters the concept into the ladder (AID-2687).
INV-6  End-to-end: after a review pass, schedule.py schedules the next rung
       from the new pass ts with the doubled target, and replay.py agrees.
"""
from __future__ import annotations

import sys
from datetime import timedelta

from engines.aiDevschoolMvp.tests.acceptance.conftest import (
    CURRICULUM,
    SKILL,
    make_concept,
    make_state,
)

SCRIPTS = SKILL / "scripts"
sys.path.insert(0, str(SCRIPTS))

import _core  # noqa: E402
from _state_transitions import (  # noqa: E402
    IN_PROGRESS,
    MASTERED,
    REVIEW_DUE,
    t_verdict_fail,
    t_verdict_pass,
)

CID = "C05"
T0 = next(r["target_retention_days"] for r in CURRICULUM if r["id"] == CID)
PASS_TS = "2026-09-01T12:00:00Z"
STALE_DUE_TS = "2026-09-05T12:00:00Z"


def test_review_verdicts_clear_consumed_next_review_ts():
    """INV-5 (AID-2687): leaving REVIEW_DUE consumes next_review_ts; both
    verdict paths must clear it so schedule.py step 1 (which only schedules
    concepts with next_review_ts is None) re-enters the concept into the
    ladder instead of silently retiring it."""
    st = make_state(active=[])
    concept = make_concept(REVIEW_DUE, T0)
    concept["last_pass_ts"] = PASS_TS
    concept["next_review_ts"] = STALE_DUE_TS
    st["concepts"][CID] = concept

    out = t_verdict_pass(st, CID, gate_contract_complete=True, review=True)
    assert out == ("moved", (REVIEW_DUE, MASTERED))
    assert st["concepts"][CID]["next_review_ts"] is None

    st["concepts"][CID]["status"] = REVIEW_DUE
    st["concepts"][CID]["next_review_ts"] = STALE_DUE_TS
    out = t_verdict_fail(st, CID, review=True, curriculum_target=T0)
    assert out == ("moved", (REVIEW_DUE, IN_PROGRESS))
    assert st["concepts"][CID]["next_review_ts"] is None


def test_review_pass_reschedules_through_schedule_loop(dirs):
    """INV-6 (AID-2687), end-to-end through the real script contract: after a
    review pass, the next rung of the ladder is scheduled by schedule.py from
    the new pass ts with the doubled target. Regression: review verdicts used
    to leave the stale (past) next_review_ts behind, so step 1 never fired
    again and the concept left the spaced-repetition ladder for good."""
    import json as _json

    import learner.gate.engine as _engine

    from engines.aiDevschoolMvp.tests.acceptance.conftest import (
        ledger,
        run,
        write_fixture,
        write_state,
    )

    state_dir, fix = dirs
    st = make_state(c05="MASTERED")
    c05 = st["concepts"]["C05"]
    c05["target_days_effective"] = 30
    c05["last_pass_ts"] = "2026-07-10T12:00:00Z"
    c05["next_review_ts"] = "2026-07-21T08:45:00Z"  # due long ago
    write_state(state_dir, st)
    bank = {
        it["item_id"]: it["keyed"]
        for it in _json.loads((SKILL / "keys" / "c05_quiz_bank.json").read_text())["items"]["bank"]
    }
    write_fixture(
        fix,
        [f"01K4F0{i:023d}" for i in range(24)],
        [
            "2026-07-21T10:00:00Z", "2026-07-21T10:00:01Z", "2026-07-21T10:00:02Z",
            "2026-07-21T10:00:03Z", "2026-07-21T10:00:04Z", "2026-07-21T10:00:05Z",
            "2026-07-21T10:00:06Z", "2026-07-21T10:00:07Z", "2026-07-21T10:00:08Z",
            "2026-07-21T10:00:09Z", "2026-07-21T10:00:10Z", "2026-07-21T10:00:11Z",
            "2026-07-21T10:00:12Z", "2026-07-21T10:00:13Z", "2026-07-21T10:00:14Z",
            "2026-07-21T10:00:15Z", "2026-07-21T10:00:16Z", "2026-07-21T10:00:17Z",
            "2026-07-21T10:00:18Z", "2026-07-21T10:00:19Z", "2026-07-21T10:00:20Z",
            "2026-07-21T10:00:21Z", "2026-07-21T10:00:22Z", "2026-07-21T10:00:23Z",
        ],
    )

    # 1. scheduler fires the due review (idempotent on review_due|cid|ts)
    r1 = run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    assert r1.returncode == 0, r1.stderr
    assert _json.loads((state_dir / "state.json").read_text())["concepts"]["C05"]["status"] == "REVIEW_DUE"

    # 2. learner passes the review through the real gate (G3 primary, fresh draw)
    st2 = _json.loads((state_dir / "state.json").read_text())
    st2["session"]["phase"] = "awaiting_attempt"
    write_state(state_dir, st2)
    drawn = _engine.draw_g3("att_c05_0001", list(bank), [])
    reply = ", ".join(bank[i] for i in drawn)
    r2 = run("gate_check.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL),
             "concept_id": "C05", "attempt_id": "att_c05_0001", "reply_text": reply}, state_dir, fix)
    assert r2.returncode == 0, r2.stderr
    assert _json.loads(r2.stdout)["verdict"] == "pass"
    state = _json.loads((state_dir / "state.json").read_text())
    c05 = state["concepts"]["C05"]
    assert c05["status"] == "MASTERED"
    assert c05["target_days_effective"] == 60
    assert c05["next_review_ts"] is None  # the fix: consumed schedule handed back
    pass_ts = c05["last_pass_ts"]

    # 3. the ladder must actually re-arm: schedule.py schedules the next rung
    r3 = run("schedule.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    assert r3.returncode == 0, r3.stderr
    expected_next = (
        (_core.parse_iso(pass_ts) + timedelta(days=_core.gap_days(60)))
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    state = _json.loads((state_dir / "state.json").read_text())
    c05 = state["concepts"]["C05"]
    assert c05["next_review_ts"] == expected_next
    assert _json.loads(r3.stdout)["next_due_ts"] == expected_next
    assert "review_scheduled" in [e["type"] for e in ledger(state_dir)][1:], (
        "the second rung must land in the ledger, not only in memory"
    )

    # 4. replay parity: the rebuilt projection matches the cleared/rescheduled field
    # (C01-C13 are seeded MASTERED with no ledger history — replay diffs there are
    # expected, same as test_replay_rebuilds_c14_zero_diff; C05 must be clean)
    r4 = run("replay.py", {"state_dir": str(state_dir), "skill_dir": str(SKILL)}, state_dir, fix)
    c05_diffs = [d for d in _json.loads(r4.stdout).get("diffs", []) if d.startswith("C05.")]
    assert c05_diffs == [], c05_diffs
