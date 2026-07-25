"""Fail-closed Claude Code adapter and autonomous request orchestration."""

from __future__ import annotations

import hashlib
import inspect
import json
import os
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable

import yaml

from engines.openclaw.runner.pipeline_status import Phase, load_status, save_status

from .config import AutonomousConfig, load_config
from .executor import ProcessResult, run_process
from .ledger import append_event, read_ledger
from .models import SupervisorPaths
from .outbox import OutboxError, read_request
from .plans import NEXT_AWAITING, PHASE_PLANS
from .reconcile import pending_request_document, resolve_request
from .state import load_canonical


PRODUCER_SCHEMA = {"type": "object", "additionalProperties": False, "required": ["status", "summary", "artifacts"], "properties": {"status": {"enum": ["completed", "blocked"]}, "summary": {"type": "string", "maxLength": 2000}, "artifacts": {"type": "array", "maxItems": 100, "items": {"type": "string", "maxLength": 500}}}}
VERIFIER_SCHEMA = {"type": "object", "additionalProperties": False, "required": ["verdict", "summary", "checks", "evidence", "feedback"], "properties": {"verdict": {"enum": ["PASS", "FAIL"]}, "summary": {"type": "string", "maxLength": 2000}, "checks": {"type": "array", "maxItems": 100, "items": {"type": "string", "maxLength": 500}}, "evidence": {"type": "array", "maxItems": 100, "items": {"type": "string", "maxLength": 500}}, "feedback": {"type": "string", "maxLength": 2000}}}
SECRET_PATTERN = re.compile(r'''(?ix)(authorization\s*:\s*(?:bearer\s+)?|bearer\s+|["']?(?:api[_-]?key|token|password|secret|credential)["']?\s*[=:]\s*["']?)([^\s,;"'}]+)''')


class AutonomousError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class RoleResult:
    structured: dict[str, Any]
    cost: Decimal
    process: ProcessResult


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def redact(text: str, secrets: tuple[str, ...], limit: int = 2000) -> str:
    for secret in sorted((value for value in secrets if value), key=len, reverse=True):
        text = text.replace(secret, "[REDACTED]")
    return SECRET_PATTERN.sub(lambda match: match.group(1) + "[REDACTED]", text)[:limit]


def _validate_strings(value: Any, maximum: int = 100) -> bool:
    return type(value) is list and len(value) <= maximum and all(type(item) is str and len(item) <= 500 for item in value)


def _validate_output(role: str, value: Any) -> dict[str, Any]:
    if type(value) is not dict:
        raise AutonomousError("structured_output is not an object")
    if role == "producer":
        if set(value) != {"status", "summary", "artifacts"} or value["status"] not in {"completed", "blocked"} or type(value["summary"]) is not str or len(value["summary"]) > 2000 or not _validate_strings(value["artifacts"]):
            raise AutonomousError("producer structured_output is invalid")
    elif set(value) != {"verdict", "summary", "checks", "evidence", "feedback"} or value["verdict"] not in {"PASS", "FAIL"} or any(type(value[key]) is not str or len(value[key]) > 2000 for key in ("summary", "feedback")) or not _validate_strings(value["checks"]) or not _validate_strings(value["evidence"]):
        raise AutonomousError("verifier structured_output is invalid")
    return value


def build_prompt(request: dict[str, Any], paths: SupervisorPaths, role: str) -> str:
    plan = PHASE_PLANS.get(request["observed_phase"])
    if plan is None:
        raise AutonomousError("request has no immutable phase plan")
    command_name = plan.command.removeprefix("/devschool-")
    role_name = request[role + "_role"]
    base = f"Role: {role_name}\nImmutable agent contract: engines/miniMaxEvolutionEngine/.claude/agents/{role_name}.md\nContext ID: {request[role + '_context_id']}\nRequest: {request['request_id']}\nCycle: {request['cycle_id']}\nAttempt/retry limit: {request.get('attempt', 1)}/{request.get('retry_limit', plan.retry_limit)}\nUnit: {request['active_unit']}\nObserved phase: {request['observed_phase']}\nIntended phase: {request['intended_phase']}\nCommand: {plan.command}\nCanonical project identity: curriculum/{request['project']}\nImmutable identities: producer={request['producer_role']}:{request['producer_context_id']}, verifier={request['verifier_role']}:{request['verifier_context_id']}, cycle={request['cycle_id']}, request={request['request_id']}, project={request['project']}, unit={request['active_unit']}\nImmutable engine contract: engines/miniMaxEvolutionEngine/CLAUDE.md\nImmutable command contract: engines/miniMaxEvolutionEngine/.claude/commands/devschool/{command_name}.md\n"
    if role == "producer":
        return base + "Perform only the producer work. Do not verify, advance pipeline state, edit learner state, or grant mastery. Return only the required structured result."
    return base + "Start from repository files and independently verify from zero. Do not modify files. Return only the required structured result."


DISALLOWED = (
    "Bash",
    "Agent",
    "Edit(learner/**)",
    "Edit(.mavis/**)",
    "Edit(engines/**)",
    "Edit(.git/**)",
    "Edit(**/.env*)",
    "Edit(**/*secret*)",
    "Edit(**/*credential*)",
    "Edit(**/*token*)",
    "Read(learner/**)",
    "Read(.mavis/**)",
    "Read(.git/**)",
    "Read(**/.env*)",
    "Read(~/**)",
    "Read(/Users/**)",
    "Write",
    "NotebookEdit",
    "WebFetch",
    "WebSearch",
)


def _argv(config: AutonomousConfig, request: dict[str, Any], role: str) -> list[str]:
    tools = config.producer_allowed_tools if role == "producer" else config.verifier_allowed_tools
    schema = PRODUCER_SCHEMA if role == "producer" else VERIFIER_SCHEMA
    allowed: list[str] = []
    for tool in tools:
        allowed.append(f"Edit(curriculum/{request['project']}/**)" if tool == "EditProject" else tool)
    turns = config.producer_max_turns if role == "producer" else config.verifier_max_turns
    budget = config.producer_max_budget_usd if role == "producer" else config.verifier_max_budget_usd
    session = str(uuid.uuid5(uuid.NAMESPACE_URL, f"aidevschool:{request['cycle_id']}:{request['request_id']}:{request[role + '_context_id']}:{role}"))
    available_tools = sorted({"Read", "Grep", "Glob", "Edit" if "EditProject" in tools else "Read"})
    argv = [str(config.executable), "-p", "--input-format", "stream-json", "--output-format", "json", "--model", config.model, "--max-turns", str(turns), "--max-budget-usd", str(budget), "--permission-mode", "dontAsk", "--session-id", session, "--no-session-persistence", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--tools", ",".join(available_tools)]
    argv.extend(("--allowedTools", *allowed, "--disallowedTools", *DISALLOWED))
    return argv + ["--json-schema", json.dumps(schema, separators=(",", ":"))]


def execute_role(config: AutonomousConfig, request: dict[str, Any], paths: SupervisorPaths, role: str, *, cancellation: Callable[[], bool] = lambda: False) -> RoleResult:
    prompt = build_prompt(request, paths, role)
    env = {name: os.environ[name] for name in config.environment_allowlist if name in os.environ}
    home = paths.operations / "autonomous-home" / request[role + "_context_id"]
    home.mkdir(parents=True, exist_ok=True, mode=0o700)
    env["HOME"] = str(home)
    timeout = config.producer_timeout_seconds if role == "producer" else config.verifier_timeout_seconds
    curriculum = paths.curriculum.resolve(strict=True)
    project = paths.curriculum / request["project"]
    try:
        resolved_project = project.resolve(strict=True)
        direct_child = project.parent.resolve(strict=True) == curriculum and resolved_project.parent == curriculum
    except (OSError, RuntimeError) as exc:
        raise AutonomousError("canonical project execution directory is invalid") from exc
    if not direct_child or project.is_symlink() or not project.is_dir() or resolved_project != project.absolute():
        raise AutonomousError("canonical project execution directory must be a real direct child of curriculum")
    process = run_process(_argv(config, request, role), {"type": "user", "message": {"role": "user", "content": prompt}}, cwd=paths.repo_root, env=env, timeout=timeout, grace=config.terminate_grace_seconds, stdout_cap=config.stdout_byte_cap, stderr_cap=config.stderr_byte_cap, cancelled=lambda: cancellation() or os.environ.get("AIDEVSCHOOL_AUTONOMOUS_KILL") == "1")
    if (process.timed_out or process.cancelled or process.returncode != 0
            or process.stdout_truncated or process.stderr_truncated):
        raise AutonomousError("model process timed out, was cancelled, failed, or exceeded output limit")
    try:
        envelope = json.loads(process.stdout)
        structured = _validate_output(role, envelope["structured_output"])
        cost = Decimal(str(envelope["total_cost_usd"]))
    except (KeyError, ValueError, TypeError, InvalidOperation, json.JSONDecodeError) as exc:
        raise AutonomousError("model result or cost is missing or malformed") from exc
    maximum = config.producer_max_budget_usd if role == "producer" else config.verifier_max_budget_usd
    if not cost.is_finite() or cost < 0 or cost > maximum:
        raise AutonomousError("model cost is invalid")
    return RoleResult(structured, cost, process)


def _charged(events: tuple[dict[str, Any], ...], request: dict[str, Any], now: datetime) -> tuple[Decimal, Decimal]:
    daily = request_total = Decimal("0")
    settled = {(event["request_id"], event["role"], event["context_id"]) for event in events if event["event"] == "budget_settled"}
    for event in events:
        if event["event"] == "budget_reserved" and (event["request_id"], event["role"], event["context_id"]) not in settled:
            amount_key, at_key = "amount_usd", "reserved_at"
        elif event["event"] == "budget_settled":
            amount_key, at_key = "charged_cost_usd", "settled_at"
        else:
            continue
        try:
            cost = Decimal(event[amount_key])
        except (InvalidOperation, TypeError) as exc:
            raise AutonomousError("invalid budget ledger decimal") from exc
        if not cost.is_finite() or cost < 0:
            raise AutonomousError("invalid budget ledger decimal")
        if event["request_id"] == request["request_id"]:
            request_total += cost
        try:
            if datetime.fromisoformat(event[at_key]).astimezone(timezone.utc).date() == now.date():
                daily += cost
        except ValueError as exc:
            raise AutonomousError("invalid execution ledger timestamp") from exc
    return daily, request_total


def _event(request: dict[str, Any], role: str, context: str, **extra: Any) -> dict[str, Any]:
    return {"schema_version": 1, "event": extra.pop("event"), "cycle_id": request["cycle_id"], "request_id": request["request_id"], "project": request["project"], "active_unit": request["active_unit"], "observed_phase": request["observed_phase"], "role": role, "context_id": context, **extra}


def _status_bytes(status: Any) -> bytes:
    return yaml.safe_dump(
        {
            "cycle_id": status.cycle_id,
            "current_project": status.current_project,
            "complexity_level": status.complexity_level,
            "phase": status.phase.value,
            "awaiting": status.awaiting,
            "blockers": list(status.blockers),
        },
        sort_keys=False,
        allow_unicode=True,
    ).encode("utf-8")


def _planned_pipeline_digest(paths: SupervisorPaths, request: dict[str, Any]) -> str:
    status = load_status(paths.pipeline.with_suffix(".md"))
    status.phase = Phase(request["intended_phase"])
    status.awaiting = NEXT_AWAITING[PHASE_PLANS[request["observed_phase"]].observed_phase]
    return hashlib.sha256(_status_bytes(status)).hexdigest()


def _compare_and_advance(paths: SupervisorPaths, request: dict[str, Any], baseline: tuple[str, str], before_write: Callable[[], None] | None = None) -> tuple[Any, Any]:
    current, learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
    identity = (current.cycle_id, current.project, current.phase.value, learner.unit_id)
    expected = (request["cycle_id"], request["project"], request["observed_phase"], request["active_unit"])
    if identity != expected or (_digest(paths.pipeline), _digest(paths.learner)) != baseline:
        raise AutonomousError("canonical compare-and-advance precondition failed")
    expected_result_digest = _planned_pipeline_digest(paths, request)
    authorizations = [e for e in read_ledger(paths.ledger) if e["event"] == "advancement_authorized" and e["request_id"] == request["request_id"] and e["cycle_id"] == request["cycle_id"] and e["project"] == request["project"] and e["observed_phase"] == request["observed_phase"] and e["intended_phase"] == request["intended_phase"] and e["pipeline_digest"] == baseline[0] and e["resulting_pipeline_digest"] == expected_result_digest and e["learner_digest"] == baseline[1]]
    if not authorizations:
        raise AutonomousError("canonical advancement lacks durable authorization")
    if before_write:
        before_write()
    latest, latest_learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
    if (latest.cycle_id, latest.project, latest.phase.value, latest_learner.unit_id) != expected or (_digest(paths.pipeline), _digest(paths.learner)) != baseline:
        raise AutonomousError("canonical state raced before advancement")
    status_path = paths.pipeline.with_suffix(".md")
    status = load_status(status_path)
    status.phase = Phase(request["intended_phase"])
    status.awaiting = NEXT_AWAITING[current.phase]
    save_status(status, status_path)
    advanced, unchanged = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
    if advanced.phase.value != request["intended_phase"] or _digest(paths.pipeline) != expected_result_digest or _digest(paths.learner) != baseline[1]:
        raise AutonomousError("canonical advancement did not persist as intended")
    return advanced, unchanged


def execute_request(paths: SupervisorPaths, request_id: str, *, config_path: Path | None = None, now: Callable[[], datetime] = lambda: datetime.now(timezone.utc), role_runner: Callable[..., RoleResult] = execute_role, before_advance: Callable[[], None] | None = None, cancellation: Callable[[], bool] = lambda: False) -> dict[str, Any]:
    config = load_config(paths.repo_root, config_path or paths.operations / "autonomous.yaml")
    request = pending_request_document(paths)
    if request is None or request["request_id"] != request_id:
        raise OutboxError("matching pending request does not exist")
    plan = PHASE_PLANS.get(request["observed_phase"])
    if plan is None or request["phase"] not in config.allowed_phases or not {request["producer_role"], request["verifier_role"]} <= config.allowed_roles:
        raise AutonomousError("request is not allowed by autonomous policy")
    events = read_ledger(paths.ledger)
    execution_events = {
        "budget_reserved",
        "budget_settled",
        "execution_started",
        "execution_finished",
        "advancement_authorized",
    }
    history = [
        event
        for event in events
        if event.get("request_id") == request_id and event.get("event") in execution_events
    ]
    if history:
        finished_roles = {e["role"] for e in events if e["event"] == "execution_finished" and e["request_id"] == request_id}
        if "producer" in finished_roles and "verifier" not in finished_roles:
            raise AutonomousError("producer finished but verifier did not; automatic restart is forbidden; inspect evidence and canonical state, then use fail, block, or an authorized manual reconcile")
        raise AutonomousError("interrupted autonomous execution; automatic redispatch is forbidden; inspect canonical state and unsettled budget, then use reconcile, fail, or block")
    pipeline, learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
    if (pipeline.cycle_id, pipeline.project, pipeline.phase.value, learner.unit_id) != (request["cycle_id"], request["project"], request["observed_phase"], request["active_unit"]):
        raise AutonomousError("pending request does not match canonical state")
    baseline = (_digest(paths.pipeline), _digest(paths.learner))
    secrets = tuple(os.environ[name] for name in config.environment_allowlist if name in os.environ)
    maxima = {"producer": config.producer_max_budget_usd, "verifier": config.verifier_max_budget_usd}
    timestamp = now()
    daily, request_cost = _charged(events, request, timestamp)
    combined = sum(maxima.values(), Decimal("0"))
    if daily + combined > config.daily_usd_cap or request_cost + combined > config.per_request_usd_cap:
        raise AutonomousError("budget preflight cannot reserve both roles")
    costs = Decimal("0")
    for role in ("producer", "verifier"):
        if cancellation():
            current_pipeline, current_learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
            resolve_request(paths, request_id, "failed", now().isoformat(), current_pipeline, current_learner,
                            detail="autonomous execution cancelled before model role")
            return {"status": "failed", "role": role, "summary": "autonomous execution cancelled before model role"}
        current = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
        if (_digest(paths.pipeline), _digest(paths.learner)) != baseline or current[0].phase != pipeline.phase:
            raise AutonomousError("canonical state changed before model role")
        timestamp = now()
        daily, request_cost = _charged(read_ledger(paths.ledger), request, timestamp)
        maximum = maxima[role]
        if daily + maximum > config.daily_usd_cap or request_cost + maximum > config.per_request_usd_cap:
            raise AutonomousError("budget reservation exceeds configured cap")
        context = request[f"{role}_context_id"]
        append_event(paths.ledger, _event(request, role, context, event="budget_reserved", reserved_at=timestamp.isoformat(), amount_usd=str(maximum)))
        append_event(paths.ledger, _event(request, role, context, event="execution_started", status="running", started_at=timestamp.isoformat()))
        try:
            parameters = inspect.signature(role_runner).parameters.values()
            accepts_cancellation = any(parameter.name == "cancellation" or parameter.kind is inspect.Parameter.VAR_KEYWORD
                                       for parameter in parameters)
            outcome = (role_runner(config, request, paths, role, cancellation=cancellation)
                       if accepts_cancellation else role_runner(config, request, paths, role))
            charged = outcome.cost
            status = "finished"
            summary = redact(outcome.structured.get("summary", ""), secrets)
        except BaseException as exc:
            charged = maximum
            status = "failed"
            summary = redact(f"{type(exc).__name__}: {exc}", secrets)
            append_event(paths.ledger, _event(request, role, context, event="execution_finished", status=status, finished_at=now().isoformat(), charged_cost_usd=str(charged), summary=summary))
            append_event(paths.ledger, _event(request, role, context, event="budget_settled", settled_at=now().isoformat(), reserved_usd=str(maximum), charged_cost_usd=str(charged)))
            pipeline, learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
            resolve_request(paths, request_id, "failed", now().isoformat(), pipeline, learner, detail=summary)
            return {"status": "failed", "role": role, "summary": summary}
        append_event(paths.ledger, _event(request, role, context, event="execution_finished", status=status, finished_at=now().isoformat(), charged_cost_usd=str(charged), summary=summary))
        append_event(paths.ledger, _event(request, role, context, event="budget_settled", settled_at=now().isoformat(), reserved_usd=str(maximum), charged_cost_usd=str(charged)))
        costs += charged
        if (_digest(paths.pipeline), _digest(paths.learner)) != baseline:
            raise AutonomousError("canonical state changed during model role")
        if role == "producer" and outcome.structured["status"] != "completed":
            resolve_request(paths, request_id, "failed", now().isoformat(), pipeline, learner, detail=summary)
            return {"status": "failed", "role": role, "summary": summary}
        if role == "verifier" and outcome.structured["verdict"] != "PASS":
            feedback = redact(outcome.structured["feedback"] or summary, secrets)
            resolve_request(paths, request_id, "failed", now().isoformat(), pipeline, learner, detail=feedback)
            return {"status": "failed", "role": role, "summary": feedback}
    checked, checked_learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
    if cancellation():
        resolve_request(paths, request_id, "failed", now().isoformat(), checked, checked_learner, detail="autonomous execution cancelled before advancement")
        return {"status": "failed", "role": "advancement", "summary": "autonomous execution cancelled before advancement"}
    if (_digest(paths.pipeline), _digest(paths.learner)) != baseline or (checked.cycle_id, checked.project, checked.phase, checked_learner.unit_id) != (pipeline.cycle_id, pipeline.project, pipeline.phase, learner.unit_id):
        raise AutonomousError("canonical state changed before advancement")
    append_event(paths.ledger, {"schema_version": 1, "event": "advancement_authorized", "cycle_id": request["cycle_id"], "request_id": request_id, "project": request["project"], "observed_phase": request["observed_phase"], "intended_phase": request["intended_phase"], "context_id": request["verifier_context_id"], "authorized_at": now().isoformat(), "pipeline_digest": baseline[0], "resulting_pipeline_digest": _planned_pipeline_digest(paths, request), "learner_digest": baseline[1]})
    advanced, unchanged_learner = _compare_and_advance(paths, request, baseline, before_advance)
    resolve_request(paths, request_id, "completed", now().isoformat(), advanced, unchanged_learner)
    return {"status": "completed", "request_id": request_id, "charged_cost_usd": str(costs)}
