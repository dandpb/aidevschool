"""Authority boundaries accepted in .tasks/context-authority.md."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

import pytest
import yaml

from engines.miniMaxEvolutionEngine.supervisor.autonomous import execute_request
from engines.miniMaxEvolutionEngine.supervisor.ledger import read_ledger
from engines.miniMaxEvolutionEngine.tests.test_supervisor_autonomous import (
    NOW, _config, _fake_cli, _producer, _publish, _set_pipeline, _verifier,
    workspace as workspace,
)

ROOT = Path(__file__).resolve().parents[3]


def test_supervisor_pass_stamps_authorized_bytes(workspace) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)
    before = workspace.learner.read_bytes()
    result = execute_request(
        workspace, request["request_id"], config_path=config, now=lambda: NOW,
        role_runner=lambda config, request, paths, role: _producer() if role == "producer" else _verifier(),
    )
    assert result["status"] == "completed"
    state = yaml.safe_load(workspace.pipeline.read_text())
    assert state["phase"] == "spec-done"
    assert state["grade"] == "verified"
    assert state["advanced_by"] == "devschool-spec"
    auth = [event for event in read_ledger(workspace.ledger) if event["event"] == "advancement_authorized"]
    assert len(auth) == 1
    assert auth[0]["resulting_pipeline_digest"] == hashlib.sha256(workspace.pipeline.read_bytes()).hexdigest()
    assert workspace.learner.read_bytes() == before


def test_supervisor_fail_keeps_provenance(workspace) -> None:
    _set_pipeline(workspace, grade="simulate", advanced_by="openclaw-cli")
    config = _config(workspace.repo_root, _fake_cli(workspace.repo_root))
    request = _publish(workspace)
    before = workspace.pipeline.read_bytes()
    result = execute_request(
        workspace, request["request_id"], config_path=config, now=lambda: NOW,
        role_runner=lambda config, request, paths, role: _producer() if role == "producer" else _verifier("FAIL"),
    )
    assert result["status"] == "failed"
    assert workspace.pipeline.read_bytes() == before
    assert not any(event["event"] == "advancement_authorized" for event in read_ledger(workspace.ledger))


@pytest.mark.parametrize("grade,writer", [
    ("simulate", "openclaw-checklist"), ("verified", "devschool-spec"), ("unspecified", ""),
])
def test_briefing_exposes_provenance_read_only(tmp_path: Path, grade: str, writer: str) -> None:
    engines = tmp_path / "engines"
    engines.mkdir()
    (engines / "__init__.py").write_text("")
    shutil.copytree(ROOT / "engines/openclaw", engines / "openclaw", ignore=shutil.ignore_patterns("__pycache__", "tests"))
    mme = engines / "miniMaxEvolutionEngine"
    mme.mkdir()
    (mme / "__init__.py").write_text("")
    shutil.copy2(ROOT / "engines/miniMaxEvolutionEngine/os_adapter.py", mme / "os_adapter.py")
    commands = mme / ".claude/commands/devschool"
    commands.mkdir(parents=True)
    (commands / "implement.md").write_text("existing command")
    learner = tmp_path / "learner"
    learner.mkdir()
    pipeline = learner / "pipeline_status.yaml"
    pipeline.write_text(yaml.safe_dump({"phase": "spec-done", "grade": grade, "advanced_by": writer}))
    state = learner / "learning_state.yaml"
    state.write_text("gate:\n  implementation_blocked: false\n")
    before = (pipeline.read_bytes(), state.read_bytes())
    hook = ROOT / "engines/miniMaxEvolutionEngine/.claude/hooks/briefing.sh"
    result = subprocess.run(["bash", str(hook)], cwd=tmp_path, capture_output=True, text=True,
        env={**os.environ, "CLAUDE_PROJECT_DIR": str(tmp_path), "PYTHONPATH": f"{tmp_path}:{ROOT}"})
    assert result.returncode == 0, result.stderr
    output = result.stdout
    if output.lstrip().startswith("{"):
        output = json.loads(output)["hookSpecificOutput"]["additionalContext"]
    assert f"grade: {grade}" in output
    assert f"advanced_by: {writer or '-'}" in output
    assert "simulate e unspecified não substituem verified" in output
    assert (pipeline.read_bytes(), state.read_bytes()) == before


def test_phase_runner_provenance_contract() -> None:
    base = ROOT / "engines/miniMaxEvolutionEngine/.claude"
    runner = (base / "commands/devschool/phaserunner.md").read_text()
    assert "grade" in runner and "advanced_by" in runner
    assert "simulate e unspecified não substituem verified" in runner
    assert "PASS" in runner
    writers = [path for folder in (base / "agents", base / "commands/devschool")
               for path in folder.glob("*.md") if "save_status" in path.read_text()]
    assert writers
    for path in writers:
        contract = path.read_text()
        assert "grade" in contract and "advanced_by" in contract, path
        assert "PASS" in contract, path
        if path.parent.name == "agents":
            assert "orquestrador" in contract.lower(), path


def test_mvp_authority_documented() -> None:
    context = (ROOT / "CONTEXT-MAP.md").read_text()
    for term in ("MVP Mastery", "MVP Gate", "MVP Review", "G1–G4", "gap-ladder", "FSRS"):
        assert term in context
    journey = (ROOT / "learner/CONTEXT.md").read_text()
    assert "MVP Mastery" in journey and "ledger" in journey
    mvp = (ROOT / "engines/aiDevschoolMvp/README.md").read_text()
    assert "state.json" in mvp and "ledger.jsonl" in mvp
    assert "learning_state.yaml" in mvp and "FSRS" in mvp
    cycle = (ROOT / "engines/miniMaxEvolutionEngine/CONTEXT.md").read_text()
    assert "grade" in cycle and "advanced_by" in cycle and "simulate" in cycle
    manifest = (ROOT / "engines/codexDojo/ecosystem/MANIFEST.md").read_text()
    assert "tests/test_provenance.py" in manifest
    assert "tests/test_context_authority.py" in manifest
