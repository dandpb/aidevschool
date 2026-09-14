"""Independent evaluator for the HASH RING teaching game (U10 distributed cache).

The verifier replays the player's bounded trace against the deterministic
key stream and ring topology seeded by the level config — it never trusts
the producer's metrics or ``pass`` claim.

Ring model (mirror of ``engines/voxelDojo/game-10-hash-ring/src/sim``): ring
hash = murmur3-fmix32 finalizer over FNV-1a 32-bit (``hash.ts``); consistent
hashing assigns each key to the first anchor clockwise (``ring.ts``); the
naive contrast model assigns ``sortedStations[hash % N]``. Keys stream from
mulberry32 (``rng.ts`` / ``levels.ts``); L2 locks 32 vnodes per station
(``GameController.freshState``) while L1/L4 keep 1, and L4 routes through
``moduloAssign`` instead of ``assign``.

Level table (mirror of ``src/sim/levels.ts``): seeds 11/22/33/44, key counts
12/400/600/400, skew 0/0/0.5/0, start stations 3/4/4/4, events
none/join/none/join, modulo off/off/off/on.

Ground truth (pinned by ``test_hash_ring_evaluator.py`` and cross-checked
against the TS sim): the L1 owner trace over the seeded wave; the L2 join
from 4x32-vnode stations + ``st-new`` moves 106 keys (ratio 0.27) and the
biggest loser is ``st-2`` (44 keys lost); L3 needs vnodes > 1 to bring skew
<= 1.6 (v=1 gives 3.14); the L4 modulo join moves 320 keys (ratio 0.8).

Observation contract (closed per level):

- L1 ``{"kind": "hash-ring-L1", "predictions": [<station id> x 12]}``
- L2 ``{"kind": "hash-ring-L2", "predictedLoser": <station id>}``
- L3 ``{"kind": "hash-ring-L3", "vnodes": <int 1..64>}``
- L4 ``{"kind": "hash-ring-L4", "consistent": <0.2|0.5|0.8>, "modulo": <0.2|0.5|0.8>}``

``predictions[i]`` is the station the player predicted owns ``keys[i]``.
``predictedLoser`` is the station the player predicted loses the most keys
to the incoming ``st-new``. ``vnodes`` is the dial value locked in. The L4
answers are the two multiple-choice moved-fraction picks (correct pair:
consistent 0.2, modulo 0.8). Producer metrics must match the recomputed
metrics exactly.
"""

from __future__ import annotations

from bisect import bisect_left
from typing import Any

from .evaluator_primitives import base36, closed_dict, metrics_match, mulberry32, round2

MASK32 = 0xFFFFFFFF
METRIC_KIND = "voxeldoj-hash-ring"
STATIONS_L1 = ("st-0", "st-1", "st-2")
STATIONS_L2 = ("st-0", "st-1", "st-2", "st-3")
CONTRAST_OPTIONS = (0.2, 0.5, 0.8)
CONTRAST_CORRECT = {"consistent": 0.2, "modulo": 0.8}

# Mirrors game-10-hash-ring/src/sim/levels.ts (LEVELS table) plus the
# controller's vnode choice (L2 runs 32 vnodes per station, others 1).
LEVELS: dict[str, dict[str, Any]] = {
    "L1": {"seed": 11, "keys": 12, "skew": 0.0, "stations": 3, "vnodes": 1},
    "L2": {"seed": 22, "keys": 400, "skew": 0.0, "stations": 4, "vnodes": 32},
    "L3": {"seed": 33, "keys": 600, "skew": 0.5, "stations": 4, "vnodes": 1},
    "L4": {"seed": 44, "keys": 400, "skew": 0.0, "stations": 4, "vnodes": 1},
}


def _fnv1a(value: str) -> int:
    hashed = 0x811C9DC5
    for character in value:
        hashed = ((hashed ^ ord(character)) * 0x01000193) & MASK32
    return hashed


def _ring_hash(value: str) -> int:
    """fmix32(fnv1a(value)) — mirrors hash.ts ringHash."""
    hashed = _fnv1a(value)
    hashed ^= hashed >> 16
    hashed = (hashed * 0x85EBCA6B) & MASK32
    hashed ^= hashed >> 13
    hashed = (hashed * 0xC2B2AE35) & MASK32
    return (hashed ^ (hashed >> 16)) & MASK32


def _keys_for(cfg: dict[str, Any]) -> list[str]:
    """Mirrors rng.ts keyStream over mulberry32(level seed)."""
    rng = mulberry32(cfg["seed"])
    keys: list[str] = []
    for index in range(cfg["keys"]):
        if cfg["skew"] > 0 and rng() < cfg["skew"]:
            keys.append(f"hot:{int(rng() * 50)}")
        else:
            keys.append(f"key:{base36(int(rng() * 1e9))}:{index}")
    return keys


def _anchors(station_ids: tuple[str, ...], vnodes: int) -> list[tuple[int, str]]:
    """Mirrors ring.ts anchorsOf: `<id>#<v>` ring hashes sorted clockwise."""
    anchors: list[tuple[int, str]] = []
    for station_id in station_ids:
        for vnode in range(max(1, vnodes)):
            anchors.append((_ring_hash(f"{station_id}#{vnode}"), station_id))
    anchors.sort(key=lambda anchor: anchor[0])
    return anchors


def _owner_of(key_hash: int, hashes: list[int], anchors: list[tuple[int, str]]) -> str:
    """First anchor clockwise (binary search + wrap) — mirrors ring.ts ownerOf."""
    if key_hash > hashes[-1]:
        return anchors[0][1]
    position = bisect_left(hashes, key_hash)
    return anchors[position][1]


def _assign(keys: list[str], station_ids: tuple[str, ...], vnodes: int) -> dict[str, str]:
    anchors = _anchors(station_ids, vnodes)
    hashes = [hash_value for hash_value, _ in anchors]
    return {key: _owner_of(_ring_hash(key), hashes, anchors) for key in keys}


def _modulo_assign(keys: list[str], station_ids: tuple[str, ...]) -> dict[str, str]:
    ids = sorted(station_ids)
    return {key: ids[_ring_hash(key) % len(ids)] for key in keys}


def _biggest_loser(keys: list[str], before: dict[str, str], after: dict[str, str]) -> str:
    """Mirrors GameController.computeBiggestLoser: keys lost per previous owner;
    the first-seen strict maximum wins (Map iteration = moved-key order)."""
    lost: dict[str, int] = {}
    for key in keys:
        if after[key] != before[key]:
            owner = before[key]
            lost[owner] = lost.get(owner, 0) + 1
    best = ""
    best_count = -1
    for station_id, count in lost.items():
        if count > best_count:
            best = station_id
            best_count = count
    return best


def _evaluate_topology_change(
    keys: list[str],
    before: dict[str, str],
    after: dict[str, str],
    modulo_mode: bool,
    predicted_loser: str,
    actual_loser: str,
    contrast_stated: bool,
    stations_before: int,
) -> tuple[bool, dict[str, Any]]:
    """Mirrors levels.ts evaluateTopologyChange (modulo or consistent assign)."""
    moved = sum(1 for key in keys if after[key] != before[key])
    moved_ratio = moved / len(keys) if keys else 0.0
    stations_after = stations_before + 1  # both L2 and L4 are join events
    theoretical = (stations_after - stations_before) / stations_after
    prediction_ok = predicted_loser == actual_loser
    within_bound = True if modulo_mode else moved_ratio <= theoretical * 1.75 + 0.02
    survived = contrast_stated if modulo_mode else True
    metrics: dict[str, Any] = {
        "kind": METRIC_KIND,
        "moved_keys": moved,
        "moved_ratio": round2(moved_ratio),
        "theoretical_kn": round2(theoretical),
        "arc_prediction_ok": prediction_ok,
        "modulo_mode": modulo_mode,
        "modulo_contrast_stated": contrast_stated,
    }
    return prediction_ok and within_bound and survived, metrics


def _reject(errors: list[str], level: str) -> None:
    errors.append(f"observations do not match the closed {level} scenario trace")


def _station_list(value: Any, stations: tuple[str, ...], count: int) -> bool:
    return (
        isinstance(value, list)
        and len(value) == count
        and all(isinstance(item, str) and item in stations for item in value)
    )


def _hash_l1(
    cfg: dict[str, Any], keys: list[str], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictions"}):
        return _reject(errors, "L1")
    predictions = observations["predictions"]
    if observations["kind"] != "hash-ring-L1" or not _station_list(
        predictions, STATIONS_L1, cfg["keys"]
    ):
        return _reject(errors, "L1")
    anchors = _anchors(tuple(f"st-{i}" for i in range(cfg["stations"])), cfg["vnodes"])
    hashes = [hash_value for hash_value, _ in anchors]
    correct = sum(
        1
        for key, predicted in zip(keys, predictions)
        if predicted == _owner_of(_ring_hash(key), hashes, anchors)
    )
    raw_accuracy = correct / cfg["keys"]
    metrics = {
        "kind": METRIC_KIND,
        "owner_predictions": cfg["keys"],
        "owner_prediction_accuracy": round2(raw_accuracy),
    }
    return raw_accuracy >= 0.8, metrics


def _hash_l2(
    cfg: dict[str, Any], keys: list[str], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedLoser"}):
        return _reject(errors, "L2")
    predicted_loser = observations["predictedLoser"]
    if (
        observations["kind"] != "hash-ring-L2"
        or not isinstance(predicted_loser, str)
        or predicted_loser not in STATIONS_L2
    ):
        return _reject(errors, "L2")
    base_ids = tuple(f"st-{i}" for i in range(cfg["stations"]))
    before = _assign(keys, base_ids, cfg["vnodes"])
    after = _assign(keys, base_ids + ("st-new",), cfg["vnodes"])
    actual_loser = _biggest_loser(keys, before, after)
    return _evaluate_topology_change(
        keys, before, after, False, predicted_loser, actual_loser, False, cfg["stations"]
    )


def _valid_vnodes(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and 1 <= value <= 64


def _hash_l3(
    cfg: dict[str, Any], keys: list[str], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "vnodes"}):
        return _reject(errors, "L3")
    vnodes = observations["vnodes"]
    if observations["kind"] != "hash-ring-L3" or not _valid_vnodes(vnodes):
        return _reject(errors, "L3")
    assignment = _assign(keys, tuple(f"st-{i}" for i in range(cfg["stations"])), vnodes)
    counts = [0] * cfg["stations"]
    for owner in assignment.values():
        counts[int(owner.split("-")[1])] += 1
    mean = sum(counts) / len(counts)
    skew = 1.0 if mean == 0 else max(counts) / mean
    metrics = {
        "kind": METRIC_KIND,
        "load_skew": round2(skew),
        "vnodes_used": vnodes,
    }
    return skew <= 1.6 and vnodes > 1, metrics


def _contrast_answer(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and value in CONTRAST_OPTIONS
    )


def _hash_l4(
    cfg: dict[str, Any], keys: list[str], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "consistent", "modulo"}):
        return _reject(errors, "L4")
    consistent = observations["consistent"]
    modulo = observations["modulo"]
    if (
        observations["kind"] != "hash-ring-L4"
        or not _contrast_answer(consistent)
        or not _contrast_answer(modulo)
    ):
        return _reject(errors, "L4")
    base_ids = tuple(f"st-{i}" for i in range(cfg["stations"]))
    before = _modulo_assign(keys, base_ids)
    after = _modulo_assign(keys, base_ids + ("st-new",))
    contrast_stated = (
        consistent == CONTRAST_CORRECT["consistent"]
        and modulo == CONTRAST_CORRECT["modulo"]
    )
    # The controller short-circuits the loser prediction to "n/a" on L4.
    return _evaluate_topology_change(
        keys, before, after, True, "n/a", "n/a", contrast_stated, cfg["stations"]
    )


_LEVEL_HANDLERS = {
    "L1": _hash_l1,
    "L2": _hash_l2,
    "L3": _hash_l3,
    "L4": _hash_l4,
}


def evaluate_hash_ring(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported HASH RING level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False

    cfg = LEVELS[level]
    keys = _keys_for(cfg)
    outcome = _LEVEL_HANDLERS[level](cfg, keys, observations, errors)
    if outcome is None:
        return False
    passed, expected = outcome
    if not metrics_match(producer_metrics, expected):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
