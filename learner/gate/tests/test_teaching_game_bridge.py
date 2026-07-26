from __future__ import annotations

import copy

import pytest

from learner.gate.teaching_game_bridge import verify_teaching_game_evidence
from learner.gate.tests.teaching_game_bridge_records import (
    SUPPORTED_CASES,
    make_teaching_game_record,
    make_warehouse_record,
)


@pytest.mark.parametrize(("game", "level"), SUPPORTED_CASES)
def test_recomputes_each_complete_passing_level_and_binds_digest(game, level):
    receipt = verify_teaching_game_evidence(make_teaching_game_record(game, level))

    assert receipt["verdict"] == "PASS"
    assert receipt["source"] == "independent-teaching-game-verifier"
    assert receipt["independent_pass"] is True
    assert len(receipt["evidence_digest"]) == 64
    assert receipt["canonical_gate_status"] == "not-submitted"
    assert receipt["producer_writes_mastered"] is False


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_recomputes_each_complete_failing_level(level):
    receipt = verify_teaching_game_evidence(make_warehouse_record(level, passed=False))

    assert receipt["verdict"] == "FAIL"
    assert receipt["producer_pass_claim"] is False
    assert receipt["errors"] == []


def test_digest_changes_when_one_observation_changes():
    original = make_warehouse_record()
    altered = copy.deepcopy(original)
    altered["observations"]["predictions"][0]["shelf"] = 3

    assert (
        verify_teaching_game_evidence(original)["evidence_digest"]
        != verify_teaching_game_evidence(altered)["evidence_digest"]
    )
