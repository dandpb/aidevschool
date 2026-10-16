#!/usr/bin/env python3
"""Reexecute C25 against a fresh complete disposable copy; never reuse a report."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time


IGNORED = {
    ".git", ".scratch", ".lavish", ".venv", "venv", "node_modules", "dist",
    "target", "coverage", "__pycache__", ".pytest_cache", ".codegraph",
    "test-results", "playwright-report", ".next", ".turbo", ".loops", ".cache",
    ".vite", ".pnpm-store", ".env", ".env.*", ".auth", ".mcp.json",
}
PROJECT = "curriculum/01_rate_limiter"
AUTHORITY = ("learner/learning_state.yaml", "learner/pipeline_status.yaml")

SEED = r'''
import json, pathlib, shutil, sys
from engines.openclaw.runner.checklist import phase_plan
from engines.openclaw.runner.pipeline_status import PipelineStatus, Phase, save_status
root=pathlib.Path.cwd().resolve(); case=sys.argv[1]; blocked=sys.argv[2]=='true'
project=root/'curriculum/01_rate_limiter'
if project.exists(): shutil.rmtree(project)
for step in phase_plan('curriculum/01_rate_limiter'):
    for artifact in step.artifacts:
        path=root/artifact.rel
        if artifact.is_dir:
            path.mkdir(parents=True,exist_ok=True)
            (path/'SYNTHETIC-QA-stub.txt').write_text('SYNTHETIC checklist fixture; no implementation or mastery.\n')
        else:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text(('SYNTHETIC QA artifact; file presence/size only.\n')*(artifact.min_bytes//40+2))
if case=='missing': (project/'docs/spec.md').unlink()
if case=='small': (project/'docs/spec.md').write_text('SYNTHETIC short\n')
(root/'learner/learning_state.yaml').write_text(
    'learner:\n  id: SYNTHETIC-QA-NOT-A-PERSON\nactive_unit:\n'
    '  id: SYNTHETIC-openclaw-cli\n  project: 01_rate_limiter\n'
    '  state: practicing\ngate:\n  implementation_blocked: '+str(blocked).lower()+'\n')
save_status(PipelineStatus(cycle_id='SYNTHETIC-C25-'+case,
    current_project='curriculum/01_rate_limiter',phase=Phase.SPEC,awaiting='curator'),
    root/'learner/pipeline_status.yaml')
'''


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def manifest(root: Path) -> dict[str, str]:
    return {
        p.relative_to(root).as_posix(): digest(p)
        for p in sorted(root.rglob("*"))
        if p.is_file() and not p.is_symlink() and "__pycache__" not in p.parts
    }


def snapshot(root: Path) -> dict[str, str]:
    result = {name: digest(root / name) for name in AUTHORITY}
    result.update({f"{PROJECT}/{name}": sha for name, sha in manifest(root / PROJECT).items()})
    return result


def run(name: str, argv: list[str], root: Path, out: Path,
        env: dict[str, str], timeout: int) -> dict:
    started = time.monotonic()
    try:
        result = subprocess.run(argv, cwd=root, env=env, capture_output=True, timeout=timeout)
        stdout, stderr, code, timed_out = result.stdout, result.stderr, result.returncode, False
    except subprocess.TimeoutExpired as exc:
        stdout, stderr, code, timed_out = exc.stdout or b"", exc.stderr or b"", None, True
    (out / f"{name}.stdout").write_bytes(stdout)
    (out / f"{name}.stderr").write_bytes(stderr)
    record = {"name": name, "argv": argv, "cwd": str(root), "exitCode": code,
              "timedOut": timed_out, "timeoutSeconds": timeout,
              "durationSeconds": round(time.monotonic() - started, 3)}
    (out / f"{name}.json").write_text(json.dumps(record, indent=2) + "\n")
    if timed_out:
        raise RuntimeError(f"{name}: subprocess timed out")
    return record


def source_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "engines/openclaw/__main__.py").is_file():
            return parent
    raise RuntimeError("cannot locate complete source root")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=source_root())
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--timeout", type=int, default=30)
    args = parser.parse_args()
    if not 1 <= args.timeout <= 180:
        parser.error("--timeout must be between 1 and 180 seconds")
    source = args.source_root.resolve()
    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=False)
    protected_before = manifest(source / "learner")
    source_hashes = manifest(source / "engines/openclaw")
    records = []
    summary = {"engineId": "openclaw", "criterion": "C25", "sourceRoot": str(source),
               "truth": "checklist simulate-grade only; no model calls or empirical mastery",
               "sourceHashes": source_hashes, "cases": records, "status": "unverified"}
    (out / "protected-source-learner-before.json").write_text(json.dumps(protected_before, indent=2) + "\n")
    try:
        if importlib.util.find_spec("yaml") is None:
            summary["status"] = "unverified"
            summary["error"] = "configured Python requires PyYAML to execute the source CLI"
            raise ModuleNotFoundError(summary["error"])
        with tempfile.TemporaryDirectory(prefix="aidevschool-c25-") as temporary:
            root = Path(temporary) / "aidevschool"
            shutil.copytree(source, root, symlinks=True, ignore=shutil.ignore_patterns(*IGNORED))
            root = root.resolve()
            if manifest(root / "engines/openclaw") != source_hashes:
                raise RuntimeError("copied OpenClaw source hash mismatch")
            for name in ("curriculum", "learner", "docs", ".mavis"):
                link = root / "engines/miniMaxEvolutionEngine" / name
                if link.is_symlink() and not link.resolve().is_relative_to(root):
                    raise RuntimeError(f"copy has escaping engine symlink: {name}")
            env = {**os.environ, "PYTHONPATH": str(root), "POSTHOG_PROJECT_TOKEN": "",
                   "POSTHOG_HOST": "", "POSTHOG_DEBUG": "false", "AIDEVSCHOOL_ENV": "production"}
            cli = [sys.executable, "-m", "engines.openclaw"]
            probe = "import pathlib,engines.openclaw.__main__ as m; p=pathlib.Path(m.__file__).resolve(); assert p.is_relative_to(pathlib.Path.cwd().resolve()),p; print(p)"
            checked = run("private-module-scope", [sys.executable, "-c", probe], root, out, env, args.timeout)
            if checked["exitCode"] != 0:
                raise RuntimeError("private module scope check failed")
            for case, blocked in (("blocked", True), ("missing", False), ("small", False), ("valid", False)):
                seeded = run(f"{case}-seed", [sys.executable, "-c", SEED, case, str(blocked).lower()], root, out, env, args.timeout)
                if seeded["exitCode"] != 0:
                    raise RuntimeError(f"{case}: fixture setup failed")
                fixture = out / f"{case}-fixture"
                shutil.copytree(root / PROJECT, fixture / "project")
                for path in AUTHORITY:
                    shutil.copy2(root / path, fixture / Path(path).name)
                before = snapshot(root)
                preview = run(f"{case}-preview", cli + ["--preview"], root, out, env, args.timeout)
                after = snapshot(root)
                if before != after:
                    raise RuntimeError(f"{case}: preview mutated durable fixture files")
                expected_preview = 0 if case == "valid" else 1
                if preview["exitCode"] != expected_preview:
                    raise RuntimeError(f"{case}: unexpected preview exit")
                learner_before = digest(root / AUTHORITY[0])
                command = cli + ["--project", PROJECT, "--phase", "spec", "--mode", "simulate", "--max-events", "2" if case == "valid" else "20"]
                advanced = run(f"{case}-advance", command, root, out, env, args.timeout)
                if advanced["exitCode"] != 1:
                    raise RuntimeError(f"{case}: expected bounded halt/partial exit 1")
                text = (out / f"{case}-advance.stdout").read_text()
                expected = {"blocked": "Learning gate is blocked", "missing": "missing file:",
                            "small": "too small", "valid": "Final phase: impl-done"}[case]
                if expected not in text:
                    raise RuntimeError(f"{case}: missing discriminating CLI result")
                if case == "valid":
                    shutil.copy2(root / AUTHORITY[1], out / "partial-pipeline.yaml")
                    resumed = run("valid-resume", cli + ["--project", PROJECT, "--mode", "simulate", "--max-events", "20"], root, out, env, args.timeout)
                    final = (out / "valid-resume.stdout").read_text()
                    if resumed["exitCode"] != 0 or "Final phase: cycle-complete" not in final or "grade=simulate advanced_by=openclaw-checklist" not in final:
                        raise RuntimeError("resume did not complete simulate-grade checklist")
                    shutil.copy2(root / AUTHORITY[1], out / "final-pipeline.yaml")
                    shutil.copy2(root / PROJECT / "status.yaml", out / "final-curriculum-status.yaml")
                if digest(root / AUTHORITY[0]) != learner_before:
                    raise RuntimeError(f"{case}: CLI mutated learner state")
                records.append({"case": case, "status": "pass", "previewReadOnly": True,
                                "learnerUnchanged": True, "fixtureDigests": before,
                                "evidence": [f"{case}-preview.json", f"{case}-advance.json"]})
            summary["status"] = "pass"
            summary["temporaryCopyRemovedOnExit"] = str(root)
    except Exception as exc:
        if summary["status"] != "unverified" or not isinstance(exc, ModuleNotFoundError):
            summary["status"] = "blocked"
        summary["error"] = f"{type(exc).__name__}: {exc}"
    protected_after = manifest(source / "learner")
    summary["sourceLearnerUnchanged"] = protected_before == protected_after
    if not summary["sourceLearnerUnchanged"]:
        summary["status"] = "blocked"
    (out / "protected-source-learner-after.json").write_text(json.dumps(protected_after, indent=2) + "\n")
    summary["evidenceDigests"] = manifest(out)
    (out / "report.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"status": summary["status"], "runtimeStatus": summary["status"],
                      "reportPath": str(out / "report.json")}))
    return {"pass": 0, "blocked": 1, "unverified": 2}[summary["status"]]


if __name__ == "__main__":
    raise SystemExit(main())
