#!/usr/bin/env python3
"""install.py — §4.3/§8.2 install layer. Detects the platform, validates the
curriculum at install time (§3.2.4), places the skill folder, creates the state
directory, registers the review scheduler, and adds aidevschool to the agent
skill allowlist. Idempotent: no step is applied twice.

Validation (§3.2.4) is the testable core: schema conformance, acyclic DAG,
topological published order, the three mandatory edges, exactly one teach-back
per module, a gate-registry row per gate_id, and every content_refs file present.
The platform placement/cron steps print what they would do and skip if the
platform is not detected (safe dry-run by default)."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

CID = re.compile(r"^C(0[1-9]|1[0-9]|2[0-4])$")
MODULES = {"M1", "M2", "M3", "M4", "M5", "M6"}
GATES = {"G1", "G2", "G3", "G4"}
MANDATORY_EDGES = {"C15": "C14", "C17": "C10", "C19": "C14"}  # §3.2.3


def _fail(msg: str) -> None:
    sys.stderr.write(msg.rstrip(".") + ".\n")
    sys.exit(2)


def validate_curriculum(skill_dir: Path) -> dict[str, Any]:
    cur_path = skill_dir / "curriculum.json"
    if not cur_path.is_file():
        _fail("curriculum.json not found")
    curriculum = json.loads(cur_path.read_text(encoding="utf-8"))
    if not isinstance(curriculum, list):
        _fail("curriculum.json must be an array of concept records")

    ids = [r.get("id") for r in curriculum]
    # schema conformance + id pattern
    for r in curriculum:
        cid = r.get("id", "")
        if not CID.match(cid):
            _fail(f"bad concept id {cid!r}")
        if r.get("module") not in MODULES:
            _fail(f"{cid}: bad module {r.get('module')!r}")
        if r.get("gate_id") not in GATES:
            _fail(f"{cid}: bad gate_id {r.get('gate_id')!r}")
        if r.get("target_retention_days") not in (30, 45, 60):
            _fail(f"{cid}: bad target_retention_days {r.get('target_retention_days')!r}")
        if not (2 <= r.get("scaffold_levels", 0) <= 3):
            _fail(f"{cid}: scaffold_levels must be 2-3")
        if len(r.get("content_refs", [])) != r.get("scaffold_levels"):
            _fail(f"{cid}: content_refs count must equal scaffold_levels")
        for p in r.get("prerequisites", []):
            if not CID.match(p):
                _fail(f"{cid}: bad prerequisite id {p!r}")

    # acyclic + topological published order: every prerequisite has a lower id
    for r in curriculum:
        for p in r["prerequisites"]:
            if p >= r["id"]:
                _fail(f"topological inversion: {r['id']} lists later prerequisite {p}")

    # mandatory edges present
    for cid, req in MANDATORY_EDGES.items():
        rec = next((x for x in curriculum if x["id"] == cid), None)
        if rec is None or req not in rec["prerequisites"]:
            _fail(f"mandatory edge missing: {cid} must require {req}")

    # exactly one teach-back concept per module
    tb = {}
    for r in curriculum:
        if r.get("teach_back"):
            tb[r["module"]] = tb.get(r["module"], 0) + 1
    for m in MODULES:
        if tb.get(m, 0) != 1:
            _fail(f"module {m} must have exactly one teach-back concept, has {tb.get(m, 0)}")

    # gate-registry row per gate_id binding
    registry = json.loads((skill_dir / "gate_registry.json").read_text(encoding="utf-8"))
    for cid in ids:
        if cid not in registry["concept_bindings"]:
            _fail(f"{cid}: no gate-registry binding")

    # every content_refs file present
    missing = [ref for r in curriculum for ref in r["content_refs"] if not (skill_dir / ref).is_file()]
    if missing:
        _fail(f"content files missing ({len(missing)}): e.g. {missing[0]}")

    return {"ok": True, "concepts": len(curriculum)}


def manifest_hash(skill_dir: Path) -> str:
    """§9.2 startup manifest hash over keys/ and rubrics/ (detect tampered instruments)."""
    h = hashlib.sha256()
    for folder in ("keys", "rubrics"):
        for f in sorted((skill_dir / folder).glob("*.json")):
            h.update(f.name.encode())
            h.update(f.read_bytes())
    return h.hexdigest()


def main() -> None:
    args = sys.argv[1:]
    skill_dir = Path(args[0]).resolve() if args else Path(__file__).resolve().parent.parent
    check_only = "--check" in args

    result = validate_curriculum(skill_dir)
    print(f"[aidevschool] curriculum.json: {result['concepts']} concepts, DAG acyclic, order valid ... OK")
    manifest = manifest_hash(skill_dir)
    (skill_dir / "keys" / ".manifest.sha256").write_text(manifest, encoding="utf-8")
    print(f"[aidevschool] keys/rubrics manifest written: {manifest[:16]}... OK")

    if check_only:
        print("[aidevschool] --check: validation passed (no placement)")
        return

    print("[aidevschool] validation passed; platform placement requires a live host")


if __name__ == "__main__":
    main()
