from __future__ import annotations

from functools import lru_cache
import math
from typing import Any

from .evaluator_primitives import (
    base36 as _base36,
    closed_dict,
    hash32 as _hash,
    metrics_match,
    mulberry32 as _mulberry32,
    round2 as _round2,
)


ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
HOSTS = ("ada.io", "bytes.dev", "cache.net", "delta.app", "edge.run", "flux.sys")
LEVELS = {"L1": (11, False), "L2": (22, False), "L3": (33, True), "L4": (44, True)}
CODE_LEN = 4
CODE_SPACE = 62**CODE_LEN


def _urls(seed: int) -> list[str]:
    random = _mulberry32(seed)
    urls: list[str] = []
    for index in range(6):
        host = HOSTS[math.floor(random() * len(HOSTS)) % len(HOSTS)]
        path = _base36(math.floor(random() * 1e9))
        urls.append(f"https://{host}/{path}-{index}")
    return urls


def _base62(value: int) -> str:
    digits = ""
    while value:
        value, remainder = divmod(value, 62)
        digits = ALPHABET[remainder] + digits
    return digits or "0"


def _code(value: str) -> str:
    full = _base62(_hash(value))
    return full.rjust(CODE_LEN, "0") if len(full) <= CODE_LEN else full[:CODE_LEN]


@lru_cache(maxsize=1)
def _colliding_pair() -> tuple[str, str]:
    base = "https://wormhole.collide/"
    seen: dict[str, int] = {}
    for index in range(500_000):
        code = _code(f"{base}{index}")
        previous = seen.get(code)
        if previous is not None:
            return f"{base}{previous}", f"{base}{index}"
        seen[code] = index
    raise RuntimeError("no colliding pair found")


@lru_cache(maxsize=4)
def _scenario(level: str) -> tuple[tuple[str, ...], int]:
    seed, forced_collision = LEVELS[level]
    urls = _urls(seed)
    collider_index = -1
    if forced_collision:
        collider_index = len(urls) // 2
        urls[collider_index - 1], urls[collider_index] = _colliding_pair()
    return tuple(urls), collider_index


def _prediction_list(
    observations: Any,
    level: str,
    identity_key: str,
    prediction_key: str,
    prediction_type: type,
    expected_identities: list[str],
) -> list[dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictions"}):
        return None
    predictions = observations["predictions"]
    if observations["kind"] != f"wormhole-{level}" or not isinstance(predictions, list):
        return None
    if len(predictions) != len(expected_identities):
        return None
    for identity, prediction in zip(expected_identities, predictions, strict=True):
        if not closed_dict(prediction, {identity_key, prediction_key}):
            return None
        value = prediction[prediction_key]
        valid = isinstance(value, prediction_type)
        if prediction_type is not bool:
            valid = valid and not isinstance(value, bool)
        if prediction[identity_key] != identity or not valid:
            return None
    return predictions


def _evaluate_l1(observations: Any):
    urls, _ = _scenario("L1")
    predictions = _prediction_list(
        observations, "L1", "url", "predictedCode", str, list(urls)
    )
    if predictions is None:
        return None
    correct = sum(item["predictedCode"] == _code(item["url"]) for item in predictions)
    accuracy = _round2(correct / len(urls))
    return accuracy >= 0.8, {
        "code_predictions": len(urls),
        "code_prediction_accuracy": accuracy,
        "strategy": "hash_trunc",
    }


def _seed_map(urls: tuple[str, ...]) -> dict[str, str]:
    result: dict[str, str] = {}
    for url in urls:
        result.setdefault(_code(url), url)
    return result


def _evaluate_l2(observations: Any):
    urls, _ = _scenario("L2")
    short_map = _seed_map(urls)
    codes = list(short_map)
    predictions = _prediction_list(
        observations, "L2", "code", "predictedUrl", str, codes
    )
    if predictions is None or len(codes) != len(urls):
        return None
    correct = sum(item["predictedUrl"] == short_map[item["code"]] for item in predictions)
    accuracy = _round2(correct / len(urls))
    return accuracy >= 0.8, {
        "redirect_predictions": len(urls),
        "redirect_prediction_accuracy": accuracy,
    }


def _evaluate_l3(observations: Any):
    urls, _ = _scenario("L3")
    predictions = _prediction_list(
        observations, "L3", "url", "predictedCollision", bool, list(urls)
    )
    if predictions is None:
        return None
    short_map: dict[str, str] = {}
    correct = 0
    collisions = 0
    for item in predictions:
        code = _code(item["url"])
        collision = code in short_map and short_map[code] != item["url"]
        collisions += int(collision)
        correct += int(item["predictedCollision"] is collision)
        short_map.setdefault(code, item["url"])
    accuracy = _round2(correct / len(urls))
    return accuracy >= 0.8, {
        "collision_predictions": len(urls),
        "collision_prediction_accuracy": accuracy,
        "collisions_present": collisions,
    }


def _resolve_salted(short_map: dict[str, str], url: str) -> str:
    attempt = 0
    while True:
        candidate = _code(f"{url}#{attempt}")
        if candidate not in short_map or short_map[candidate] == url:
            return candidate
        attempt += 1


def _resolve_increment(short_map: dict[str, str], code: str) -> str:
    value = sum(ALPHABET.index(character) * 62**index for index, character in enumerate(reversed(code)))
    for _ in range(CODE_SPACE):
        candidate = _base62(value).rjust(CODE_LEN, "0")[:CODE_LEN]
        if candidate not in short_map:
            return candidate
        value = (value + 1) % CODE_SPACE
    raise RuntimeError("code space exhausted")


def _evaluate_l4(observations: Any):
    urls, collider_index = _scenario("L4")
    if not closed_dict(observations, {"kind", "colliderUrl", "chosenResolution"}):
        return None
    collider_url = urls[collider_index]
    chosen = observations["chosenResolution"]
    if (
        observations["kind"] != "wormhole-L4"
        or observations["colliderUrl"] != collider_url
        or not isinstance(chosen, str)
        or chosen not in {"salted", "increment"}
    ):
        return None
    first_url = urls[collider_index - 1]
    colliding_code = _code(collider_url)
    short_map = {_code(first_url): first_url}
    resolved_code = (
        _resolve_salted(short_map, collider_url)
        if chosen == "salted"
        else _resolve_increment(short_map, colliding_code)
    )
    resolved = resolved_code not in short_map or short_map[resolved_code] == collider_url
    short_map[resolved_code] = collider_url
    redirect_ok = short_map.get(resolved_code) == collider_url
    return resolved and redirect_ok, {
        "resolution_chosen": chosen,
        "resolved_code": resolved_code,
        "resolved_unique": resolved,
        "redirect_ok": redirect_ok,
    }


def evaluate_wormhole(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported WORMHOLE level")
        return False
    evaluated = {
        "L1": _evaluate_l1,
        "L2": _evaluate_l2,
        "L3": _evaluate_l3,
        "L4": _evaluate_l4,
    }[level](observations)
    if evaluated is None:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    passed, expected_metrics = evaluated
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
