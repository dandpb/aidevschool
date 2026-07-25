from __future__ import annotations

import json
import os
from collections.abc import Iterator
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest
import yaml

from engines.miniMaxEvolutionEngine.supervisor import autonomous
from engines.miniMaxEvolutionEngine.supervisor.__main__ import main
from engines.miniMaxEvolutionEngine.supervisor.autonomous import (
    AutonomousError,
    RoleResult,
    execute_request,
    execute_role,
    redact,
)
from engines.miniMaxEvolutionEngine.supervisor.config import ConfigError, load_config
from engines.miniMaxEvolutionEngine.supervisor.executor import ProcessResult
from engines.miniMaxEvolutionEngine.supervisor.ledger import append_event, read_ledger
from engines.miniMaxEvolutionEngine.supervisor.models import Action, SupervisorPaths
from engines.miniMaxEvolutionEngine.supervisor.reconcile import reconcile
from engines.miniMaxEvolutionEngine.supervisor.state import load_canonical
from engines.miniMaxEvolutionEngine.supervisor.tick import tick


NOW = datetime(2026, 7, 24, 12, tzinfo=timezone.utc)
NOW_TEXT = NOW.isoformat()


def _write_yaml(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(value, sort_keys=False), encoding="utf-8")


@pytest.fixture
def workspace(tmp_path: Path) -> SupervisorPaths:
    project = tmp_path / "curriculum/02_key_value_store"
    (project / "docs").mkdir(parents=True)
    pipeline = tmp_path / "learner/pipeline_status.yaml"
    learner = tmp_path / "learner/learning_state.yaml"
    _write_yaml(
        pipeline,
        {
            "cycle_id": "cycle-2",
            "current_project": "curriculum/02_key_value_store",
            "complexity_level": 1,
            "phase": "spec",
            "awaiting": "curator",
            "blockers": [],
        },
    )
    _write_yaml(
        learner,
        {
            "active_unit": {
                "id": "U2-key-value-store",
                "project": "02_key_value_store",
                "state": "practicing",
            },
            "gate": {"implementation_blocked": False},
        },
    )
    return SupervisorPaths(tmp_path, pipeline, learner, tmp_path / "curriculum", tmp_path / "ops")


def _ids(*values: str):
    iterator: Iterator[str] = iter(values)
    return lambda: next(iterator)


def _publish(paths: SupervisorPaths) -> dict:
    decision = tick(
        paths,
        clock=lambda: NOW_TEXT,
        id_provider=_ids("run", "request", "producer-context", "verifier-context"),
    )
    assert decision.action is Action.RUN_PHASE
    return json.loads((paths.outbox / "request.json").read_text(encoding="utf-8"))


def _config(root: Path, executable: Path, **changes) -> Path:
    value = {
        "schema_version": 1,
        "enabled": True,
        "kill_switch": False,
        "executable": str(executable),
        "model": "fake-model",
        "max_concurrency": 1,
        "allowed_phases": ["spec"],
        "allowed_roles": ["curator", "verifier"],
        "permission_mode": "dontAsk",
        "producer_allowed_tools": ["Read", "EditProject"],
        "verifier_allowed_tools": ["Read"],
        "producer_max_turns": 3,
        "verifier_max_turns": 2,
        "producer_max_budget_usd": "1.00",
        "verifier_max_budget_usd": "1.00",
        "producer_timeout_seconds": 2,
        "verifier_timeout_seconds": 2,
        "daily_usd_cap": "4.00",
        "per_request_usd_cap": "2.00",
        "terminate_grace_seconds": 1,
        "stdout_byte_cap": 20_000,
        "stderr_byte_cap": 10_000,
        "environment_allowlist": ["PATH"],
    }
    value.update(changes)
    path = root / "autonomous.yaml"
    path.write_text(yaml.safe_dump(value, sort_keys=False), encoding="utf-8")
    return path


def _fake_cli(root: Path, mode: str = "pass") -> Path:
    path = root / f"fake-claude-{mode}"
    script = f'''#!/usr/bin/env python3
import json, os, signal, sys, time
mode = {mode!r}
message = json.loads(sys.stdin.readline())
prompt = message["message"]["content"]
producer = "Role: curator\\n" in prompt
capture = {{"argv": sys.argv[1:], "stdin": message, "cwd": os.getcwd(), "home": os.environ["HOME"], "pid": os.getpid(), "producer": producer}}
with open(sys.argv[0] + ".capture", "a", encoding="utf-8") as handle:
    handle.write(json.dumps(capture) + "\\n")
if mode == "sleep-producer" and producer:
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    time.sleep(30)
if mode == "nonzero-verifier" and not producer:
    sys.exit(9)
if mode == "malformed-verifier" and not producer:
    print(json.dumps({{"structured_output": {{"verdict": "MAYBE"}}, "total_cost_usd": 0.1}}))
    sys.exit(0)
if mode == "oversize-producer" and producer:
    print(json.dumps({{"structured_output": {{"status": "completed", "summary": "password=supersecret" + "X" * 30000, "artifacts": []}}, "total_cost_usd": 0.25}}))
    sys.exit(0)
if producer:
    structured = {{"status": "completed", "summary": "UNIQUE_PRODUCER_NARRATIVE", "artifacts": ["docs/spec.md"]}}
    cost = 0.25
else:
    structured = {{"verdict": "PASS", "summary": "independent", "checks": ["spec"], "evidence": ["docs/spec.md"], "feedback": ""}}
    cost = 0.10
print(json.dumps({{"structured_output": structured, "total_cost_usd": cost}}))
'''
    path.write_text(script, encoding="utf-8")
    path.chmod(0o700)
    return path


def _capture(executable: Path) -> list[dict]:
    path = Path(str(executable) + ".capture")
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def _process() -> ProcessResult:
    return ProcessResult(0, b"", b"", False, False, False, False)


def _producer(summary: str = "producer complete") -> RoleResult:
    return RoleResult(
        {"status": "completed", "summary": summary, "artifacts": ["docs/spec.md"]},
        Decimal("0.25"),
        _process(),
    )


def _verifier(verdict: str = "PASS", feedback: str = "") -> RoleResult:
    return RoleResult(
        {
            "verdict": verdict,
            "summary": "verification complete",
            "checks": ["spec"],
            "evidence": ["docs/spec.md"],
            "feedback": feedback,
        },
        Decimal("0.10"),
        _process(),
    )


def _set_pipeline(paths: SupervisorPaths, **changes: object) -> None:
    value = yaml.safe_load(paths.pipeline.read_text(encoding="utf-8"))
    value.update(changes)
    _write_yaml(paths.pipeline, value)


def _all_operations_text(paths: SupervisorPaths) -> str:
    if not paths.operations.exists():
        return ""
    return "\n".join(
        path.read_text(encoding="utf-8", errors="replace")
        for path in paths.operations.rglob("*")
        if path.is_file()
    )


def test_missing_disabled_kill_and_strict_config_fail_closed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with pytest.raises(ConfigError, match="missing"):
        load_config(tmp_path)
    executable = _fake_cli(tmp_path)
    invalid_changes = (
        {"enabled": False},
        {"kill_switch": True},
        {"schema_version": 2},
        {"permission_mode": "default"},
        {"producer_allowed_tools": ["Bash"]},
        {"producer_allowed_tools": ["TestCommands"]},
        {"verifier_allowed_tools": ["Read", "EditProject"]},
        {"environment_allowlist": ["HOME"]},
        {"allowed_phases": ["unknown"]},
        {"allowed_roles": ["unknown"]},
        {"max_concurrency": 2},
        {"per_request_usd_cap": "1.50"},
    )
    for changes in invalid_changes:
        with pytest.raises(ConfigError):
            load_config(tmp_path, _config(tmp_path, executable, **changes))
    monkeypatch.setenv("AIDEVSCHOOL_AUTONOMOUS_KILL", "1")
    with pytest.raises(ConfigError, match="kill switch"):
        load_config(tmp_path, _config(tmp_path, executable))


def test_autonomous_status_reports_disabled_without_starting_a_process(
    workspace: SupervisorPaths,
    capsys: pytest.CaptureFixture[str],
) -> None:
    executable = _fake_cli(workspace.repo_root)

    exit_code = main(
        [
            "--repo-root",
            str(workspace.repo_root),
            "--operations",
            str(workspace.operations),
            "autonomous-status",
        ]
    )

    result = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert result["status"] == "disabled"
    assert "missing" in result["reason"]
    assert _capture(executable) == []


def test_config_and_project_paths_are_confined(workspace: SupervisorPaths) -> None:
    executable = _fake_cli(workspace.repo_root)
    outside = workspace.repo_root.parent / "outside-autonomous.yaml"
    outside.write_text("{}", encoding="utf-8")
    with pytest.raises(ConfigError, match="escapes"):
        load_config(workspace.repo_root, outside)

    real_config = _config(workspace.repo_root, executable)
    linked_config = workspace.repo_root / "linked-autonomous.yaml"
    linked_config.symlink_to(real_config)
    with pytest.raises(ConfigError, match="symlinks"):
        load_config(workspace.repo_root, linked_config)

    real_project = workspace.curriculum / "real-project"
    real_project.mkdir()
    project = workspace.curriculum / "02_key_value_store"
    for child in project.iterdir():
        child.rmdir()
    project.rmdir()
    project.symlink_to(real_project, target_is_directory=True)
    config = load_config(workspace.repo_root, _config(workspace.repo_root, executable))
    request = {
        "request_id": "request",
        "cycle_id": "cycle-2",
        "project": "02_key_value_store",
        "active_unit": "U2-key-value-store",
        "phase": "spec",
        "observed_phase": "spec",
        "intended_phase": "spec-done",
        "producer_role": "curator",
        "verifier_role": "verifier",
        "producer_context_id": "producer-context",
        "verifier_context_id": "verifier-context",
        "attempt": 1,
        "retry_limit": 3,
    }
    with pytest.raises(AutonomousError, match="real direct child"):
        execute_role(config, request, workspace, "producer")


def test_real_fake_cli_passes_with_isolated_contexts_and_advances_once(
    workspace: SupervisorPaths,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)
    learner_before = workspace.learner.read_bytes()
    monkeypatch.setenv("PATH", os.environ.get("PATH", "/usr/bin:/bin"))

    result = execute_request(workspace, request["request_id"], config_path=config, now=lambda: NOW)

    assert result == {
        "status": "completed",
        "request_id": "request",
        "charged_cost_usd": "0.35",
    }
    captures = _capture(executable)
    assert len(captures) == 2
    producer, verifier = captures
    assert producer["cwd"] == verifier["cwd"] == str(workspace.repo_root)
    assert producer["home"] != verifier["home"]
    assert not Path(producer["home"]).exists()
    assert not Path(verifier["home"]).exists()
    producer_session = producer["argv"][producer["argv"].index("--session-id") + 1]
    verifier_session = verifier["argv"][verifier["argv"].index("--session-id") + 1]
    assert producer_session != verifier_session
    for capture in captures:
        assert capture["stdin"]["type"] == "user"
        assert "--no-session-persistence" in capture["argv"]
        assert "--strict-mcp-config" in capture["argv"]
        assert "--dangerously-skip-permissions" not in capture["argv"]
    producer_prompt = producer["stdin"]["message"]["content"]
    verifier_prompt = verifier["stdin"]["message"]["content"]
    assert "engines/miniMaxEvolutionEngine/.claude/agents/curator.md" in producer_prompt
    assert "engines/miniMaxEvolutionEngine/.claude/agents/verifier.md" in verifier_prompt
    assert "UNIQUE_PRODUCER_NARRATIVE" not in verifier_prompt
    allowed_start = producer["argv"].index("--allowedTools") + 1
    allowed_end = producer["argv"].index("--disallowedTools")
    allowed = producer["argv"][allowed_start:allowed_end]
    assert f"Edit(curriculum/{request['project']}/**)" in allowed
    assert "Bash" not in allowed
    assert not any(rule.startswith("Bash(") for rule in allowed)

    pipeline = yaml.safe_load(workspace.pipeline.read_text(encoding="utf-8"))
    assert pipeline["phase"] == "spec-done"
    assert pipeline["awaiting"] == "implementation"
    assert workspace.learner.read_bytes() == learner_before
    assert not (workspace.outbox / "request.json").exists()
    assert (workspace.retired / "request.json").is_file()
    assert json.loads((workspace.resolutions / "request.json").read_text())["result"] == "completed"
    events = read_ledger(workspace.ledger)
    assert sum(event["event"] == "budget_reserved" for event in events) == 2
    assert sum(event["event"] == "budget_settled" for event in events) == 2
    assert sum(event["event"] == "advancement_authorized" for event in events) == 1
    assert [event["role"] for event in events if event["event"] == "execution_started"] == [
        "producer",
        "verifier",
    ]


def test_verifier_fail_preserves_phase_and_resolves_failed(workspace: SupervisorPaths) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)
    learner_before = workspace.learner.read_bytes()
    roles: list[str] = []

    def runner(_config, _request, _paths, role):
        roles.append(role)
        return _producer() if role == "producer" else _verifier("FAIL", "spec check failed")

    result = execute_request(
        workspace,
        request["request_id"],
        config_path=config,
        now=lambda: NOW,
        role_runner=runner,
    )

    assert result["status"] == "failed"
    assert result["role"] == "verifier"
    assert roles == ["producer", "verifier"]
    assert yaml.safe_load(workspace.pipeline.read_text())["phase"] == "spec"
    assert workspace.learner.read_bytes() == learner_before
    assert json.loads((workspace.resolutions / "request.json").read_text())["result"] == "failed"
    assert not any(event["event"] == "advancement_authorized" for event in read_ledger(workspace.ledger))


def test_producer_exception_stops_verifier_and_redacts_persisted_detail(workspace: SupervisorPaths) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)
    roles: list[str] = []

    def runner(_config, _request, _paths, role):
        roles.append(role)
        raise RuntimeError("Authorization: Bearer supersecret")

    result = execute_request(
        workspace,
        request["request_id"],
        config_path=config,
        now=lambda: NOW,
        role_runner=runner,
    )

    assert result["status"] == "failed"
    assert roles == ["producer"]
    assert yaml.safe_load(workspace.pipeline.read_text())["phase"] == "spec"
    assert "supersecret" not in _all_operations_text(workspace)
    assert "[REDACTED]" in _all_operations_text(workspace)


@pytest.mark.parametrize("mode", ["malformed-verifier", "nonzero-verifier"])
def test_bad_verifier_process_fails_closed(workspace: SupervisorPaths, mode: str) -> None:
    executable = _fake_cli(workspace.repo_root, mode)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)

    result = execute_request(workspace, request["request_id"], config_path=config, now=lambda: NOW)

    assert result["status"] == "failed"
    assert result["role"] == "verifier"
    assert len(_capture(executable)) == 2
    assert yaml.safe_load(workspace.pipeline.read_text())["phase"] == "spec"
    assert not any(event["event"] == "advancement_authorized" for event in read_ledger(workspace.ledger))


def test_producer_timeout_kills_process_and_never_starts_verifier(workspace: SupervisorPaths) -> None:
    executable = _fake_cli(workspace.repo_root, "sleep-producer")
    config = _config(
        workspace.repo_root,
        executable,
        producer_timeout_seconds=1,
        terminate_grace_seconds=1,
    )
    request = _publish(workspace)

    result = execute_request(workspace, request["request_id"], config_path=config, now=lambda: NOW)

    captures = _capture(executable)
    assert result["status"] == "failed"
    assert result["role"] == "producer"
    assert len(captures) == 1
    with pytest.raises(ProcessLookupError):
        os.kill(captures[0]["pid"], 0)


def test_cancellation_kills_process_and_never_authorizes_advancement(
    workspace: SupervisorPaths,
) -> None:
    executable = _fake_cli(workspace.repo_root, "sleep-producer")
    config = _config(
        workspace.repo_root,
        executable,
        producer_timeout_seconds=10,
        terminate_grace_seconds=1,
    )
    request = _publish(workspace)

    result = execute_request(
        workspace,
        request["request_id"],
        config_path=config,
        now=lambda: NOW,
        cancellation=lambda: bool(_capture(executable)),
    )

    captures = _capture(executable)
    assert result["status"] == "failed"
    assert result["role"] == "producer"
    assert len(captures) == 1
    assert yaml.safe_load(workspace.pipeline.read_text())["phase"] == "spec"
    assert not any(
        event["event"] == "advancement_authorized"
        for event in read_ledger(workspace.ledger)
    )
    with pytest.raises(ProcessLookupError):
        os.kill(captures[0]["pid"], 0)


def test_budget_preflight_counts_unsettled_reservation(workspace: SupervisorPaths) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable, daily_usd_cap="3.00")
    request = _publish(workspace)
    append_event(
        workspace.ledger,
        {
            "schema_version": 1,
            "event": "budget_reserved",
            "cycle_id": "other-cycle",
            "request_id": "other-request",
            "project": "other-project",
            "active_unit": "other-unit",
            "observed_phase": "spec",
            "role": "producer",
            "context_id": "other-context",
            "reserved_at": NOW_TEXT,
            "amount_usd": "2.00",
        },
    )
    called = False

    def runner(*_args):
        nonlocal called
        called = True
        return _producer()

    with pytest.raises(AutonomousError, match="cannot reserve both roles"):
        execute_request(
            workspace,
            request["request_id"],
            config_path=config,
            now=lambda: NOW,
            role_runner=runner,
        )

    assert called is False
    current_events = [
        event
        for event in read_ledger(workspace.ledger)
        if event.get("request_id") == request["request_id"]
    ]
    assert not any(event["event"] in {"budget_reserved", "execution_started"} for event in current_events)


@pytest.mark.parametrize("mutating_role", ["producer", "verifier"])
def test_model_canonical_mutation_cannot_reconcile_as_success(
    workspace: SupervisorPaths,
    mutating_role: str,
) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)
    learner_before = workspace.learner.read_bytes()

    def runner(_config, _request, paths, role):
        if role == mutating_role:
            _set_pipeline(paths, phase="spec-done", awaiting="implementation")
        return _producer() if role == "producer" else _verifier("PASS")

    with pytest.raises(AutonomousError, match="canonical state changed"):
        execute_request(
            workspace,
            request["request_id"],
            config_path=config,
            now=lambda: NOW,
            role_runner=runner,
        )

    assert workspace.learner.read_bytes() == learner_before
    assert not any(event["event"] == "advancement_authorized" for event in read_ledger(workspace.ledger))
    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    outcome = reconcile(workspace, pipeline, NOW_TEXT)
    assert outcome.status == "invalid"
    assert "no matching advancement authorization" in outcome.reason
    assert not (workspace.resolutions / "request.json").exists()


def test_authorized_crash_after_advance_reconciles_without_redispatch(
    workspace: SupervisorPaths,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)
    roles: list[str] = []

    def runner(_config, _request, _paths, role):
        roles.append(role)
        return _producer() if role == "producer" else _verifier("PASS")

    original_resolve = autonomous.resolve_request
    monkeypatch.setattr(
        autonomous,
        "resolve_request",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("crash after advance")),
    )
    with pytest.raises(RuntimeError, match="crash after advance"):
        execute_request(
            workspace,
            request["request_id"],
            config_path=config,
            now=lambda: NOW,
            role_runner=runner,
        )
    monkeypatch.setattr(autonomous, "resolve_request", original_resolve)

    assert roles == ["producer", "verifier"]
    assert yaml.safe_load(workspace.pipeline.read_text())["phase"] == "spec-done"
    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    outcome = reconcile(workspace, pipeline, NOW_TEXT)
    assert outcome.status == "advanced"
    assert json.loads((workspace.resolutions / "request.json").read_text())["result"] == "reconciled"


def test_authorization_does_not_cover_changed_learner_state(
    workspace: SupervisorPaths,
) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)

    def runner(_config, _request, _paths, role):
        return _producer() if role == "producer" else _verifier("PASS")

    def external_advance_and_change_learner() -> None:
        _set_pipeline(workspace, phase="spec-done", awaiting="implementation")
        learner = yaml.safe_load(workspace.learner.read_text(encoding="utf-8"))
        learner["active_unit"]["state"] = "evaluating"
        _write_yaml(workspace.learner, learner)

    with pytest.raises(AutonomousError, match="canonical state raced"):
        execute_request(
            workspace,
            request["request_id"],
            config_path=config,
            now=lambda: NOW,
            role_runner=runner,
            before_advance=external_advance_and_change_learner,
        )

    pipeline, _ = load_canonical(workspace.pipeline, workspace.learner, workspace.curriculum)
    outcome = reconcile(workspace, pipeline, NOW_TEXT)
    assert outcome.status == "invalid"
    assert "no matching advancement authorization" in outcome.reason
    assert not (workspace.resolutions / "request.json").exists()


@pytest.mark.parametrize("producer_finished", [False, True])
def test_interrupted_execution_prevents_duplicate_dispatch(
    workspace: SupervisorPaths,
    producer_finished: bool,
) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)
    started = {
        "schema_version": 1,
        "event": "execution_started",
        "cycle_id": request["cycle_id"],
        "request_id": request["request_id"],
        "project": request["project"],
        "active_unit": request["active_unit"],
        "observed_phase": request["observed_phase"],
        "role": "producer",
        "context_id": request["producer_context_id"],
        "status": "running",
        "started_at": NOW_TEXT,
    }
    append_event(workspace.ledger, started)
    if producer_finished:
        append_event(
            workspace.ledger,
            started
            | {
                "event": "execution_finished",
                "status": "finished",
                "finished_at": NOW_TEXT,
                "charged_cost_usd": "0.25",
            },
        )

    with pytest.raises(AutonomousError, match="automatic restart|automatic redispatch"):
        execute_request(workspace, request["request_id"], config_path=config, now=lambda: NOW)
    assert _capture(executable) == []


def test_oversized_secret_output_is_not_persisted(workspace: SupervisorPaths) -> None:
    executable = _fake_cli(workspace.repo_root, "oversize-producer")
    config = _config(workspace.repo_root, executable, stdout_byte_cap=1000)
    request = _publish(workspace)

    result = execute_request(workspace, request["request_id"], config_path=config, now=lambda: NOW)

    assert result["status"] == "failed"
    assert result["role"] == "producer"
    assert "supersecret" not in _all_operations_text(workspace)


def test_compare_and_advance_race_fails_without_overwriting_change(workspace: SupervisorPaths) -> None:
    executable = _fake_cli(workspace.repo_root)
    config = _config(workspace.repo_root, executable)
    request = _publish(workspace)

    def runner(_config, _request, _paths, role):
        return _producer() if role == "producer" else _verifier("PASS")

    def race() -> None:
        _set_pipeline(workspace, awaiting="external-writer")

    with pytest.raises(AutonomousError, match="raced before advancement"):
        execute_request(
            workspace,
            request["request_id"],
            config_path=config,
            now=lambda: NOW,
            role_runner=runner,
            before_advance=race,
        )

    pipeline = yaml.safe_load(workspace.pipeline.read_text())
    assert pipeline["phase"] == "spec"
    assert pipeline["awaiting"] == "external-writer"


def test_redaction_handles_assignment_and_bearer_tokens() -> None:
    text = redact(
        'password="hunter2" Authorization: Bearer abc123 token: xyz',
        ("hunter2", "abc123", "xyz"),
    )
    assert "hunter2" not in text
    assert "abc123" not in text
    assert "xyz" not in text
    assert text.count("[REDACTED]") >= 3
