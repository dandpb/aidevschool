#!/usr/bin/env python3
"""install.py — §4.3/§8.2 install layer. Detects the platform, validates the
curriculum at install time (§3.2.4), places the skill folder, creates the state
directory, registers the review scheduler, and adds aidevschool to the agent
skill allowlist. Idempotent: no step is applied twice.

Validation (§3.2.4) covers schema conformance, the curriculum graph, mandatory
edges, teach-back coverage, gate bindings, content files, and the shipped
instrument manifest before any platform operation."""
# SIZE_OK: §4.3.2 requires one self-contained install boundary for both platforms.
from __future__ import annotations

import importlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable


# install.py runs as a standalone script, so its own directory is not always
# already on sys.path (it is when invoked directly, not when imported by path).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _install_validation import (  # noqa: E402
    InstallError,
    validate_curriculum,
    verify_manifest,
)


def detect_platform(
    environ: dict[str, str] | os._Environ[str] = os.environ,
    home: Path | None = None,
) -> tuple[str, Path] | None:
    home = (home or Path.home()).expanduser().resolve()
    openclaw = Path(environ.get("OPENCLAW_HOME", home / ".openclaw")).expanduser().resolve()
    if (openclaw / "workspace").is_dir():
        return "openclaw", openclaw
    hermes = Path(environ.get("HERMES_HOME", home / ".hermes")).expanduser().resolve()
    if hermes.is_dir():
        return "hermes", hermes
    return None


def _platform_paths(platform: str, root: Path) -> tuple[Path, Path]:
    """Returns (skill_install_dir, state_dir) for the platform."""
    if platform == "openclaw":
        return root / "workspace" / "skills" / "aidevschool", root / "workspace" / "aidevschool-state"
    return root / "skills" / "aidevschool", root / "aidevschool-state"


def _runtime_source(skill_src: Path) -> Path:
    source = skill_src / "scripts"
    if not all(
        (source / name).is_file()
        for name in ("_core.py", "_engine.py", "_state.py", "_state_transitions.py")
    ):
        raise InstallError("bundled deterministic runtime is missing")
    return source


def place_skill(skill_src: Path, dest: Path) -> None:
    _runtime_source(skill_src)
    dest.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".aidevschool-stage-", dir=dest.parent))
    backup: Path | None = None
    try:
        shutil.copytree(
            skill_src,
            stage,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(
                "__pycache__", "install.py", "_install_validation.py", "config.json"
            ),
        )
        validate_curriculum(stage)
        verify_manifest(stage)
        if dest.exists():
            backup = Path(tempfile.mkdtemp(prefix=".aidevschool-old-", dir=dest.parent))
            backup.rmdir()
            os.replace(dest, backup)
        try:
            os.replace(stage, dest)
        except OSError:
            if backup is not None:
                os.replace(backup, dest)
            raise
        if backup is not None:
            shutil.rmtree(backup)
        print(f"[aidevschool] skill folder -> {dest} (written)")
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def _create_once(path: Path, payload: str) -> bool:
    try:
        with path.open("x", encoding="utf-8") as stream:
            stream.write(payload)
    except FileExistsError:
        return False
    return True


def create_state_dir(state_dir: Path, skill_dir: Path, config_template: Path, platform: str) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    state_path = state_dir / "state.json"
    plan_path = state_dir / "plan.json"
    if not state_path.is_file() or not plan_path.is_file():
        scripts = str(skill_dir / "scripts")
        sys.path.insert(0, scripts)
        try:
            state_module = importlib.import_module("_state")
            curriculum = json.loads((skill_dir / "curriculum.json").read_text(encoding="utf-8"))
            if state_path.is_file():
                state = json.loads(state_path.read_text(encoding="utf-8"))
            else:
                state = state_module.initial_state(curriculum, {
                    "channel": "telegram",
                    "peer_ref": "peer_unpaired",
                    "active_hours": {"start": "08:00", "end": "21:00"},
                    "locale": "en",
                })
                _create_once(state_path, json.dumps(state, indent=2) + "\n")
            generated = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            plan = state_module.build_plan(state, curriculum, 1, "00000000000000000000000000", generated)
            _create_once(plan_path, json.dumps(plan, indent=2) + "\n")
        finally:
            sys.path.remove(scripts)
    _create_once(state_dir / "ledger.jsonl", "")
    config = json.loads(config_template.read_text(encoding="utf-8"))
    config["install_platform"] = platform
    _create_once(state_dir / "config.json", json.dumps(config, indent=2) + "\n")
    print(f"[aidevschool] state folder -> {state_dir} (ready)")


Runner = Callable[..., subprocess.CompletedProcess[str]]


def _run(cmd: list[str], runner: Runner) -> subprocess.CompletedProcess[str]:
    try:
        result = runner(cmd, capture_output=True, text=True)
    except OSError as exc:
        raise InstallError(f"{cmd[0]} CLI is unavailable: {exc}") from exc
    if result.returncode:
        detail = (result.stderr or result.stdout).strip() or f"exit {result.returncode}"
        raise InstallError(f"{' '.join(cmd)} failed: {detail}")
    return result


def _lists_entry(output: str, name: str) -> bool:
    return re.search(
        rf"(?<![A-Za-z0-9_-]){re.escape(name)}(?![A-Za-z0-9_-])",
        output,
    ) is not None


def register_scheduler(platform: str, runner: Runner = subprocess.run) -> None:
    if platform == "openclaw":
        cli = "openclaw"
        job_name = "aidevschool-review"
        cmd = ["openclaw", "cron", "add", "aidevschool-review", "--every", "30m"]
    else:
        cli = "hermes"
        job_name = "aidevschool"
        cmd = ["hermes", "cron", "add", "--skill", "aidevschool", "--every", "30m"]
    listed = _run([cli, "cron", "list"], runner)
    if _lists_entry(listed.stdout, job_name):
        print("[aidevschool] scheduler already registered (idempotent skip)")
        return
    print(f"[aidevschool] scheduler: {' '.join(cmd)} ...")
    _run(cmd, runner)
    print("[aidevschool] scheduler registered ... OK")


def add_allowlist(platform: str, runner: Runner = subprocess.run) -> None:
    """Add 'aidevschool' to the agent's skill allowlist. Idempotent: checks first."""
    cli = "openclaw" if platform == "openclaw" else "hermes"
    listed = _run([cli, "skills", "list"], runner)
    if _lists_entry(listed.stdout, "aidevschool"):
        print("[aidevschool] allowlist: aidevschool already present (idempotent skip)")
        return
    _run([cli, "skills", "allow", "aidevschool"], runner)
    print("[aidevschool] allowlist: aidevschool added ... OK")


def install(
    skill_src: Path,
    environ: dict[str, str] | os._Environ[str] = os.environ,
    home: Path | None = None,
    runner: Runner = subprocess.run,
) -> None:
    detected = detect_platform(environ, home)
    if detected is None:
        raise InstallError("no supported OpenClaw or Hermes installation was detected")
    platform, root = detected
    print(f"[aidevschool] platform detected: {platform}")
    skill_dest, state_dir = _platform_paths(platform, root)
    place_skill(skill_src, skill_dest)
    create_state_dir(state_dir, skill_dest, skill_src / "config.json", platform)
    register_scheduler(platform, runner)
    add_allowlist(platform, runner)
    print("[aidevschool] install complete (re-run any time; every step is idempotent)")
    print("Next steps: send 'start' -> the tutor opens concept C01.")


def main(argv: list[str] | None = None) -> None:
    args = sys.argv[1:] if argv is None else argv
    skill_src = Path(args[0]).resolve() if args and not args[0].startswith("--") else Path(__file__).resolve().parent
    check_only = "--check" in args

    try:
        result = validate_curriculum(skill_src)
        print(f"[aidevschool] curriculum.json: {result['concepts']} concepts, DAG acyclic, order valid ... OK")
        manifest = verify_manifest(skill_src)
        print(f"[aidevschool] keys/rubrics manifest verified: {manifest[:16]}... OK")
        if check_only:
            print("[aidevschool] --check: validation passed (no changes)")
            return
        install(skill_src)
    except (InstallError, OSError, ValueError, json.JSONDecodeError) as exc:
        sys.stderr.write(f"[aidevschool] install failed: {exc}.\n")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
