from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Final

from ..contracts import (
    Cycle,
    JsonValue,
    LessonRecord,
    WorkflowError,
)


TIMESTAMP_FORMAT: Final = "%Y-%m-%dT%H:%M:%SZ"


@dataclass(frozen=True, slots=True)
class CacheEntry:
    key: str
    value: JsonValue
    last_accessed_at: datetime
    expires_at: datetime | None


def parse_timestamp(value: JsonValue, field: str) -> datetime:
    if not isinstance(value, str):
        raise WorkflowError(f"{field} must be a canonical UTC timestamp")
    try:
        parsed = datetime.strptime(value, TIMESTAMP_FORMAT)
    except ValueError:
        raise WorkflowError(f"{field} must be a canonical UTC timestamp") from None
    if parsed.strftime(TIMESTAMP_FORMAT) != value:
        raise WorkflowError(f"{field} must be a canonical UTC timestamp")
    return parsed


def build_retry_schedule(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    start_at = cycle.payload.get("start_at")
    attempts = cycle.payload.get("attempts")
    base_seconds = cycle.payload.get("base_seconds")
    cap_seconds = cycle.payload.get("cap_seconds")
    if (
        not isinstance(attempts, int)
        or isinstance(attempts, bool)
        or attempts <= 0
        or not isinstance(base_seconds, int)
        or isinstance(base_seconds, bool)
        or base_seconds <= 0
        or not isinstance(cap_seconds, int)
        or isinstance(cap_seconds, bool)
        or cap_seconds <= 0
    ):
        raise WorkflowError(
            "attempts, base_seconds, and cap_seconds must be positive integers"
        )
    scheduled_at = parse_timestamp(start_at, "start_at")
    schedule: list[JsonValue] = []
    for attempt in range(1, attempts + 1):
        delay_before_seconds = (
            0 if attempt == 1 else min(base_seconds * 2 ** (attempt - 2), cap_seconds)
        )
        scheduled_at += timedelta(seconds=delay_before_seconds)
        schedule.append(
            {
                "attempt": attempt,
                "delay_before_seconds": delay_before_seconds,
                "scheduled_at": scheduled_at.strftime(TIMESTAMP_FORMAT),
            }
        )
    artifact: dict[str, JsonValue] = {"schedule": schedule}
    return (json.dumps(artifact, ensure_ascii=False, sort_keys=True) + "\n").encode()


def snapshot_ttl_cache(cycle: Cycle, resolved: tuple[LessonRecord, ...]) -> bytes:
    del resolved
    now = parse_timestamp(cycle.payload.get("now"), "now")
    max_entries = cycle.payload.get("max_entries")
    raw_entries = cycle.payload.get("entries")
    if (
        not isinstance(max_entries, int)
        or isinstance(max_entries, bool)
        or max_entries < 0
    ):
        raise WorkflowError("max_entries must be a non-negative integer")
    if not isinstance(raw_entries, list):
        raise WorkflowError("entries must be a JSON array")
    entries: list[CacheEntry] = []
    keys: set[str] = set()
    for raw_entry in raw_entries:
        if not isinstance(raw_entry, dict):
            raise WorkflowError("entries must contain JSON objects")
        key = raw_entry.get("key")
        if not isinstance(key, str):
            raise WorkflowError("entry key must be a string")
        if key in keys:
            raise WorkflowError(f"duplicate cache key {key}")
        if (
            "value" not in raw_entry
            or "last_accessed_at" not in raw_entry
            or "expires_at" not in raw_entry
        ):
            raise WorkflowError(
                "entry must include value, last_accessed_at, and expires_at"
            )
        expires_at_value = raw_entry["expires_at"]
        expires_at = (
            None
            if expires_at_value is None
            else parse_timestamp(expires_at_value, "expires_at")
        )
        entries.append(
            CacheEntry(
                key=key,
                value=raw_entry["value"],
                last_accessed_at=parse_timestamp(
                    raw_entry["last_accessed_at"], "last_accessed_at"
                ),
                expires_at=expires_at,
            )
        )
        keys.add(key)
    eligible: list[CacheEntry] = []
    expired_keys: list[str] = []
    for entry in entries:
        if entry.expires_at is not None and entry.expires_at <= now:
            expired_keys.append(entry.key)
        else:
            eligible.append(entry)
    eligible.sort(key=lambda entry: (entry.last_accessed_at, entry.key))
    evicted = eligible[: max(0, len(eligible) - max_entries)]
    remaining = eligible[len(evicted) :]
    remaining.sort(key=lambda entry: entry.key)
    expired_keys.sort()
    snapshot_entries: list[JsonValue] = []
    for entry in remaining:
        snapshot_entries.append(
            {
                "key": entry.key,
                "value": entry.value,
                "last_accessed_at": entry.last_accessed_at.strftime(TIMESTAMP_FORMAT),
                "expires_at": (
                    None
                    if entry.expires_at is None
                    else entry.expires_at.strftime(TIMESTAMP_FORMAT)
                ),
            }
        )
    evicted_key_values: list[JsonValue] = []
    for entry in evicted:
        evicted_key_values.append(entry.key)
    expired_key_values: list[JsonValue] = []
    for key in expired_keys:
        expired_key_values.append(key)
    artifact: dict[str, JsonValue] = {
        "entries": snapshot_entries,
        "evicted_keys": evicted_key_values,
        "expired_keys": expired_key_values,
    }
    return (json.dumps(artifact, ensure_ascii=False, sort_keys=True) + "\n").encode()
