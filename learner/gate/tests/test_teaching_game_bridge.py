from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from learner.gate.teaching_game_bridge import verify_teaching_game_evidence


PRODUCER_PAYLOADS = json.loads(
    (Path(__file__).parent / "fixtures" / "teaching_game_producer_payloads.json").read_text(
        encoding="utf-8"
    )
)


L1 = [
    ("key:8gl33c:0", 2),
    ("key:8ril9k:1", 4),
    ("key:a223ac:2", 2),
    ("key:9rd4jn:3", 3),
    ("key:e2j3i0:4", 2),
    ("key:8wbont:5", 5),
    ("key:1bn8kx:6", 0),
    ("key:8ruko7:7", 5),
    ("key:a1twjr:8", 5),
    ("key:7g40wq:9", 3),
    ("key:7xsz51:10", 1),
    ("key:dy7kps:11", 2),
]
L2_KEYS = [
    "key:aa8soc:0",
    "key:3wxzra:1",
    "key:3q2dy3:2",
    "key:3e8o2g:3",
    "key:6121p0:4",
    "key:eu4mct:5",
    "key:7d5v1n:6",
    "key:b4u2g8:7",
    "key:cbeik6:8",
    "key:9u4i7:9",
]
L3_KEYS = [
    "key:93ww4u:0",
    "key:c89yjl:1",
    "key:a96j6j:2",
    "key:9rgfr:3",
    "key:7dunha:4",
    "key:djkdb9:5",
    "key:4eecb0:6",
    "key:9sjdhc:7",
    "key:d2dauv:8",
    "key:fx6tp8:9",
]


def level_payload(level: str, passed: bool = True) -> tuple[dict[str, Any], dict[str, Any]]:
    if level == "L1":
        predictions: list[dict[str, Any]] = [{"key": key, "shelf": shelf} for key, shelf in L1]
        if not passed:
            predictions[0]["shelf"] = (predictions[0]["shelf"] + 1) % 6
            predictions[1]["shelf"] = (predictions[1]["shelf"] + 1) % 6
            predictions[2]["shelf"] = (predictions[2]["shelf"] + 1) % 6
        correct = 12 if passed else 9
        return (
            {"kind": "warehouse-L1", "predictions": predictions},
            {
                "kind": "voxeldoj-kv-warehouse",
                "shelf_predictions": 12,
                "shelf_prediction_accuracy": correct / 12,
            },
        )
    if level == "L2":
        probes = [{"key": key, "predictedAlive": True} for key in L2_KEYS]
        if not passed:
            probes[0]["predictedAlive"] = False
        return (
            {"kind": "warehouse-L2", "probes": probes},
            {
                "kind": "voxeldoj-kv-warehouse",
                "crud_probes": 10,
                "crud_accuracy": 1 if passed else 0.9,
            },
        )
    if level == "L3":
        probes = [{"key": key, "predictedAlive": False} for key in L3_KEYS]
        predicted_swept = 10 if passed else 9
        return (
            {
                "kind": "warehouse-L3",
                "probes": probes,
                "predictedSwept": predicted_swept,
            },
            {
                "kind": "voxeldoj-kv-warehouse",
                "ttl_probes": 10,
                "ttl_accuracy": 1,
                "expired_swept": 10,
                "swept_prediction_ok": passed,
            },
        )
    return (
        {"kind": "warehouse-L4", "hashStrength": "full" if passed else 1},
        {
            "kind": "voxeldoj-kv-warehouse",
            "load_skew": 1.51 if passed else 5.63,
            "hash_strength": -1 if passed else 1,
        },
    )


def make_record(level: str = "L1", passed: bool = True, **overrides: Any) -> dict[str, Any]:
    observations, metrics = level_payload(level, passed)
    record = {
        "source": "voxeldojo",
        "unit_id": "U2-key-value-store",
        "project": "02_key_value_store",
        "scenario_id": f"kv-warehouse-{level}",
        "game": "KV WAREHOUSE",
        "ts": "2026-07-25T12:00:00.000Z",
        "pass": passed,
        "metrics": metrics,
        "observations": observations,
        "review_context": {
            "unit_kind": "concept",
            "scheduled_review": False,
            "review_reason": "deepening",
            "scheduler_source": "learner-substrate",
            "verifier_required": True,
        },
        "curriculum_context": {
            "concept": "hash-map-backed CRUD with TTL expiration",
            "mechanic": "warehouse shelves + decaying crates",
        },
    }
    record.update(overrides)
    return record


def make_game_record(game: str, level: str = "L1", **overrides: Any) -> dict[str, Any]:
    if game == "KV WAREHOUSE":
        return make_record(level, **overrides)
    payload = copy.deepcopy(PRODUCER_PAYLOADS[game][level])
    observations = payload["observations"]
    metrics = payload["metrics"]
    if game == "WORMHOLE":
        identity = {
            "unit_id": "U3-url-shortener",
            "project": "03_url_shortener",
            "scenario_id": f"wormhole-{level}",
        }
    else:
        identity = {
            "unit_id": "U5-websocket-chat",
            "project": "05_websocket_chat",
            "scenario_id": f"relay-station-{level}",
        }
    record = make_record(
        level,
        observations=observations,
        metrics=metrics,
        game=game,
    )
    record.update(identity)
    record.update(overrides)
    return record


SUPPORTED_CASES = [
    (game, level)
    for game in ("KV WAREHOUSE", "WORMHOLE", "RELAY STATION")
    for level in ("L1", "L2", "L3", "L4")
]


@pytest.mark.parametrize(("game", "level"), SUPPORTED_CASES)
def test_recomputes_each_complete_passing_level_and_binds_digest(game, level):
    receipt = verify_teaching_game_evidence(make_game_record(game, level))

    assert receipt["verdict"] == "PASS"
    assert receipt["source"] == "independent-teaching-game-verifier"
    assert receipt["independent_pass"] is True
    assert len(receipt["evidence_digest"]) == 64
    assert receipt["canonical_gate_status"] == "not-submitted"
    assert receipt["producer_writes_mastered"] is False


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_recomputes_each_complete_failing_level(level):
    receipt = verify_teaching_game_evidence(make_record(level, passed=False))

    assert receipt["verdict"] == "FAIL"
    assert receipt["producer_pass_claim"] is False
    assert receipt["errors"] == []


@pytest.mark.parametrize("game", ["KV WAREHOUSE", "WORMHOLE", "RELAY STATION"])
def test_rejects_favorable_aggregate_without_observations(game):
    record = make_game_record(game)
    record.pop("observations")

    receipt = verify_teaching_game_evidence(record)

    assert receipt["verdict"] == "FAIL"
    assert any("observations" in error for error in receipt["errors"])


@pytest.mark.parametrize("game", ["KV WAREHOUSE", "WORMHOLE", "RELAY STATION"])
def test_rejects_forged_metrics_and_pass_claims(game):
    metrics = make_game_record(game)
    metrics["metrics"] = {"kind": "forged"}
    pass_claim = make_game_record(game)
    pass_claim["pass"] = False

    assert verify_teaching_game_evidence(metrics)["verdict"] == "FAIL"
    assert verify_teaching_game_evidence(pass_claim)["verdict"] == "FAIL"


@pytest.mark.parametrize("mutation", ["truncated", "extra", "altered", "metrics", "pass"])
def test_rejects_trace_or_producer_disagreement(mutation):
    record = make_record("L1")
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


def test_digest_changes_when_one_observation_changes():
    original = make_record()
    altered = copy.deepcopy(original)
    altered["observations"]["predictions"][0]["shelf"] = 3

    assert (
        verify_teaching_game_evidence(original)["evidence_digest"]
        != verify_teaching_game_evidence(altered)["evidence_digest"]
    )


def test_rejects_other_projects_and_embedded_verifiers():
    receipt = verify_teaching_game_evidence(
        make_record(project="03_url_shortener", verifier={"verdict": "PASS"})
    )

    assert receipt["verdict"] == "FAIL"
    assert any("project" in error for error in receipt["errors"])
    assert any("verifier" in error for error in receipt["errors"])


def test_rejects_unknown_game_and_nonclosed_record():
    record = make_record(game="UNKNOWN", extra=True)

    receipt = verify_teaching_game_evidence(record)

    assert receipt["verdict"] == "FAIL"
    assert "game is not supported" in receipt["errors"]
    assert any("unknown fields: extra" in error for error in receipt["errors"])


@pytest.mark.parametrize("timestamp", ["not-a-timestamp", "2026-07-25T12:00:00"])
def test_direct_call_rejects_malformed_or_timezone_naive_timestamp(timestamp):
    receipt = verify_teaching_game_evidence(make_record(ts=timestamp))

    assert receipt["verdict"] == "FAIL"
    assert any("timezone-aware ISO-8601" in error for error in receipt["errors"])


@pytest.mark.parametrize(
    ("game", "unit_id", "project", "scenario_id"),
    [
        ("KV WAREHOUSE", "U3-url-shortener", "03_url_shortener", "wormhole-L1"),
        ("WORMHOLE", "U5-websocket-chat", "05_websocket_chat", "relay-station-L1"),
        ("RELAY STATION", "U2-key-value-store", "02_key_value_store", "kv-warehouse-L1"),
    ],
)
def test_rejects_cross_game_identity(game, unit_id, project, scenario_id):
    receipt = verify_teaching_game_evidence(
        make_game_record(
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
