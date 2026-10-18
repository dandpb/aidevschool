"""Structural validation of product analytics events (AID-5009).

Mirrors the TypeScript emitter validators rule by rule:

- literacy v2: `engines/literacyDojo/src/domain/analytics.ts`
  (`isValidAnalyticsEvent`, lines 117-192).
- OS v1: `engines/codexdojo-os-prototype/src/analytics/events.ts`
  (`analyticsEventIsValid`, lines 179-191).

(Module named `contracts`, not `envelopes`: any path containing `env` is
blocked as credential-shaped by the SDLC guard with no override.)

Fail-closed and deterministic: every check returns violation strings collected
into one list; an empty list means valid. Fixture labels (`synthetic: true`)
are stripped before validation and are never part of an envelope.
"""
from __future__ import annotations

import math
import re
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


def _props_key_policy_errors(event: str, props: dict, allowed) -> list[str]:
    errors: list[str] = []
    for key in props:
        if key not in allowed:
            errors.append(f"literacy: prop {key!r} not allowed for {event}")
        elif len(key) > MAX_PROP_KEY_LENGTH or not _RE_PROP_KEY.match(key):
            errors.append(f"literacy: prop key {key!r} fails key policy")
    return errors


def _required_props_errors(event: str, props: dict, allowed, optional) -> list[str]:
    return [
        f"literacy: {event} missing required prop {key!r}"
        for key in allowed
        if key not in optional and key not in props
    ]


def _prop_value_errors(key: str, value: Any) -> list[str]:
    if isinstance(value, str):
        if len(value) > MAX_PROP_STRING_LENGTH:
            return [f"literacy: prop {key!r} exceeds max length"]
        return []
    if isinstance(value, bool):
        return []
    if isinstance(value, (int, float)):
        if not math.isfinite(value):
            return [f"literacy: prop {key!r} not finite"]
        return []
    return [f"literacy: prop {key!r} not a primitive"]


def _lesson_id_errors(event: str, props: dict) -> list[str]:
    if _is_str(props.get("lessonId")) and props["lessonId"]:
        return []
    return [f"literacy: {event}.lessonId must be non-empty string"]


def _lesson_version_errors(event: str, props: dict) -> list[str]:
    version = props.get("lessonVersion")
    if isinstance(version, int) and not isinstance(version, bool):
        return []
    return [f"literacy: {event}.lessonVersion must be integer"]


def _attempted_value_errors(props: dict) -> list[str]:
    errors = _lesson_id_errors("activity_attempted", props)
    if props.get("activityType") not in V.LITERACY_ACTIVITY_TYPES:
        errors.append("literacy: activity_attempted.activityType not in vocabulary")
    if not isinstance(props.get("passed"), bool):
        errors.append("literacy: activity_attempted.passed must be bool")
    return errors


def _presented_value_errors(props: dict) -> list[str]:
    errors = _lesson_id_errors("activity_presented", props)
    if props.get("activityType") not in V.LITERACY_ACTIVITY_TYPES:
        errors.append("literacy: activity_presented.activityType not in vocabulary")
    idx = props.get("activityIndex")
    if not (isinstance(idx, int) and not isinstance(idx, bool) and idx >= 0):
        errors.append("literacy: activity_presented.activityIndex must be int>=0")
    return errors


def _vocabulary_value_errors(event: str, props: dict) -> list[str]:
    if event == "route_chosen" and props.get("route") not in V.LITERACY_ROUTES:
        return ["literacy: route_chosen.route not in vocabulary"]
    if event == "entry_viewed" and "entry" in props and props["entry"] not in V.LITERACY_ENTRY_ROUTES:
        return ["literacy: entry_viewed.entry not in vocabulary"]
    return []


_LITERACY_LESSON_EVENTS = frozenset(
    {"lesson_started", "lesson_completed", "mapa_inicial_done", "lesson_brief_viewed"}
)


def _literacy_value_errors(event: str, props: dict) -> list[str]:
    """Value vocabularies enforced inline in analytics.ts:150-190."""
    errors: list[str] = []
    if event == "activity_attempted":
        errors += _attempted_value_errors(props)
    if event in _LITERACY_LESSON_EVENTS:
        errors += _lesson_id_errors(event, props)
        errors += _lesson_version_errors(event, props)
    if event == "activity_presented":
        errors += _presented_value_errors(props)
    return errors + _vocabulary_value_errors(event, props)


def _literacy_props_errors(event: str, props: dict) -> list[str]:
    allowed = V.LITERACY_EVENT_PROPS[event]
    optional = V.LITERACY_OPTIONAL_PROPS[event]
    errors = _props_key_policy_errors(event, props, allowed)
    errors += _required_props_errors(event, props, allowed, optional)
    for key, value in props.items():
        errors += _prop_value_errors(key, value)
    return errors + _literacy_value_errors(event, props)


def _literacy_header_errors(ev: dict) -> list[str]:
    errors: list[str] = []
    extra = set(ev) - _LITERACY_ENVELOPE_KEYS
    if extra:
        errors.append(f"literacy: unexpected envelope keys {sorted(extra)}")
    if ev.get("schemaVersion") != LITERACY_SCHEMA_VERSION:
        errors.append(f"literacy: schemaVersion must be {LITERACY_SCHEMA_VERSION}")
    if ev.get("source") != LITERACY_SOURCE:
        errors.append(f"literacy: source must be {LITERACY_SOURCE!r}")
    return errors


def _literacy_field_errors(ev: dict) -> list[str]:
    errors: list[str] = []
    for key in ("eventId", "sessionId"):
        if not _is_uuid(ev.get(key)):
            errors.append(f"literacy: {key} not an anonymous UUID")
    if not _is_iso_datetime(ev.get("occurredAt")):
        errors.append("literacy: occurredAt not an ISO-8601 timestamp")
    if not (_is_str(ev.get("contentVersion")) and ev["contentVersion"]):
        errors.append("literacy: contentVersion must be non-empty string")
    return errors


def validate_literacy_event(ev: dict) -> list[str]:
    """Validate one literacy v2 envelope; [] == valid."""
    ev = _strip_label(ev if isinstance(ev, dict) else {})
    errors = _literacy_header_errors(ev)
    event = ev.get("event")
    if event not in V.LITERACY_EVENT_NAMES:
        return errors + [f"literacy: event {event!r} not in vocabulary"]
    errors += _literacy_field_errors(ev)
    props = ev.get("props")
    if not isinstance(props, dict):
        return errors + ["literacy: props must be an object"]
    return errors + _literacy_props_errors(event, props)


# ── OS v1 ────────────────────────────────────────────────────────────────


def _os_identity_ok(key: str, value: Any) -> bool:
    if not (_is_str(value) and _RE_SAFE_ID.match(value)):
        return False
    return True


def _os_unknown_dims_errors(name: str, dims: dict, allowed) -> list[str]:
    return [f"os: dimension {key!r} not allowed for {name}" for key in dims if key not in allowed]


def _os_identity_errors(name: str, dims: dict) -> list[str]:
    errors: list[str] = []
    for key in ("installationId", "sessionId"):
        if key not in dims:
            errors.append(f"os: {name} missing required dimension {key!r}")
        elif not _os_identity_ok(key, dims[key]):
            errors.append(f"os: {name}.{key} fails identifier policy")
    return errors


def _os_context_value_errors(name: str, key: str, value: Any) -> list[str]:
    vocab = V.OS_CONTEXT_VOCABULARIES.get(key)
    if not (_is_str(value) and _RE_SAFE_ID.match(value)):
        return [f"os: {name}.{key} fails identifier policy"]
    if vocab is not None and value not in vocab:
        return [f"os: {name}.{key} not in context vocabulary"]
    return []


def _os_context_errors(name: str, dims: dict) -> list[str]:
    errors: list[str] = []
    for key in V.OS_CONTEXT_KEYS:
        if key not in dims:
            continue
        errors += _os_context_value_errors(name, key, dims[key])
    return errors


def _os_dim_value_errors(name: str, dims: dict, policy: dict) -> list[str]:
    """Per-dimension: bounded scalar first, then event vocabulary."""
    errors: list[str] = []
    reserved = set(V.OS_CONTEXT_KEYS) | {"installationId", "sessionId"}
    for key, value in dims.items():
        if not _is_bounded_scalar(value):
            errors.append(f"os: {name}.{key} not a bounded scalar")
            continue
        if key in reserved:
            continue  # already checked with identifier/context policy
        vocab = policy.get(key)
        if vocab is not None and value not in vocab:
            errors.append(f"os: {name}.{key} not in event vocabulary")
    return errors


def _os_dimensions_errors(name: str, dims: dict) -> list[str]:
    policy = V.OS_EVENT_VOCABULARIES[name]
    allowed = {"installationId", "sessionId", *V.OS_CONTEXT_KEYS, *policy.keys()}
    errors = _os_unknown_dims_errors(name, dims, allowed)
    errors += _os_identity_errors(name, dims)
    errors += _os_context_errors(name, dims)
    errors += _os_dim_value_errors(name, dims, policy)
    return errors


def _os_header_errors(ev: dict) -> list[str]:
    errors: list[str] = []
    extra = set(ev) - _OS_ENVELOPE_KEYS
    if extra:
        errors.append(f"os: unexpected envelope keys {sorted(extra)}")
    if isinstance(ev.get("schemaVersion"), bool) or ev.get("schemaVersion") != OS_SCHEMA_VERSION:
        errors.append(f"os: schemaVersion must be {OS_SCHEMA_VERSION}")
    return errors


def _os_field_errors(ev: dict) -> list[str]:
    errors: list[str] = []
    event_id = ev.get("eventId")
    if not (_is_str(event_id) and 0 < len(event_id) <= 128):
        errors.append("os: eventId must be a string of length 1..128")
    if not _is_iso_datetime(ev.get("occurredAt")):
        errors.append("os: occurredAt not an ISO-8601 timestamp")
    sequence = ev.get("sequence")
    if not (isinstance(sequence, int) and not isinstance(sequence, bool) and sequence >= 1):
        errors.append("os: sequence must be int>=1")
    return errors


def validate_os_event(ev: dict) -> list[str]:
    """Validate one OS v1 envelope; [] == valid."""
    ev = _strip_label(ev if isinstance(ev, dict) else {})
    errors = _os_header_errors(ev)
    name = ev.get("name")
    if name not in V.OS_EVENT_NAMES:
        return errors + [f"os: event name {name!r} not in vocabulary"]
    errors += _os_field_errors(ev)
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
