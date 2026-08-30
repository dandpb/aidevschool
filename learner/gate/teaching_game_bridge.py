"""Fixed stdin/stdout verifier for the supported teaching-game evidence schema.

The browser cannot select a command, project, path, or rubric. The OS bridge
dispatches only the declared teaching-game schema to this module, which checks
the closed game identity and replays its bounded observation trace without
trusting producer metrics or the producer's ``pass`` claim. The receipt is
digest-bound but never writes canonical learner state; the existing learner
gate still requires a separate learner attempt and its normal eligibility checks.
"""

from __future__ import annotations

import json
import sys
from typing import Any

from learner.gate.evidence_validator import validate_teaching_evidence_structure
from learner.gate.evidence_io import canonical_evidence_digest, read_bounded_evidence
from learner.gate.pipeline_evaluator import evaluate_pipeline
from learner.gate.relay_evaluator import evaluate_relay
from learner.gate.warehouse_evaluator import evaluate_warehouse
from learner.gate.wormhole_evaluator import evaluate_wormhole


SOURCE = "independent-teaching-game-verifier"
GAME_SPECS = {
    "KV WAREHOUSE": (
        "U2-key-value-store",
        "02_key_value_store",
        "kv-warehouse-",
        evaluate_warehouse,
    ),
    "WORMHOLE": (
        "U3-url-shortener",
        "03_url_shortener",
        "wormhole-",
        evaluate_wormhole,
    ),
    "RELAY STATION": (
        "U5-websocket-chat",
        "05_websocket_chat",
        "relay-station-",
        evaluate_relay,
    ),
    "PIPELINE PLANT": (
        "U6-file-upload",
        "06_file_upload_pipeline",
        "pipeline-plant-",
        evaluate_pipeline,
    ),
}
ALLOWED_KEYS = frozenset(
    {
        "source",
        "unit_id",
        "project",
        "scenario_id",
        "game",
        "ts",
        "pass",
        "metrics",
        "observations",
        "review_context",
        "curriculum_context",
    }
)
REQUIRED_KEYS = ALLOWED_KEYS
# Optional identity metadata (teaching-game-contract.md): receipts bind their
# attempt_id to the record's attempt_id for identity matching. The gate never
# evaluates it; it only accepts and echoes a non-empty string when present.
OPTIONAL_KEYS = frozenset({"attempt_id"})


def _validate_identity(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    unknown = sorted(set(record) - ALLOWED_KEYS - OPTIONAL_KEYS)
    missing = sorted(REQUIRED_KEYS - set(record))
    if unknown:
        errors.append(f"unknown fields: {', '.join(unknown)}")
    if missing:
        errors.append(f"missing fields: {', '.join(missing)}")
    attempt_id = record.get("attempt_id")
    if attempt_id is not None and (not isinstance(attempt_id, str) or not attempt_id):
        errors.append("attempt_id must be a non-empty string when present")
    game = record.get("game")
    spec = GAME_SPECS.get(game) if isinstance(game, str) else None
    if spec is None:
        errors.append("game is not supported")
        return errors
    unit_id, project, scenario_prefix, _ = spec
    expected = {
        "source": "voxeldojo",
        "unit_id": unit_id,
        "project": project,
    }
    for key, value in expected.items():
        if record.get(key) != value:
            errors.append(f"{key} must be {value!r}")
    scenario_id = record.get("scenario_id")
    if not isinstance(scenario_id, str) or scenario_id not in {
        f"{scenario_prefix}L1",
        f"{scenario_prefix}L2",
        f"{scenario_prefix}L3",
        f"{scenario_prefix}L4",
    }:
        errors.append(f"scenario_id is not a supported {game} level")
    review = record.get("review_context")
    if not isinstance(review, dict) or review.get("verifier_required") is not True:
        errors.append("review_context.verifier_required must be true")
    return errors


def _evaluate_observations(record: dict[str, Any], errors: list[str]) -> bool:
    game = record.get("game")
    spec = GAME_SPECS.get(game) if isinstance(game, str) else None
    scenario_id = record.get("scenario_id")
    if spec is None or not isinstance(scenario_id, str):
        return False
    _, _, scenario_prefix, evaluator = spec
    level = scenario_id.removeprefix(scenario_prefix)
    return evaluator(level, record.get("observations"), record.get("metrics"), errors)


def verify_teaching_game_evidence(record: dict[str, Any]) -> dict[str, Any]:
    errors = validate_teaching_evidence_structure(record)
    errors.extend(_validate_identity(record))
    independently_passed = _evaluate_observations(record, errors) if not errors else False
    producer_claim = record.get("pass") if isinstance(record.get("pass"), bool) else None
    if producer_claim is not None and producer_claim != independently_passed:
        errors.append("producer pass claim disagrees with the fixed independent evaluator")
    verdict = "PASS" if independently_passed and not errors else "FAIL"
    receipt: dict[str, Any] = {
        "schema_version": 1,
        "verdict": verdict,
        "context_isolated": True,
        "source": SOURCE,
        "evidence_digest": canonical_evidence_digest(record),
        "unit_id": str(record.get("unit_id", "")),
        "project": str(record.get("project", "")),
        "scenario_id": str(record.get("scenario_id", "")),
        "game": str(record.get("game", "")),
        "producer_pass_claim": producer_claim,
        "independent_pass": verdict == "PASS",
        "errors": errors,
        "producer_writes_mastered": False,
        "max_producer_claim": "completed",
        "canonical_gate_status": "not-submitted",
        "canonical_gate_reason": "learner-attempt-and-gate-eligibility-required",
    }
    attempt_id = record.get("attempt_id")
    if isinstance(attempt_id, str) and attempt_id:
        receipt["attempt_id"] = attempt_id
    return receipt


def main() -> int:
    receipt = verify_teaching_game_evidence(read_bounded_evidence(sys.stdin) or {})
    sys.stdout.write(json.dumps(receipt, sort_keys=True, separators=(",", ":")) + "\n")
    return 0 if receipt["verdict"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
