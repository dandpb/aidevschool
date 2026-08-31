from __future__ import annotations

import pytest

from learner.gate.teaching_game_bridge import verify_teaching_game_evidence
from learner.gate.tests.teaching_game_bridge_records import (
    make_teaching_game_record,
    make_warehouse_record,
)


@pytest.mark.parametrize(
    "game", ["KV WAREHOUSE", "WORMHOLE", "RELAY STATION", "PIPELINE PLANT", "CHECKPOINT CITY", "TIMELINE TOWER"]
)
def test_rejects_favorable_aggregate_without_observations(game):
    record = make_teaching_game_record(game)
    record.pop("observations")

    receipt = verify_teaching_game_evidence(record)

    assert receipt["verdict"] == "FAIL"
    assert any("observations" in error for error in receipt["errors"])


@pytest.mark.parametrize(
    "game", ["KV WAREHOUSE", "WORMHOLE", "RELAY STATION", "PIPELINE PLANT", "CHECKPOINT CITY", "TIMELINE TOWER"]
)
def test_rejects_forged_metrics_and_pass_claims(game):
    metrics = make_teaching_game_record(game)
    metrics["metrics"] = {"kind": "forged"}
    pass_claim = make_teaching_game_record(game)
    pass_claim["pass"] = False

    assert verify_teaching_game_evidence(metrics)["verdict"] == "FAIL"
    assert verify_teaching_game_evidence(pass_claim)["verdict"] == "FAIL"


@pytest.mark.parametrize("mutation", ["truncated", "extra", "altered", "metrics", "pass"])
def test_rejects_trace_or_producer_disagreement(mutation):
    record = make_warehouse_record("L1")
    if mutation == "truncated":
        record["observations"]["predictions"].pop()
    elif mutation == "extra":
        record["observations"]["predictions"].append({"key": "extra", "shelf": 0})
    elif mutation == "altered":
        record["observations"]["predictions"][0]["key"] = "altered"
    elif mutation == "metrics":
        record["metrics"]["shelf_prediction_accuracy"] = 0.99
    else:
        record["pass"] = False

    receipt = verify_teaching_game_evidence(record)

    assert receipt["verdict"] == "FAIL"
    assert receipt["errors"]


def test_rejects_other_projects_and_embedded_verifiers():
    receipt = verify_teaching_game_evidence(
        make_warehouse_record(project="03_url_shortener", verifier={"verdict": "PASS"})
    )

    assert receipt["verdict"] == "FAIL"
    assert any("project" in error for error in receipt["errors"])
    assert any("verifier" in error for error in receipt["errors"])


def test_rejects_unknown_game_and_nonclosed_record():
    record = make_warehouse_record(game="UNKNOWN", extra=True)

    receipt = verify_teaching_game_evidence(record)

    assert receipt["verdict"] == "FAIL"
    assert "game is not supported" in receipt["errors"]
    assert any("unknown fields: extra" in error for error in receipt["errors"])


@pytest.mark.parametrize("timestamp", ["not-a-timestamp", "2026-07-25T12:00:00"])
def test_direct_call_rejects_malformed_or_timezone_naive_timestamp(timestamp):
    receipt = verify_teaching_game_evidence(make_warehouse_record(ts=timestamp))

    assert receipt["verdict"] == "FAIL"
    assert any("timezone-aware ISO-8601" in error for error in receipt["errors"])


@pytest.mark.parametrize(
    ("game", "unit_id", "project", "scenario_id"),
    [
        ("KV WAREHOUSE", "U3-url-shortener", "03_url_shortener", "wormhole-L1"),
        ("WORMHOLE", "U5-websocket-chat", "05_websocket_chat", "relay-station-L1"),
        ("RELAY STATION", "U2-key-value-store", "02_key_value_store", "kv-warehouse-L1"),
        ("PIPELINE PLANT", "U2-key-value-store", "02_key_value_store", "kv-warehouse-L1"),
        ("CHECKPOINT CITY", "U2-key-value-store", "02_key_value_store", "kv-warehouse-L1"),
        ("TIMELINE TOWER", "U2-key-value-store", "02_key_value_store", "kv-warehouse-L1"),
    ],
)
def test_rejects_cross_game_identity(game, unit_id, project, scenario_id):
    receipt = verify_teaching_game_evidence(
        make_teaching_game_record(
            game,
            unit_id=unit_id,
            project=project,
            scenario_id=scenario_id,
        )
    )

    assert receipt["verdict"] == "FAIL"
    assert any("unit_id" in error for error in receipt["errors"])
    assert any("project" in error for error in receipt["errors"])
    assert any("scenario_id" in error for error in receipt["errors"])
