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


class InstallError(RuntimeError):
    pass

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
        for prerequisite in r.get("prerequisites", []):
            if not CID.match(prerequisite):
                _fail(f"{cid}: bad prerequisite id {prerequisite!r}")

    for r in curriculum:
        for prerequisite in r.get("prerequisites", []):
            if prerequisite >= r["id"]:
                _fail(f"topological inversion: {r['id']} lists later prerequisite {prerequisite}")

    for cid, required in MANDATORY_EDGES.items():
        rec = next((record for record in curriculum if record["id"] == cid), None)
        if rec is None or required not in rec["prerequisites"]:
            _fail(f"mandatory edge missing: {cid} must require {required}")

    teach_back_counts = {}
    for r in curriculum:
        if r.get("teach_back"):
            teach_back_counts[r["module"]] = teach_back_counts.get(r["module"], 0) + 1
    for module in MODULES:
        if teach_back_counts.get(module, 0) != 1:
            _fail(
                f"module {module} must have exactly one teach-back concept, "
                f"has {teach_back_counts.get(module, 0)}"
            )

    registry = json.loads((skill_dir / "gate_registry.json").read_text(encoding="utf-8"))
    if not isinstance(registry.get("concept_bindings"), dict):
        _fail("gate_registry.json must have a concept_bindings object")
    for cid in ids:
        if cid not in registry["concept_bindings"]:
            _fail(f"{cid}: no gate-registry binding")

    missing = [ref for r in curriculum for ref in r["content_refs"] if not (skill_dir / ref).is_file()]
    if missing:
        _fail(f"content files missing ({len(missing)}): e.g. {missing[0]}")

    return {"ok": True, "concepts": len(curriculum)}


def manifest_hash(skill_dir: Path) -> str:
    digest = hashlib.sha256()
    for folder in ("keys", "rubrics"):
        for file in sorted((skill_dir / folder).glob("*.json")):
            digest.update(file.name.encode())
            digest.update(file.read_bytes())
    return digest.hexdigest()


def verify_manifest(skill_dir: Path) -> str:
    path = skill_dir / "keys" / ".manifest.sha256"
    expected = path.read_text(encoding="utf-8").strip() if path.is_file() else ""
    actual = manifest_hash(skill_dir)
    if expected != actual:
        raise InstallError("keys/rubrics manifest does not match the shipped instruments")
    return actual
