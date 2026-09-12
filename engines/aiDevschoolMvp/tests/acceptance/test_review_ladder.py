"""Review-ladder invariants (§5.3 spaced-repetition core, AID-1524).

Pins the deterministic review-interval ladder as-is, at the transition-function
level (same production code path gate_check.py drives):

INV-1  A review pass doubles ``target_days_effective`` capped at 365 and moves
       REVIEW_DUE -> MASTERED; the next scheduled review is exactly
       ``last_pass_ts + gap_days(target_after_pass)`` days later.
INV-2  Gaps are non-decreasing across the ladder and each equals
       ``gap_days(target)`` (the schedule is a pure function of target + ts).
INV-3  A review fail resets ``target_days_effective`` to the curriculum target
       and de-scaffolds (REVIEW_DUE -> IN_PROGRESS).
INV-4  Same inputs, same progression: replaying the identical pass/fail
       sequence yields byte-identical targets, gaps, and timestamps.
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
import _state  # noqa: E402
from _state_transitions import (  # noqa: E402
    IN_PROGRESS,
    MASTERED,
    REVIEW_DUE,
    schedule_next_review,
    t_review_due,
    t_verdict_fail,
    t_verdict_pass,
)

CID = "C05"
T0 = next(r["target_retention_days"] for r in CURRICULUM if r["id"] == CID)
PASS_TS = "2026-09-01T12:00:00Z"
EXPECTED_NEXT_REVIEW_TS = [
    "2026-09-10T12:00:00Z",
    "2026-09-28T12:00:00Z",
    "2026-11-03T12:00:00Z",
    "2026-12-28T12:00:00Z",
    "2027-02-21T12:00:00Z",
    "2027-04-17T12:00:00Z",
]


def _ladder(passes: int) -> list[dict]:
    st = make_state(active=[])
    concept = make_concept(REVIEW_DUE, T0)
    concept["last_pass_ts"] = PASS_TS
    st["concepts"][CID] = concept
    rows: list[dict] = []
    last_pass = PASS_TS
    for _ in range(passes):
        out = t_verdict_pass(st, CID, gate_contract_complete=True, review=True)
        assert out == ("moved", (REVIEW_DUE, MASTERED))
        target = st["concepts"][CID]["target_days_effective"]
        next_ts = _state.schedule_next_review(st["concepts"][CID], last_pass)
        assert st["concepts"][CID]["status"] == MASTERED
        assert st["concepts"][CID]["scaffold_level"] is None
        due = t_review_due(st, CID)
        assert due == ("moved", (MASTERED, REVIEW_DUE))
        rows.append({"target": target, "gap_days": _core.gap_days(target), "next_review_ts": next_ts})
        last_pass = next_ts
        st["concepts"][CID]["last_pass_ts"] = last_pass
    return rows


def test_review_pass_ladder_doubles_target_with_cap_and_pure_gaps():
    rows = _ladder(6)

    assert [r["target"] for r in rows] == [60, 120, 240, 365, 365, 365]
    assert [r["gap_days"] for r in rows] == [9, 18, 36, 55, 55, 55]

    gaps = [r["gap_days"] for r in rows]
    assert gaps == sorted(gaps), "review gaps must be non-decreasing across the ladder"
    assert all(g <= _core.gap_days(365) for g in gaps), "no gap may exceed gap_days(365)"

    last_pass = _core.parse_iso(PASS_TS)
    for r, pinned in zip(rows, EXPECTED_NEXT_REVIEW_TS):
        expected = (
            (last_pass + timedelta(days=r["gap_days"]))
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )
        assert r["next_review_ts"] == pinned
        assert r["next_review_ts"] == expected
        # INV-2 purity: the replay-recorded timestamp must be reproducible from
        # (target_days_effective, last_pass_ts) alone — not merely self-equal.
        assert schedule_next_review(
            {"target_days_effective": r["target"]},
            last_pass.isoformat().replace("+00:00", "Z"),
        ) == r["next_review_ts"]
        last_pass = _core.parse_iso(r["next_review_ts"])


def test_same_inputs_same_progression():
    assert _ladder(6) == _ladder(6)


def test_review_fail_resets_target_and_descaffolds():
    st = make_state(active=[])
    concept = make_concept(REVIEW_DUE, 240, scaffold=3)
    concept["last_pass_ts"] = PASS_TS
    st["concepts"][CID] = concept

    out = t_verdict_fail(st, CID, review=True, curriculum_target=T0)
    assert out == ("moved", (REVIEW_DUE, IN_PROGRESS))
    assert st["concepts"][CID]["target_days_effective"] == T0
    assert st["concepts"][CID]["scaffold_level"] == 2
    assert st["concepts"][CID]["failures_this_session"] == 1
    assert st["concepts"][CID]["deferred"] is False

    again = t_verdict_fail(st, CID, review=True, curriculum_target=T0)
    assert again[0] == "reject", "a second review fail must not fire from IN_PROGRESS"
