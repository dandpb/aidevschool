from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, mulberry32, round2


# Deterministic scenario table for DOCKING BAY, mirrored from
# engines/voxelDojo/game-09-docking-bay/src/sim/levels.ts (seeds 11/22/33/44).
# The L1/L2 pod waves and the L3 sandbox cap are regenerated with the shared
# mulberry32 port (identical draws to the TS filter loops); the L4 required
# calls come from the V8 sort shuffle, cross-checked against the TS sim and
# pinned by the package determinism tests. The verifier never trusts the
# producer's waves; it recomputes every outcome from the player's bounded
# inputs.
HOST_CONTRACT = ["connect", "readState", "writeState", "log"]
CAPABILITIES = frozenset(HOST_CONTRACT)


def _pod_claims(seed: int, count: int) -> list[list[str]]:
    rng = mulberry32(seed)
    pods: list[list[str]] = []
    for _ in range(count):
        claims = [c for c in HOST_CONTRACT if not (rng() < 0.5 and c != "connect")]
        # The TS wave also draws the (unused here) capability flags — consume the
        # same four draws so the shared rng stream stays aligned per pod.
        [rng() > 0.35 for _ in HOST_CONTRACT]
        pods.append(claims if claims else ["connect"])
    return pods


L1_CLAIMS = _pod_claims(11, 6)
L2_CLAIMS = _pod_claims(22, 5)
# Dock truth mirrors the clamp's own contract check (sim/plugin.ts
# checkContract): a pod docks iff its claim covers EVERY host method
# (HOST ⊆ claims). The reverse direction (claims ⊆ HOST) holds for every
# generated pod by construction and would make the truth constant-true —
# the AID-467 defect, rejected here by construction.
L1_DOCK_TRUTH = [all(host in claims for host in HOST_CONTRACT) for claims in L1_CLAIMS]
L2_MISSING_TRUTH = [
    next((c for c in HOST_CONTRACT if c not in claims), "none") for claims in L2_CLAIMS
]


def _sandbox_cap() -> list[str]:
    rng = mulberry32(33)
    requestable = [c for c in HOST_CONTRACT if rng() > 0.5]
    return requestable if requestable else ["readState"]


L3_SANDBOX_CAP = _sandbox_cap()
L3_INVOKED = list(HOST_CONTRACT)
# L4: the two required calls drawn by the seeded V8 shuffle; sufficient AND
# minimal means the player's set equals exactly this pair.
L4_REQUIRED = ["connect", "writeState"]


def _pod_id_list(value: Any) -> bool:
    return (
        isinstance(value, list)
        and all(isinstance(item, dict) and isinstance(item.get("podId"), str) for item in value)
    )


def _dock_wave_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "dockPredictions"}):
        return None
    predictions = observations["dockPredictions"]
    if observations["kind"] != "docking-bay-L1" or not _pod_id_list(predictions):
        return None
    if len(predictions) != len(L1_DOCK_TRUTH):
        return None
    expected_ids = [f"pod-{index}" for index in range(len(L1_DOCK_TRUTH))]
    if [item["podId"] for item in predictions] != expected_ids:
        return None
    if not all(isinstance(item.get("predictedDock"), bool) for item in predictions):
        return None
    correct = sum(
        1
        for item, truth in zip(predictions, L1_DOCK_TRUTH)
        if item["predictedDock"] == truth
    )
    accuracy = correct / len(L1_DOCK_TRUTH)
    return (
        accuracy >= 0.8,
        {
            "kind": "voxeldoj-docking-bay",
            "dock_predictions": len(L1_DOCK_TRUTH),
            "dock_prediction_accuracy": round2(accuracy),
            "contracts_checked": len(L1_DOCK_TRUTH),
        },
    )


def _mismatch_wave_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "missingPredictions"}):
        return None
    predictions = observations["missingPredictions"]
    if observations["kind"] != "docking-bay-L2" or not _pod_id_list(predictions):
        return None
    if len(predictions) != len(L2_MISSING_TRUTH):
        return None
    expected_ids = [f"pod-{index}" for index in range(len(L2_MISSING_TRUTH))]
    if [item["podId"] for item in predictions] != expected_ids:
        return None
    if not all(
        item.get("predictedMissing") in CAPABILITIES or item.get("predictedMissing") == "none"
        for item in predictions
    ):
        return None
    correct = sum(
        1
        for item, truth in zip(predictions, L2_MISSING_TRUTH)
        if item["predictedMissing"] == truth
    )
    accuracy = correct / len(L2_MISSING_TRUTH)
    return (
        accuracy == 1,
        {
            "kind": "voxeldoj-docking-bay",
            "mismatch_predictions": len(L2_MISSING_TRUTH),
            "mismatch_prediction_accuracy": round2(accuracy),
            "missing_methods_named": correct,
        },
    )


def _sandbox_wave_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "classifications"}):
        return None
    classifications = observations["classifications"]
    if observations["kind"] != "docking-bay-L3" or not isinstance(classifications, list):
        return None
    if len(classifications) != len(L3_INVOKED):
        return None
    if not all(
        isinstance(item, dict) and item.get("method") in CAPABILITIES
        for item in classifications
    ):
        return None
    if [item["method"] for item in classifications] != L3_INVOKED:
        return None
    if not all(isinstance(item.get("predictedAllow"), bool) for item in classifications):
        return None
    correct = sum(
        1
        for item, method in zip(classifications, L3_INVOKED)
        if item["predictedAllow"] == (method in L3_SANDBOX_CAP)
    )
    accuracy = correct / len(L3_INVOKED)
    return (
        accuracy == 1,
        {
            "kind": "voxeldoj-docking-bay",
            "sandbox_probes": len(L3_INVOKED),
            "sandbox_accuracy": round2(accuracy),
            "capabilities_granted": len(L3_SANDBOX_CAP),
        },
    )


def _capability_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "chosenCapabilities"}):
        return None
    chosen = observations["chosenCapabilities"]
    if observations["kind"] != "docking-bay-L4":
        return None
    if not isinstance(chosen, list) or not set(chosen) <= CAPABILITIES:
        return None
    required_set = set(L4_REQUIRED)
    chosen_set = set(chosen)
    sufficient = required_set <= chosen_set
    minimal = chosen_set <= required_set
    passed = sufficient and minimal
    return (
        passed,
        {
            "kind": "voxeldoj-docking-bay",
            "required_calls_covered": sufficient,
            "no_overgrant": minimal,
            "least_privilege": passed,
            "granted_count": len(chosen),
            "required_count": len(L4_REQUIRED),
        },
    )


def evaluate_docking(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in {"L1", "L2", "L3", "L4"}:
        errors.append("unsupported DOCKING BAY level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    evaluated = {
        "L1": _dock_wave_result,
        "L2": _mismatch_wave_result,
        "L3": _sandbox_wave_result,
        "L4": _capability_result,
    }[level](observations)
    if evaluated is None:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    passed, expected_metrics = evaluated
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
