"""Independent evaluator for the OBSERVATORY teaching game (U15 metrics collector).

The verifier replays the player's bounded trace against the deterministic
histogram and sample stream seeded by the level config — it never trusts the
producer's metrics or ``pass`` claim.

Observation contract (closed per level):

- L1 ``{"kind": "observatory-L1", "predictions": [<bucket int 0..8> x 12]}``
- L2 ``{"kind": "observatory-L2", "predictedBucket": <bucket int 0..7>}``
- L3 ``{"kind": "observatory-L3", "setSlo": <float 0..1>, "predictedFiring": <bool>}``
- L4 ``{"kind": "observatory-L4", "chosenId": <"tight" | "fat">}``
"""

from __future__ import annotations

import math
from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, mulberry32

METRIC_KIND = "voxeldoj-observatory"
N_BUCKETS = 8
BOUNDARIES: tuple[float, ...] = tuple(
    round((1.0 / N_BUCKETS) * i, 6) for i in range(1, N_BUCKETS + 1)
)

LEVELS: dict[str, dict[str, Any]] = {
    "L1": {"seed": 11, "sample_count": 12, "skew": 0.0, "watch_p": 95, "slo": None},
    "L2": {"seed": 22, "sample_count": 1000, "skew": 0.6, "watch_p": 95, "slo": None},
    "L3": {"seed": 33, "sample_count": 1000, "skew": 0.5, "watch_p": 95, "slo": 0.75},
    "L4": {"seed": 44, "sample_count": 1000, "skew": 0.0, "watch_p": 95, "slo": 0.7},
}


def _round3(value: float) -> float:
    return math.floor(value * 1000 + 0.5) / 1000


def _round6(value: float) -> float:
    return math.floor(value * 1_000_000 + 0.5) / 1_000_000


def _samples_for(cfg: dict[str, Any]) -> list[float]:
    rng = mulberry32(cfg["seed"])
    skew = cfg["skew"]
    samples: list[float] = []
    for _ in range(cfg["sample_count"]):
        u = rng()
        samples.append(u ** (1.0 / (1.0 + skew * 2.0)) if skew > 0 else u)
    return samples


def _bucket_index(value: float) -> int:
    for idx, bound in enumerate(BOUNDARIES):
        if value <= bound:
            return idx
    return len(BOUNDARIES)


def _record_all(values: list[float]) -> list[int]:
    counts = [0] * (N_BUCKETS + 1)
    for v in values:
        counts[_bucket_index(v)] += 1
    return counts


def _lower_bound(idx: int) -> float:
    return 0.0 if idx == 0 else BOUNDARIES[idx - 1]


def _upper_bound(idx: int) -> float:
    return BOUNDARIES[-1] if idx >= len(BOUNDARIES) else BOUNDARIES[idx]


def _percentile(counts: list[int], p: int) -> float:
    total = sum(counts)
    rank = (p / 100.0) * total
    running = 0
    for idx, count in enumerate(counts):
        prev = running
        running += count
        if running >= rank:
            lo, hi = _lower_bound(idx), _upper_bound(idx)
            if count == 0:
                return hi
            return _round6(lo + (hi - lo) * ((rank - prev) / count))
    return _round6(BOUNDARIES[-1])


def _mean_from_counts(counts: list[int]) -> float:
    total = sum(counts)
    weighted = sum(
        ((_lower_bound(i) + _upper_bound(i)) / 2.0) * count
        for i, count in enumerate(counts)
    )
    return _round6(weighted / total)


def _pvalue_bucket(p_value: float) -> int:
    for idx, bound in enumerate(BOUNDARIES):
        if p_value <= bound:
            return idx
    return len(BOUNDARIES) - 1


def _reject(errors: list[str], level: str) -> None:
    errors.append(f"observations do not match the closed {level} scenario trace")


def _valid_int_list(items: Any, length: int, upper: int) -> bool:
    return (
        isinstance(items, list)
        and len(items) == length
        and all(
            isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= upper
            for x in items
        )
    )


def _observatory_l1(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictions"}):
        _reject(errors, "L1")
        return None
    preds = observations["predictions"]
    samples = _samples_for(cfg)
    if observations["kind"] != "observatory-L1" or not _valid_int_list(
        preds, len(samples), N_BUCKETS
    ):
        _reject(errors, "L1")
        return None
    correct = sum(
        1 for sample, pred in zip(samples, preds) if _bucket_index(sample) == pred
    )
    accuracy = correct / len(samples)
    metrics = {
        "kind": METRIC_KIND,
        "bucket_predictions": len(samples),
        "bucket_prediction_accuracy": _round3(accuracy),
    }
    return accuracy >= 0.8, metrics


def _observatory_l2(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedBucket"}):
        _reject(errors, "L2")
        return None
    pred = observations["predictedBucket"]
    valid_pred = (
        isinstance(pred, int) and not isinstance(pred, bool) and 0 <= pred < N_BUCKETS
    )
    if observations["kind"] != "observatory-L2" or not valid_pred:
        _reject(errors, "L2")
        return None
    counts = _record_all(_samples_for(cfg))
    p_value = _percentile(counts, cfg["watch_p"])
    actual = _pvalue_bucket(p_value)
    ok = pred == actual
    metrics = {
        "kind": METRIC_KIND,
        "percentile_bucket_prediction_ok": ok,
        "predicted_bucket": pred,
        "actual_bucket": actual,
        "watched_percentile": cfg["watch_p"],
        "percentile_value": _round3(p_value),
    }
    return ok, metrics


def _valid_slo(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
        and 0.0 <= float(value) <= 1.0
    )


def _observatory_l3(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "setSlo", "predictedFiring"}):
        _reject(errors, "L3")
        return None
    set_slo = observations["setSlo"]
    pred_firing = observations["predictedFiring"]
    if (
        observations["kind"] != "observatory-L3"
        or not _valid_slo(set_slo)
        or not isinstance(pred_firing, bool)
    ):
        _reject(errors, "L3")
        return None
    counts = _record_all(_samples_for(cfg))
    observed_p = _percentile(counts, cfg["watch_p"])
    slo_float = float(set_slo)
    target = float(cfg["slo"])
    actual_firing = observed_p > slo_float
    slo_ok = abs(slo_float - target) <= 0.03
    pred_ok = pred_firing is actual_firing
    metrics = {
        "kind": METRIC_KIND,
        "alert_prediction_ok": pred_ok,
        "slo_set": _round3(slo_float),
        "slo_target": target,
        "slo_set_ok": slo_ok,
        "observed_percentile": _round3(observed_p),
        "alert_actually_firing": actual_firing,
        "predicted_firing": pred_firing,
        "watched_percentile": cfg["watch_p"],
    }
    return slo_ok and pred_ok, metrics


def _contrast_counts(count: int) -> tuple[list[int], list[int]]:
    tight_vals = [0.4 + (i / count) * 0.2 for i in range(count)]
    fat_vals = [0.05 if i % 2 == 0 else 0.95 for i in range(count)]
    return _record_all(tight_vals), _record_all(fat_vals)


def _observatory_l4(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "chosenId"}):
        _reject(errors, "L4")
        return None
    chosen = observations["chosenId"]
    if observations["kind"] != "observatory-L4" or chosen not in {"tight", "fat"}:
        _reject(errors, "L4")
        return None
    tight_counts, fat_counts = _contrast_counts(cfg["sample_count"])
    watch_p = cfg["watch_p"]
    slo = float(cfg["slo"])
    p_tight = _percentile(tight_counts, watch_p)
    p_fat = _percentile(fat_counts, watch_p)
    firing_tight = p_tight > slo
    firing_fat = p_fat > slo
    alerting = "tight" if firing_tight else ("fat" if firing_fat else "none")
    ok = chosen == alerting
    metrics = {
        "kind": METRIC_KIND,
        "distribution_choice_ok": ok,
        "chosen": chosen,
        "alerting": alerting,
        "slo": slo,
        "watched_percentile": watch_p,
        "mean_tight": _round3(_mean_from_counts(tight_counts)),
        f"p{watch_p}_tight": _round3(p_tight),
        "firing_tight": firing_tight,
        "mean_fat": _round3(_mean_from_counts(fat_counts)),
        f"p{watch_p}_fat": _round3(p_fat),
        "firing_fat": firing_fat,
    }
    return ok, metrics


_LEVEL_HANDLERS = {
    "L1": _observatory_l1,
    "L2": _observatory_l2,
    "L3": _observatory_l3,
    "L4": _observatory_l4,
}


def evaluate_observatory(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported OBSERVATORY level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    outcome = _LEVEL_HANDLERS[level](LEVELS[level], observations, errors)
    if outcome is None:
        return False
    passed, expected = outcome
    if not metrics_match(producer_metrics, expected):
        errors.append(
            "producer metrics disagree with independently recomputed observations"
        )
        return False
    return passed
