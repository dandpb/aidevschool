from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

SKILL = Path(__file__).resolve().parents[2] / "aidevschool"
SPEC = importlib.util.spec_from_file_location("aidevschool_install", SKILL / "install.py")
assert SPEC and SPEC.loader
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


def fake_runner(cmd, **_kwargs):
    stdout = "aidevschool\n" if cmd[-2:] == ["skills", "list"] else ""
    return subprocess.CompletedProcess(cmd, 0, stdout, "")


def digest_tree(root: Path) -> dict[str, str]:
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in root.rglob("*")
        if path.is_file()
    }


def openclaw_root(tmp_path: Path) -> Path:
    root = tmp_path / "custom-openclaw"
    (root / "workspace").mkdir(parents=True)
    return root


def test_check_is_read_only(tmp_path):
    source = tmp_path / "source"
    shutil.copytree(SKILL, source)
    before = digest_tree(source)

    result = subprocess.run(
        ["python3", str(source / "install.py"), "--check"],
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert digest_tree(source) == before


def test_custom_root_is_detection_and_install_target(tmp_path):
    root = openclaw_root(tmp_path)

    installer.install(SKILL, {"OPENCLAW_HOME": str(root)}, tmp_path / "home", fake_runner)

    assert (root / "workspace" / "skills" / "aidevschool" / "SKILL.md").is_file()
    assert not (tmp_path / "home" / ".openclaw").exists()


def test_installed_copy_runs_outside_repository(tmp_path):
    root = openclaw_root(tmp_path)
    installer.install(SKILL, {"OPENCLAW_HOME": str(root)}, tmp_path / "home", fake_runner)
    skill = root / "workspace" / "skills" / "aidevschool"
    state = root / "workspace" / "aidevschool-state"
    isolated = tmp_path / "isolated"
    shutil.copytree(skill, isolated)

    result = subprocess.run(
        ["python3", str(isolated / "scripts" / "progress_card.py")],
        input=json.dumps({"state_dir": str(state)}),
        capture_output=True,
        text=True,
        cwd=tmp_path,
        env={"PATH": os.environ["PATH"], "PYTHONPATH": ""},
    )

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["counts"]["remaining"] == 24

    next_step = subprocess.run(
        ["python3", str(isolated / "scripts" / "next_step.py")],
        input=json.dumps({"state_dir": str(state), "skill_dir": str(isolated)}),
        capture_output=True,
        text=True,
        cwd=tmp_path,
        env={"PATH": os.environ["PATH"], "PYTHONPATH": ""},
    )

    assert next_step.returncode == 0, next_step.stderr
    assert json.loads(next_step.stdout)["concept_id"] == "C01"


def test_fresh_install_creates_complete_state(tmp_path):
    root = openclaw_root(tmp_path)
    installer.install(SKILL, {"OPENCLAW_HOME": str(root)}, tmp_path / "home", fake_runner)
    state_dir = root / "workspace" / "aidevschool-state"

    assert {path.name for path in state_dir.iterdir()} == {
        "state.json", "plan.json", "ledger.jsonl", "config.json",
    }
    state = json.loads((state_dir / "state.json").read_text())
    plan = json.loads((state_dir / "plan.json").read_text())
    config = json.loads((state_dir / "config.json").read_text())
    assert state["concepts"]["C01"]["status"] == "AVAILABLE"
    assert plan["next_available"] == ["C01"]
    assert (state_dir / "ledger.jsonl").read_bytes() == b""
    assert config["install_platform"] == "openclaw"


def test_upgrade_replaces_skill_and_preserves_state(tmp_path):
    root = openclaw_root(tmp_path)
    environ = {"OPENCLAW_HOME": str(root)}
    installer.install(SKILL, environ, tmp_path / "home", fake_runner)
    skill = root / "workspace" / "skills" / "aidevschool"
    state = root / "workspace" / "aidevschool-state" / "state.json"
    state.write_text('{"preserve": true}\n')
    before = state.read_bytes()
    (skill / "stale.txt").write_text("old")
    source = tmp_path / "upgrade"
    shutil.copytree(SKILL, source)
    (source / "SKILL.md").write_text((source / "SKILL.md").read_text() + "\nupgrade\n")

    installer.install(source, environ, tmp_path / "home", fake_runner)

    assert state.read_bytes() == before
    assert (skill / "SKILL.md").read_text().endswith("\nupgrade\n")
    assert not (skill / "stale.txt").exists()


def test_subprocess_failure_prevents_success(tmp_path, capsys):
    root = openclaw_root(tmp_path)

    def failing_runner(cmd, **_kwargs):
        return subprocess.CompletedProcess(cmd, 9, "", "permission denied")

    with pytest.raises(installer.InstallError, match="permission denied"):
        installer.install(SKILL, {"OPENCLAW_HOME": str(root)}, tmp_path / "home", failing_runner)

    assert "install complete" not in capsys.readouterr().out


def test_scheduler_does_not_swallow_unrelated_already_error():
    def failing_runner(cmd, **_kwargs):
        if cmd[-2:] == ["cron", "list"]:
            return subprocess.CompletedProcess(cmd, 0, "", "")
        return subprocess.CompletedProcess(cmd, 9, "", "already failed to authenticate")

    with pytest.raises(installer.InstallError, match="already failed to authenticate"):
        installer.register_scheduler("openclaw", failing_runner)


def test_scheduler_skips_only_the_exact_existing_job():
    calls = []

    def runner(cmd, **_kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "aidevschool-review\n", "")

    installer.register_scheduler("openclaw", runner)

    assert calls == [["openclaw", "cron", "list"]]


def test_allowlist_requires_an_exact_skill_name():
    calls = []

    def runner(cmd, **_kwargs):
        calls.append(cmd)
        stdout = "my-aidevschool-backup\n" if cmd[-2:] == ["skills", "list"] else ""
        return subprocess.CompletedProcess(cmd, 0, stdout, "")

    installer.add_allowlist("openclaw", runner)

    assert ["openclaw", "skills", "allow", "aidevschool"] in calls
