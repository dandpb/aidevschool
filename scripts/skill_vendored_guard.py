#!/usr/bin/env python3
"""Guard for locally hot-fixed vendored skills (AID-2592).

The harness-eval skill is vendored into .claude/.cursor/.windsurf with six
Track A correctness fixes (PR #511) that exist ONLY in those copies: the
upstream catalog (@tech-leads-club/agent-skills) still ships the pre-fix
checker, and .agents/.skill-lock.json records the upstream contentHash
(675761f3...) even though the vendored tree hashes to a different value
(source: local). A future `npx @tech-leads-club/agent-skills update` would
therefore silently overwrite the fixes and resurrect ~41 false BROKEN
findings without any gate failing.

This guard closes that hole with three blocking checks:

1. INTEGRITY  - every skill listed in .agents/.skill-lock.json exists in all
   agent trees it claims, and all copies are byte-identical.
2. PROVENANCE - the computed tree hash (catalog computeSkillHash algorithm:
   sha256 over sorted (relpath, bytes), skipping dotfiles and __pycache__)
   must match the lock contentHash for source != local skills, and the
   pinned hash in scripts/skill_vendored_pins.json for source == local
   skills. An update that swaps a hot-fixed tree back to the pristine
   catalog content changes the hash and fails here.
3. REGRESSION - the vendored Track A checker must report EXACTLY the four
   planted defects in scripts/harness-eval-guard-fixture/ (and nothing
   else). Losing any of the six fixes reintroduces false positives on the
   fixture negatives; over-pruning loses planted true positives.

--self-test proves the guard itself detects synthetic violations (tampered
tree byte, drifted second copy, dropped planted defect, injected new
defect), following the same convention as scripts/check_python_complexity.py.

--update-pins rewrites scripts/skill_vendored_pins.json from the current
trees; use it ONLY in the PR that consciously re-vendors a skill (e.g. once
the upstream fix is released). Stdlib only; python >= 3.10.
"""

from __future__ import annotations

import argparse
import filecmp
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LOCK_PATH = REPO / ".agents" / ".skill-lock.json"
PINS_PATH = REPO / "scripts" / "skill_vendored_pins.json"
FIXTURE_DIR = REPO / "scripts" / "harness-eval-guard-fixture"
CHECKER_REL = "scripts/track_a_correctness.py"
INVENTORY_REL = "scripts/inventory_extract.py"

# lock "agents" names -> vendored tree roots (agent-skills vendor layout)
AGENT_DIRS = {
    "cursor": ".cursor/skills",
    "claude-code": ".claude/skills",
    "windsurf": ".windsurf/skills",
}

# Planted defects in the fixture: exactly these findings (source, claim) and
# no others may appear when the fixed checker runs the fixture.
EXPECTED_FINDINGS = {
    ("AGENTS.md", "Path cite `src/missing/thing.ts`"),
    ("AGENTS.md", "Path cite `docs/does-not-exist.md`"),
    ("AGENTS.md", "Path cite `.agents/skills`"),
    ("AGENTS.md", "Command cite ``pnpm run definitely-not-a-script``"),
}


def tree_files(root: Path) -> list[str]:
    """Catalog-comparable file list: dotfiles/dotdirs and __pycache__ skipped."""
    files: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".") and d != "__pycache__"]
        for fn in filenames:
            if fn.startswith("."):
                continue
            files.append(str((Path(dirpath) / fn).relative_to(root).as_posix()))
    return sorted(files)


def content_hash(tree: Path) -> str:
    """tech-leads-club skills-catalog computeSkillHash, applied to a tree dir."""
    h = hashlib.sha256()
    for rel in tree_files(tree):
        h.update(rel.encode())
        h.update((tree / rel).read_bytes())
    return h.hexdigest()


def load_lock() -> dict:
    lock = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    skills = lock.get("skills")
    if not isinstance(skills, dict) or not skills:
        raise SystemExit(f"{LOCK_PATH}: no skills entry found")
    return lock


def check_integrity(lock: dict) -> list[str]:
    """Check 1+2: presence, byte-identity across copies, provenance hash."""
    violations: list[str] = []
    pins = json.loads(PINS_PATH.read_text(encoding="utf-8"))
    for name, meta in sorted(lock["skills"].items()):
        agent_names = meta.get("agents") or list(AGENT_DIRS)
        trees: list[Path] = []
        for a in agent_names:
            d = AGENT_DIRS.get(a)
            if d is None:
                violations.append(f"{name}: unknown agent '{a}' in lock (update AGENT_DIRS)")
                continue
            tree = REPO / d / name
            if not tree.is_dir():
                violations.append(f"{name}: vendored tree missing: {d}/{name}")
                continue
            trees.append(tree)
        if len(trees) < 2:
            continue
        base = trees[0]
        for other in trees[1:]:
            cmp = filecmp.dircmp(base, other)
            differed = _deep_diff(cmp)
            if differed:
                violations.append(
                    f"{name}: vendored copies differ: {base.name}-tree vs {other.name}-tree: "
                    + ", ".join(differed[:5])
                )
        actual = content_hash(base)
        recorded = meta.get("contentHash")
        if meta.get("source") == "local":
            pinned = pins.get(name)
            if pinned is None:
                violations.append(
                    f"{name}: source=local but no pin in {PINS_PATH.name} "
                    f"(run scripts/skill_vendored_guard.py --update-pins in the vendoring PR)"
                )
            elif actual != pinned:
                violations.append(
                    f"{name}: source=local tree hash {actual[:12]}... != pin {pinned[:12]}... "
                    f"— hot-fixed tree was overwritten or drifted (e.g. `agent-skills update` "
                    f"pulled the pristine catalog over the local fixes); restore from git history "
                    f"or re-vendor deliberately and update the pin"
                )
        else:
            if actual != recorded:
                violations.append(
                    f"{name}: tree hash {actual[:12]}... != lock contentHash {(recorded or '')[:12]}... "
                    f"(vendored tree does not match its registry record)"
                )
    return violations


def _deep_diff(cmp: filecmp.dircmp) -> list[str]:
    out = list(cmp.left_only) + list(cmp.right_only)
    out += [f"content:{f}" for f in cmp.diff_files]
    out += [f"odd:{f}" for f in cmp.funny_files]
    for sub in cmp.subdirs.values():
        out += _deep_diff(sub)
    return out


def run_track_a(fixture_root: Path, out_base: Path) -> list[dict]:
    """Run the vendored checker against a fixture copy; return findings."""
    checker = REPO / ".claude" / "skills" / "harness-eval" / CHECKER_REL
    inv = REPO / ".claude" / "skills" / "harness-eval" / INVENTORY_REL
    for script, step in ((inv, "inventory"), (checker, "track-a")):
        proc = subprocess.run(
            [sys.executable, str(script), "--root", str(fixture_root), "--run-id", "guard", "--out-base", str(out_base)],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"{step} step failed:\n{proc.stderr}\n{proc.stdout}")
    data = json.loads((out_base / "04-correctness.json").read_text(encoding="utf-8"))
    return data


def check_regression(fixture_root: Path | None = None) -> list[str]:
    """Check 3: fixture findings must be EXACTLY the planted set."""
    src = fixture_root or FIXTURE_DIR
    if not src.is_dir():
        return [f"fixture missing: {src}"]
    with tempfile.TemporaryDirectory(prefix="hev-guard-") as tmp:
        work = Path(tmp) / "fixture"
        shutil.copytree(src, work, ignore=shutil.ignore_patterns("__pycache__", ".harness-eval"))
        out = Path(tmp) / "run"
        out.mkdir()
        findings = run_track_a(work, out)
    got = {(f.get("source"), f.get("claim")) for f in findings if f.get("severity") == "BROKEN"}
    missing = EXPECTED_FINDINGS - got
    extra = got - EXPECTED_FINDINGS
    violations: list[str] = []
    if missing:
        violations.append("fixture: planted defect NOT detected (checker over-prunes or fixture broken): " + "; ".join(sorted(f"{s}: {c}" for s, c in missing)))
    if extra:
        violations.append("fixture: FALSE POSITIVE detected (Track A fix lost / regression): " + "; ".join(sorted(f"{s}: {c}" for s, c in extra)))
    return violations


def self_test() -> int:
    """Synthetic violations must be detected; clean state must pass."""
    failures: list[str] = []
    lock = load_lock()

    def expect_violations(label: str, viols: list[str]) -> None:
        if not viols:
            failures.append(f"self-test: {label} produced NO violations (guard is blind)")
        else:
            print(f"  ok: {label} -> {len(violations(viols))} violation(s)")

    def violations(v: list[str]) -> list[str]:
        return v

    # S0 clean repo must pass both checks
    v0 = check_integrity(lock)
    if v0:
        failures.append(f"self-test: clean repo FAILED integrity: {v0}")
    else:
        print("  ok: clean repo passes integrity")
    r0 = check_regression()
    if r0:
        failures.append(f"self-test: clean repo FAILED regression: {r0}")
    else:
        print("  ok: clean repo passes regression")

    with tempfile.TemporaryDirectory(prefix="hev-selftest-") as tmp:
        tp = Path(tmp)
        # S1: single byte tamper in a vendored tree must trip the pin check
        repo_like = tp / "s1"
        repo_like.mkdir()
        (repo_like / ".agents").mkdir()
        (repo_like / ".agents" / ".skill-lock.json").write_text(LOCK_PATH.read_text(encoding="utf-8"), encoding="utf-8")
        pins_copy = json.loads(PINS_PATH.read_text(encoding="utf-8"))
        (repo_like / "pins.json").write_text(json.dumps(pins_copy), encoding="utf-8")
        trees: dict[str, Path] = {}
        for d in (".claude", ".cursor", ".windsurf"):
            t = repo_like / d / "skills" / "harness-eval"
            shutil.copytree(REPO / d / "skills" / "harness-eval", t, ignore=shutil.ignore_patterns("__pycache__"))
            trees[d] = t
        globals()["REPO"] = repo_like
        globals()["PINS_PATH"] = repo_like / "pins.json"
        try:
            v_clean = check_integrity(load_lock())
            if v_clean:
                failures.append(f"self-test: temp clean copy failed integrity: {v_clean}")
            else:
                print("  ok: temp clean copy passes integrity")
            script = trees[".claude"] / CHECKER_REL
            tampered = script.read_text(encoding="utf-8").replace('"bin/",', '"binX/",', 1)
            script.write_text(tampered, encoding="utf-8")
            v1 = check_integrity(load_lock())
            expect_violations("byte tamper in vendored tree", v1)
            # restore, then drift only the .cursor copy (cross-copy identity)
            shutil.copyfile(trees[".windsurf"] / CHECKER_REL, script)
            cur = trees[".cursor"] / CHECKER_REL
            cur.write_text(cur.read_text(encoding="utf-8").replace("def main", "def  main", 1), encoding="utf-8")
            v2 = check_integrity(load_lock())
            expect_violations("cross-copy drift (.cursor)", v2)
        finally:
            globals()["REPO"] = REPO_ORIG
            globals()["PINS_PATH"] = PINS_ORIG

    # S2: dropping a planted defect must trip the regression check
    with tempfile.TemporaryDirectory(prefix="hev-selftest2-") as tmp:
        f2 = Path(tmp) / "fixture"
        shutil.copytree(FIXTURE_DIR, f2, ignore=shutil.ignore_patterns("__pycache__", ".harness-eval"))
        ag = f2 / "AGENTS.md"
        ag.write_text(ag.read_text(encoding="utf-8").replace("Run `pnpm run definitely-not-a-script` to verify; ", ""), encoding="utf-8")
        v3 = check_regression(f2)
        expect_violations("planted defect removed from fixture", v3)

    # S3: injecting a new broken cite must trip the regression check
    with tempfile.TemporaryDirectory(prefix="hev-selftest3-") as tmp:
        f3 = Path(tmp) / "fixture"
        shutil.copytree(FIXTURE_DIR, f3, ignore=shutil.ignore_patterns("__pycache__", ".harness-eval"))
        ag = f3 / "AGENTS.md"
        ag.write_text(ag.read_text(encoding="utf-8") + "\nAlso keep `src/gone-too.ts` present; it must exist.\n", encoding="utf-8")
        v4 = check_regression(f3)
        expect_violations("new broken cite injected into fixture", v4)

    if failures:
        print("\nSELF-TEST FAILURES:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1
    print("self-test: all synthetic violations detected; clean state passes")
    return 0


REPO_ORIG = REPO
PINS_ORIG = PINS_PATH


def update_pins() -> int:
    lock = load_lock()
    pins = json.loads(PINS_PATH.read_text(encoding="utf-8"))
    comment = pins.get("_comment")
    updated: dict[str, str] = {}
    if comment:
        updated["_comment"] = comment
    for name, meta in sorted(lock["skills"].items()):
        if meta.get("source") != "local":
            continue
        d = AGENT_DIRS.get((meta.get("agents") or ["claude-code"])[0])
        updated[name] = content_hash(REPO / d / name)
    PINS_PATH.write_text(json.dumps(updated, indent=2) + "\n", encoding="utf-8")
    print(f"pins updated: { {k: v[:12] + '...' for k, v in updated.items() if k != '_comment'} }")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--self-test", action="store_true", help="prove synthetic violations fail the guard")
    ap.add_argument("--update-pins", action="store_true", help="rewrite pins from current trees (conscious re-vendor only)")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.update_pins:
        return update_pins()
    violations = check_integrity(load_lock()) + check_regression()
    if violations:
        print("VENDORED SKILL GUARD: FAIL", file=sys.stderr)
        for v in violations:
            print(f"  - {v}", file=sys.stderr)
        return 1
    print("vendored skill guard: OK (integrity + provenance pins + Track A fixture regression)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
