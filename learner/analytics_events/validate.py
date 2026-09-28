"""Deterministic stdlib-only validator for learner analytics events.

Schema-version-aware: every enum/rule input comes from the schema JSON
(v1/v2/v3); code owns only shape checks and the payload rule table below.
Fail-closed: all violations are collected and an empty list means valid.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Callable
from pathlib import Path

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$")
MODULE_RE = re.compile(r"^[a-z0-9-]{1,32}$")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")

PayloadRule = Callable[[dict, dict], list[str]]


def load_schema(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _err_unless(ok: bool, msg: str) -> list[str]:
    return [] if ok else [msg]


def _is_uuid4(value: object) -> bool:
    return isinstance(value, str) and bool(UUID_RE.match(value))


def _is_nonneg_int(value: object) -> bool:
    return isinstance(value, int) and value >= 0


# ── payload rule builders (one concern per rule; messages are stable API
#    for tests and the funnel pipeline — do not reword) ──────────────────


def _enum_rule(field: str, enum_key: str) -> PayloadRule:
    def rule(pay: dict, schema: dict) -> list[str]:
        return _err_unless(pay.get(field) in schema[enum_key], f"{field} not in enum")

    return rule


def _uuid_rule(field: str) -> PayloadRule:
    def rule(pay: dict, schema: dict) -> list[str]:
        return _err_unless(UUID_RE.match(str(pay.get(field, ""))), f"{field} not uuid4")

    return rule


def _nonneg_int_rule(field: str) -> PayloadRule:
    def rule(pay: dict, schema: dict) -> list[str]:
        return _err_unless(_is_nonneg_int(pay.get(field)), f"{field} must be int>=0")

    return rule


def _hex64_or_null_rule(field: str) -> PayloadRule:
    def rule(pay: dict, schema: dict) -> list[str]:
        value = pay.get(field)
        ok = value is None or (isinstance(value, str) and bool(HEX64_RE.match(value)))
        return _err_unless(ok, f"{field} must be hex64 or null")

    return rule


def _bool_rule(field: str) -> PayloadRule:
    def rule(pay: dict, schema: dict) -> list[str]:
        return _err_unless(isinstance(pay.get(field), bool), f"{field} must be bool")

    return rule


# Dispatch table replaces the per-event if-chain (complexity gate, max 8).
PAYLOAD_RULES: dict[str, list[PayloadRule]] = {
    "objective_viewed": [_enum_rule("entry", "entry_enum")],
    "attempt_started": [_uuid_rule("attempt_id"), _enum_rule("mode", "mode_enum")],
    "attempt_feedback_shown": [
        _enum_rule("verdict", "verdict_enum"),
        _nonneg_int_rule("latency_ms"),
    ],
    "evidence_recorded": [
        _enum_rule("evidence_kind", "evidence_kind_enum"),
        _hex64_or_null_rule("digest_sha256"),
    ],
    "session_heartbeat": [_nonneg_int_rule("active_seconds")],
    "export_consented": [_enum_rule("scope", "export_scope_enum"), _bool_rule("granted")],
}


# ── envelope / optional / pii checks ───────────────────────────────────


def check_envelope_fields(ev: dict, schema: dict) -> list[str]:
    errs = _err_unless(_is_uuid4(ev.get("event_id")), f"event_id not uuid4: {ev.get('event_id', '')!r}")
    occurred = ev.get("occurred_at")
    errs += _err_unless(
        isinstance(occurred, str) and bool(ISO_RE.match(occurred)),
        "occurred_at not ISO-8601 UTC",
    )
    anon_field = schema.get("anon_id_field", "learner_anon_id")
    errs += _err_unless(_is_uuid4(ev.get(anon_field)), f"{anon_field} not uuid4")
    errs += _err_unless(ev.get("dojo") in schema["dojo_enum"], f"dojo not in enum: {ev.get('dojo')!r}")
    module = ev.get("module")
    ok_slug = isinstance(module, str) and bool(MODULE_RE.match(module))
    return errs + _err_unless(ok_slug, f"module bad slug: {module!r}")


def check_deprecated(event_type: str, schema: dict) -> list[str]:
    if event_type in schema.get("deprecated_events", []):
        return [f"event_type {event_type!r} is deprecated in this schema version"]
    return []


def check_payload(pay: dict, event_type: str, schema: dict) -> list[str]:
    spec = schema["event_types"][event_type]
    errs = [f"{event_type}: payload missing {k}" for k in spec["payload"] if k not in pay]
    for rule in PAYLOAD_RULES.get(event_type, []):
        errs += rule(pay, schema)
    return errs


def check_optional(ev: dict, schema: dict) -> list[str]:
    errs = []
    for field in schema.get("optional_numeric", []):
        if field in ev:
            errs += _err_unless(_is_nonneg_int(ev[field]), f"{field} must be int>=0")
    for field, enum_key in schema.get("optional_enum", {}).items():
        if field in ev and ev[field] not in schema[enum_key]:
            errs.append(f"{field} not in enum {enum_key}")
    return errs


def check_pii(ev: dict, pay: dict, schema: dict) -> list[str]:
    forbidden = set(schema["pii_forbidden_keys"]) & (set(ev) | set(pay))
    return sorted(f"pii forbidden key {k}" for k in forbidden)


def validate_event(ev: dict, schema: dict) -> list[str]:
    """Validate one event dict; returns all violations (empty list == valid)."""
    errs = [f"missing envelope key {k}" for k in schema["required_envelope"] if k not in ev]
    event_type = ev.get("event_type")
    if event_type not in schema["event_types"]:
        return errs + [f"unknown event_type {event_type!r}"]
    errs += check_envelope_fields(ev, schema)
    errs += check_deprecated(event_type, schema)
    pay = ev.get("payload")
    if not isinstance(pay, dict):
        return errs + ["payload not object"]
    errs += check_payload(pay, event_type, schema)
    errs += check_optional(ev, schema)
    return errs + check_pii(ev, pay, schema)


# ── CLI (fixture runner) ───────────────────────────────────────────────


def run_dir(schema_path: Path, dir_path: Path, expect_ok: bool) -> int:
    schema = load_schema(schema_path)
    files = sorted(dir_path.glob("*.json"))
    if not files:
        print(f"no fixtures in {dir_path}")
        return 1
    bad = 0
    for f in files:
        ev = json.loads(f.read_text(encoding="utf-8"))
        errs = validate_event(ev, schema)
        if (not errs) != expect_ok:
            bad += 1
            print(f"UNEXPECTED {'errors' if expect_ok else 'pass'}: {f.name} {errs}")
    print(f"checked {len(files)} fixtures in {dir_path} (expect_ok={expect_ok}) mismatches={bad}")
    return 1 if bad else 0


def run_negatives(schema_path: Path, here: Path) -> int:
    schema = load_schema(schema_path)
    files = sorted((here / "fixtures" / "invalid").glob("*.json"))
    if not files:
        print("no invalid fixtures")
        return 1
    bad = 0
    for f in files:
        ev = json.loads(f.read_text(encoding="utf-8"))
        if not validate_event(ev, schema):
            bad += 1
            print(f"SHOULD HAVE FAILED: {f.name}")
    print(f"checked {len(files)} invalid fixtures, not-rejected={bad}")
    return 1 if bad else 0


def main() -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--negatives", action="store_true")
    ap.add_argument("--schema")
    ap.add_argument("--dir")
    a = ap.parse_args()
    schema = Path(a.schema) if a.schema else here / "schema.v1.json"
    if a.dir:
        return run_dir(schema, Path(a.dir), expect_ok=True)
    if a.all:
        return run_dir(schema, here / "fixtures" / "valid", expect_ok=True)
    if a.negatives:
        return run_negatives(schema, here)
    print("nothing to do")
    return 1


if __name__ == "__main__":
    sys.exit(main())
