from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any


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


def make_warehouse_record(level: str = "L1", passed: bool = True, **overrides: Any) -> dict[str, Any]:
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


def make_teaching_game_record(game: str, level: str = "L1", **overrides: Any) -> dict[str, Any]:
    if game == "KV WAREHOUSE":
        return make_warehouse_record(level, **overrides)
    payload = copy.deepcopy(PRODUCER_PAYLOADS[game][level])
    observations = payload["observations"]
    metrics = payload["metrics"]
    if game == "WORMHOLE":
        identity = {
            "unit_id": "U3-url-shortener",
            "project": "03_url_shortener",
            "scenario_id": f"wormhole-{level}",
        }
    elif game == "PIPELINE PLANT":
        identity = {
            "unit_id": "U6-file-upload",
            "project": "06_file_upload_pipeline",
            "scenario_id": f"pipeline-plant-{level}",
        }
    elif game == "CHECKPOINT CITY":
        identity = {
            "unit_id": "U7-rest-api-auth",
            "project": "07_rest_api_auth",
            "scenario_id": f"checkpoint-city-{level}",
        }
    elif game == "TIMELINE TOWER":
        identity = {
            "unit_id": "U8-event-driven",
            "project": "08_event_driven_order_system",
            "scenario_id": f"timeline-tower-{level}",
        }
    elif game == "DOCKING BAY":
        identity = {
            "unit_id": "U9-plugin-system",
            "project": "09_plugin_system",
            "scenario_id": f"docking-bay-{level}",
        }
    else:
        identity = {
            "unit_id": "U5-websocket-chat",
            "project": "05_websocket_chat",
            "scenario_id": f"relay-station-{level}",
        }
    record = make_warehouse_record(
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
    for game in (
        "KV WAREHOUSE",
        "WORMHOLE",
        "RELAY STATION",
        "PIPELINE PLANT",
        "CHECKPOINT CITY",
        "TIMELINE TOWER",
        "DOCKING BAY",
    )
    for level in ("L1", "L2", "L3", "L4")
]
