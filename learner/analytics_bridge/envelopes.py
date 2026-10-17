"""Structural validation of product analytics events (AID-5009).

Mirrors the TypeScript emitter validators rule by rule:

- literacy v2: `engines/literacyDojo/src/domain/analytics.ts`
  (`isValidAnalyticsEvent`, lines 117-192).
- OS v1: `engines/codexdojo-os-prototype/src/analytics/events.ts`
  (`analyticsEventIsValid`, lines 179-191).

Fail-closed and deterministic: every check returns violation strings collected
into one list; an empty list means valid. Fixture labels (`synthetic: true`)
are stripped before validation and are never part of an envelope.
"""
from __future__ import annotations

import math
from typing import Any

from . import vocabularies as V

# literacy v2 (analytics.ts:41-46)
LITERACY_SCHEMA_VERSION = 2
LITERACY_SOURCE = "literacydojo"
MAX_PROP_STRING_LENGTH = 120
MAX_PROP_KEY_LENGTH = 40
_PROP_KEY_PATTERN = r"^[a-zA-Z][a-zA-Z0-9_]*$"
_UUID_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
_LITERACY_ENVELOPE_KEYS = frozenset(
    {"schemaVersion", "source", "event", "eventId", "sessionId", "occurredAt", "contentVersion", "props"}
)

# OS v1 (events.ts:96-98, 181)
OS_SCHEMA_VERSION = 1
_SAFE_IDENTIFIER_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$"
_OS_ENVELOPE_KEYS = frozenset({"schemaVersion", "eventId", "name", "occurredAt", "sequence", "dimensions"})

import re  # noqa: E402  (kept next to the patterns it belongs to)

_RE_PROP_KEY = re.compile(_PROP_KEY_PATTERN)
_RE_UUID = re.compile(_UUID_PATTERN)
_RE_SAFE_ID = re.compile(_SAFE_IDENTIFIER_PATTERN)


def _is_str(value: Any) -> bool:
    return isinstance(value, str)


def _is_uuid(value: Any) -> bool:
    return _is_str(value) and bool(_RE_UUID.match(value))


def _is_iso_datetime(value: Any) -> bool:
    if not _is_str(value):
        return False
    try:
        from datetime import datetime, timezone

        datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return False
    return True


def _strip_label(ev: dict) -> dict:
    """Drop the synthetic fixture label (NC-7); it is never envelope data."""
    return {k: v for k, v in ev.items() if k != "synthetic"}


def _is_bounded_scalar(value: Any) -> bool:
    """funnelCore.isBoundedFunnelScalar equivalent: primitive, finite, short."""
    if isinstance(value, bool):
        return True
    if isinstance(value, str):
        return len(value) <= 128
    if isinstance(value, (int, float)):
        return math.isfinite(value)
    return False


# ── literacy v2 ──────────────────────────────────────────────────────────


def _literacy_props_errors(event: str, props: dict) -> list[str]:
    errors: list[str] = []
    allowed = V.LITERACY_EVENT_PROPS[event]
    optional = V.LITERACY_OPTIONAL_PROPS[event]
    for key in props:
        if key not in allowed:
            errors.append(f"literacy: prop {key!r} not allowed for {event}")
        elif len(key) > MAX_PROP_KEY_LENGTH or not _RE_PROP_KEY.match(key):
            errors.append(f"literacy: prop key {key!r} fails key policy")
    for key in allowed:
        if key not in optional and key not in props:
            errors.append(f"literacy: {event} missing required prop {key!r}")
    for key, value in props.items():
        if isinstance(value, str):
            if len(value) > MAX_PROP_STRING_LENGTH:
                errors.append(f"literacy: prop {key!r} exceeds max length")
        elif isinstance(value, bool):
            pass
        elif isinstance(value, (int, float)):
            if not math.isfinite(value):
                errors.append(f"literacy: prop {key!r} not finite")
        else:
            errors.append(f"literacy: prop {key!r} not a primitive")
    # Value vocabularies enforced inline in analytics.ts:150-190.
    if event == "activity_attempted":
        if not (_is_str(props.get("lessonId")) and props["lessonId"]):
            errors.append("literacy: activity_attempted.lessonId must be non-empty string")
        if props.get("activityType") not in V.LITERACY_ACTIVITY_TYPES:
            errors.append("literacy: activity_attempted.activityType not in vocabulary")
        if not isinstance(props.get("passed"), bool):
            errors.append("literacy: activity_attempted.passed must be bool")
    if event in {"lesson_started", "lesson_completed", "mapa_inicial_done", "lesson_brief_viewed"}:
        if not (_is_str(props.get("lessonId")) and props["lessonId"]):
            errors.append(f"literacy: {event}.lessonId must be non-empty string")
        if not (isinstance(props.get("lessonVersion"), int) and not isinstance(props.get("lessonVersion"), bool)):
            errors.append(f"literacy: {event}.lessonVersion must be integer")
    if event == "route_chosen" and props.get("route") not in V.LITERACY_ROUTES:
        errors.append("literacy: route_chosen.route not in vocabulary")
    if event == "entry_viewed" and "entry" in props and props["entry"] not in V.LITERACY_ENTRY_ROUTES:
        errors.append("literacy: entry_viewed.entry not in vocabulary")
    if event == "activity_presented":
        if not (_is_str(props.get("lessonId")) and props["lessonId"]):
            errors.append("literacy: activity_presented.lessonId must be non-empty string")
        if props.get("activityType") not in V.LITERACY_ACTIVITY_TYPES:
            errors.append("literacy: activity_presented.activityType not in vocabulary")
        idx = props.get("activityIndex")
        if not (isinstance(idx, int) and not isinstance(idx, bool) and idx >= 0):
            errors.append("literacy: activity_presented.activityIndex must be int>=0")
    return errors


def validate_literacy_event(ev: dict) -> list[str]:
    """Validate one literacy v2 envelope; [] == valid."""
    ev = _strip_label(ev if isinstance(ev, dict) else {})
    errors: list[str] = []
    extra = set(ev) - _LITERACY_ENVELOPE_KEYS
    if extra:
        errors.append(f"literacy: unexpected envelope keys {sorted(extra)}")
    if ev.get("schemaVersion") != LITERACY_SCHEMA_VERSION:
        errors.append(f"literacy: schemaVersion must be {LITERACY_SCHEMA_VERSION}")
    if ev.get("source") != LITERACY_SOURCE:
        errors.append(f"literacy: source must be {LITERACY_SOURCE!r}")
    event = ev.get("event")
    if event not in V.LITERACY_EVENT_NAMES:
        return errors + [f"literacy: event {event!r} not in vocabulary"]
    for key in ("eventId", "sessionId"):
        if not _is_uuid(ev.get(key)):
            errors.append(f"literacy: {key} not an anonymous UUID")
    if not _is_iso_datetime(ev.get("occurredAt")):
        errors.append("literacy: occurredAt not an ISO-8601 timestamp")
    if not (_is_str(ev.get("contentVersion")) and ev["contentVersion"]):
        errors.append("literacy: contentVersion must be non-empty string")
    props = ev.get("props")
    if not isinstance(props, dict):
        return errors + ["literacy: props must be an object"]
    return errors + _literacy_props_errors(event, props)


# ── OS v1 ────────────────────────────────────────────────────────────────


def _os_identity_ok(key: str, value: Any) -> bool:
    if not (_is_str(value) and _RE_SAFE_ID.match(value)):
        return False
    return True


def _os_dimensions_errors(name: str, dims: dict) -> list[str]:
    errors: list[str] = []
    policy = V.OS_EVENT_VOCABULARIES[name]
    allowed = {"installationId", "sessionId", *V.OS_CONTEXT_KEYS, *policy.keys()}
    for key in dims:
        if key not in allowed:
            errors.append(f"os: dimension {key!r} not allowed for {name}")
    for key in ("installationId", "sessionId"):
        if key not in dims:
            errors.append(f"os: {name} missing required dimension {key!r}")
        elif not _os_identity_ok(key, dims[key]):
            errors.append(f"os: {name}.{key} fails identifier policy")
    for key in V.OS_CONTEXT_KEYS:
        if key not in dims:
            continue
        value = dims[key]
        vocab = V.OS_CONTEXT_VOCABULARIES.get(key)
        if not (_is_str(value) and _RE_SAFE_ID.match(value)):
            errors.append(f"os: {name}.{key} fails identifier policy")
        elif vocab is not None and value not in vocab:
            errors.append(f"os: {name}.{key} not in context vocabulary")
    for key, value in dims.items():
        if not _is_bounded_scalar(value):
            errors.append(f"os: {name}.{key} not a bounded scalar")
            continue
        if key in V.OS_CONTEXT_KEYS or key in {"installationId", "sessionId"}:
            continue  # already checked with identifier/context policy
        vocab = policy.get(key)
        if vocab is not None and value not in vocab:
            errors.append(f"os: {name}.{key} not in event vocabulary")
    return errors


def validate_os_event(ev: dict) -> list[str]:
    """Validate one OS v1 envelope; [] == valid."""
    ev = _strip_label(ev if isinstance(ev, dict) else {})
    errors: list[str] = []
    extra = set(ev) - _OS_ENVELOPE_KEYS
    if extra:
        errors.append(f"os: unexpected envelope keys {sorted(extra)}")
    if ev.get("schemaVersion") != OS_SCHEMA_VERSION:
        errors.append(f"os: schemaVersion must be {OS_SCHEMA_VERSION}")
    event_id = ev.get("eventId")
    if not (_is_str(event_id) and 0 < len(event_id) <= 128):
        errors.append("os: eventId must be a string of length 1..128")
    name = ev.get("name")
    if name not in V.OS_EVENT_NAMES:
        return errors + [f"os: event name {name!r} not in vocabulary"]
    if not _is_iso_datetime(ev.get("occurredAt")):
        errors.append("os: occurredAt not an ISO-8601 timestamp")
    sequence = ev.get("sequence")
    if not (isinstance(sequence, int) and not isinstance(sequence, bool) and sequence >= 1):
        errors.append("os: sequence must be int>=1")
    dims = ev.get("dimensions")
    if not isinstance(dims, dict):
        return errors + ["os: dimensions must be an object"]
    return errors + _os_dimensions_errors(name, dims)


# ── dispatch ─────────────────────────────────────────────────────────────


def detect_stream(ev: dict) -> str | None:
    """'literacy' | 'os' | None, by envelope shape (never by directory)."""
    if not isinstance(ev, dict):
        return None
    if ev.get("source") == LITERACY_SOURCE or "props" in ev:
        return "literacy"
    if "dimensions" in ev or "name" in ev:
        return "os"
    return None


def validate_event(ev: dict) -> list[str]:
    """Validate one emitted event on the right envelope contract; [] == valid."""
    stream = detect_stream(ev)
    if stream == "literacy":
        return validate_literacy_event(ev)
    if stream == "os":
        return validate_os_event(ev)
    return ["event does not match any known envelope (literacy v2 / OS v1)"]
