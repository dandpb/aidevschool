"""Deterministic stdlib-only validator for learner analytics events (v1)."""
from __future__ import annotations
import argparse, json, re, sys, uuid
from pathlib import Path

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$")
MODULE_RE = re.compile(r"^[a-z0-9-]{1,32}$")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")

def load_schema(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def validate_event(ev: dict, schema: dict) -> list[str]:
    errs = []
    for k in schema["required_envelope"]:
        if k not in ev:
            errs.append(f"missing envelope key {k}")
    et = ev.get("event_type")
    types = schema["event_types"]
    if et not in types:
        return errs + [f"unknown event_type {et!r}"]
    for f in ("event_id",):
        v = ev.get(f, "")
        if not (isinstance(v, str) and UUID_RE.match(v)):
            errs.append(f"{f} not uuid4: {v!r}")
    if not (isinstance(ev.get("occurred_at"), str) and ISO_RE.match(ev["occurred_at"])):
        errs.append("occurred_at not ISO-8601 UTC")
    if not (isinstance(ev.get("learner_anon_id"), str) and UUID_RE.match(ev["learner_anon_id"])):
        errs.append("learner_anon_id not uuid4")
    if ev.get("dojo") not in schema["dojo_enum"]:
        errs.append(f"dojo not in enum: {ev.get('dojo')!r}")
    m = ev.get("module")
    if not (isinstance(m, str) and MODULE_RE.match(m)):
        errs.append(f"module bad slug: {m!r}")
    pay = ev.get("payload")
    if not isinstance(pay, dict):
        return errs + ["payload not object"]
    spec = types[et]
    for k in spec["payload"]:
        if k not in pay:
            errs.append(f"{et}: payload missing {k}")
    if et == "objective_viewed" and pay.get("entry") not in schema["entry_enum"]:
        errs.append("entry not in enum")
    if et == "attempt_started":
        if not UUID_RE.match(str(pay.get("attempt_id", ""))):
            errs.append("attempt_id not uuid4")
        if pay.get("mode") not in schema["mode_enum"]:
            errs.append("mode not in enum")
    if et == "attempt_feedback_shown":
        if pay.get("verdict") not in schema["verdict_enum"]:
            errs.append("verdict not in enum")
        if not (isinstance(pay.get("latency_ms"), int) and pay["latency_ms"] >= 0):
            errs.append("latency_ms must be int>=0")
    if et == "evidence_recorded":
        if pay.get("evidence_kind") not in schema["evidence_kind_enum"]:
            errs.append("evidence_kind not in enum")
        d = pay.get("digest_sha256")
        if d is not None and not (isinstance(d, str) and HEX64_RE.match(d)):
            errs.append("digest_sha256 must be hex64 or null")
    if et == "session_heartbeat":
        if not (isinstance(pay.get("active_seconds"), int) and pay["active_seconds"] >= 0):
            errs.append("active_seconds must be int>=0")
    if et == "export_consented":
        if pay.get("scope") not in schema["export_scope_enum"]:
            errs.append("scope not in enum")
        if not isinstance(pay.get("granted"), bool):
            errs.append("granted must be bool")
    for k in ev.keys() | pay.keys():
        for bad in schema["pii_forbidden_keys"]:
            if k == bad:
                errs.append(f"pii forbidden key {k}")
    return errs

def run_dir(schema_path: Path, dir_path: Path, expect_ok: bool) -> int:
    schema = load_schema(schema_path)
    files = sorted(dir_path.glob("*.json"))
    if not files:
        print(f"no fixtures in {dir_path}"); return 1
    bad = 0
    for f in files:
        ev = json.loads(f.read_text(encoding="utf-8"))
        errs = validate_event(ev, schema)
        ok = not errs
        if ok != expect_ok:
            bad += 1
            print(f"UNEXPECTED {'errors' if expect_ok else 'pass'}: {f.name} {errs}")
    print(f"checked {len(files)} fixtures in {dir_path} (expect_ok={expect_ok}) mismatches={bad}")
    return 1 if bad else 0

def main() -> int:
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--negatives", action="store_true")
    ap.add_argument("--schema"); ap.add_argument("--dir")
    a = ap.parse_args()
    schema = Path(a.schema) if a.schema else here / "schema.v1.json"
    if a.dir:
        return run_dir(schema, Path(a.dir), expect_ok=True)
    if a.all:
        rc = run_dir(schema, here / "fixtures" / "valid", expect_ok=True)
        return rc
    if a.negatives:
        schema_ng = load_schema(schema)
        files = sorted((here / "fixtures" / "invalid").glob("*.json"))
        if not files:
            print("no invalid fixtures"); return 1
        bad = 0
        for f in files:
            ev = json.loads(f.read_text(encoding="utf-8"))
            errs = validate_event(ev, schema_ng)
            if not errs:
                bad += 1; print(f"SHOULD HAVE FAILED: {f.name}")
        print(f"checked {len(files)} invalid fixtures, not-rejected={bad}")
        return 1 if bad else 0
    print("nothing to do"); return 1

if __name__ == "__main__":
    sys.exit(main())
