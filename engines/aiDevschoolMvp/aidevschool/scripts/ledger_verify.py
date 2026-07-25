#!/usr/bin/env python3
"""ledger_verify.py — §7.1 read-only operator tool. Validates the schema and the
prev_sha256 hash chain of every ledger.jsonl line; exits 2 on the first
violation, reporting the line number. A rewritten, inserted, or deleted
historical line breaks the chain at exactly one point."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ULID = re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")
CID = re.compile(r"^C(0[1-9]|1[0-9]|2[0-4])$")
TYPES = {"session_started", "lesson_delivered", "attempt_recorded", "verdict_issued",
         "state_transition", "review_scheduled", "review_due", "plan_recomputed"}


def _sha(b: bytes) -> str:
    import hashlib
    return hashlib.sha256(b).hexdigest()


def _fail(line_no: int, msg: str) -> None:
    sys.stderr.write(f"ledger line {line_no}: {msg}.\n")
    sys.exit(2)


def main() -> None:
    raw_args = sys.stdin.read()
    try:
        args = json.loads(raw_args)
    except Exception:
        sys.stderr.write("Could not read JSON arguments from stdin.\n")
        sys.exit(1)
    state_dir = Path(args["state_dir"])
    path = state_dir / "ledger.jsonl"
    if not path.is_file():
        sys.stdout.write(json.dumps({"ok": True, "lines": 0, "chain_valid": True}) + "\n")
        return

    raw_lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    prev_raw: bytes | None = None
    for i, raw in enumerate(raw_lines, 1):
        try:
            ev = json.loads(raw)
        except json.JSONDecodeError:
            _fail(i, "not valid JSON")
            raise
        # envelope schema
        if not ULID.match(str(ev.get("event_id", ""))):
            _fail(i, "bad event_id")
        if ev.get("type") not in TYPES:
            _fail(i, f"bad type {ev.get('type')}")
        cid = ev.get("concept_id")
        if cid is not None and not CID.match(str(cid)):
            _fail(i, "bad concept_id")
        if not isinstance(ev.get("payload"), dict) or not ev["payload"]:
            _fail(i, "payload must be a non-empty object")
        # hash chain
        expected_prev = None if prev_raw is None else _sha(prev_raw)
        if ev.get("prev_sha256") != expected_prev:
            _fail(i, "prev_sha256 chain broken")
        prev_raw = raw.encode("utf-8")

    sys.stdout.write(json.dumps({"ok": True, "lines": len(raw_lines), "chain_valid": True}) + "\n")


if __name__ == "__main__":
    main()
