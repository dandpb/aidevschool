from __future__ import annotations

import math
from typing import Any

_MASK32 = 0xFFFFFFFF


def _bool_metric_matches(actual: Any, expected: Any) -> bool:
    return isinstance(actual, bool) and actual is expected


def _number_metric_matches(actual: Any, expected: Any) -> bool:
    return (
        isinstance(actual, (int, float))
        and not isinstance(actual, bool)
        and math.isfinite(actual)
        and math.isclose(actual, expected)
    )


def mulberry32(seed: int):
    state = seed & _MASK32

    def next_value() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & _MASK32
        value = state
        value = ((value ^ (value >> 15)) * (value | 1)) & _MASK32
        value ^= (value + (((value ^ (value >> 7)) * (value | 61)) & _MASK32)) & _MASK32
        return ((value ^ (value >> 14)) & _MASK32) / 0x100000000

    return next_value


def base36(value: int) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    digits = ""
    while value:
        value, remainder = divmod(value, 36)
        digits = alphabet[remainder] + digits
    return digits or "0"


def hash32(value: str, strength: int | str = "full") -> int:
    limit = (
        len(value) if isinstance(strength, str) else max(1, min(strength, len(value)))
    )
    hashed = 0x811C9DC5
    for character in value[:limit]:
        hashed = ((hashed ^ ord(character)) * 0x01000193) & _MASK32
    hashed ^= hashed >> 16
    hashed = (hashed * 0x85EBCA6B) & _MASK32
    hashed ^= hashed >> 13
    hashed = (hashed * 0xC2B2AE35) & _MASK32
    return (hashed ^ (hashed >> 16)) & _MASK32


def round2(value: float) -> float:
    return math.floor(value * 100 + 0.5) / 100


def closed_dict(value: Any, keys: set[str]) -> bool:
    return isinstance(value, dict) and set(value) == keys


def metrics_match(actual: Any, expected: dict[str, Any]) -> bool:
    if not isinstance(actual, dict) or set(actual) != set(expected):
        return False
    for key, expected_value in expected.items():
        value = actual[key]
        # isinstance, not type() lookup: an int/float subclass must still match.
        if isinstance(expected_value, bool):
            if not _bool_metric_matches(value, expected_value):
                return False
        elif isinstance(expected_value, (int, float)):
            if not _number_metric_matches(value, expected_value):
                return False
        elif value != expected_value:
            return False
    return True
