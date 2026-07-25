"""Strict, local-only configuration for autonomous execution."""

from __future__ import annotations

import os
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import yaml

from .plans import ALLOWED_ROLES


class ConfigError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class AutonomousConfig:
    schema_version: int
    enabled: bool
    kill_switch: bool
    executable: Path
    model: str
    max_concurrency: int
    allowed_phases: frozenset[str]
    allowed_roles: frozenset[str]
    permission_mode: str
    producer_allowed_tools: tuple[str, ...]
    verifier_allowed_tools: tuple[str, ...]
    producer_max_turns: int
    verifier_max_turns: int
    producer_max_budget_usd: Decimal
    verifier_max_budget_usd: Decimal
    producer_timeout_seconds: int
    verifier_timeout_seconds: int
    daily_usd_cap: Decimal
    per_request_usd_cap: Decimal
    terminate_grace_seconds: int
    stdout_byte_cap: int
    stderr_byte_cap: int
    environment_allowlist: tuple[str, ...]


FIELDS = set(AutonomousConfig.__dataclass_fields__)


def _integer(data: dict[str, Any], key: str, maximum: int) -> int:
    value = data.get(key)
    if type(value) is not int or not 0 < value <= maximum:
        raise ConfigError(f"{key} must be an integer from 1 through {maximum}")
    return value


def _money(data: dict[str, Any], key: str) -> Decimal:
    value = data.get(key)
    if type(value) not in (str, int, float):
        raise ConfigError(f"{key} must be a positive decimal")
    try:
        result = Decimal(str(value))
    except InvalidOperation as exc:
        raise ConfigError(f"{key} must be a positive decimal") from exc
    if not result.is_finite() or result <= 0 or result > Decimal("100000"):
        raise ConfigError(f"{key} must be a positive bounded decimal")
    return result


def _strings(data: dict[str, Any], key: str, *, nonempty: bool = True) -> tuple[str, ...]:
    value = data.get(key)
    if type(value) is not list or any(type(item) is not str or not item for item in value):
        raise ConfigError(f"{key} must be a list of non-empty strings")
    if nonempty and not value:
        raise ConfigError(f"{key} may not be empty")
    if len(set(value)) != len(value):
        raise ConfigError(f"{key} contains duplicates")
    return tuple(value)


def load_config(repo_root: Path, path: Path | None = None) -> AutonomousConfig:
    root = repo_root.resolve(strict=True)
    candidate = path or root / ".mavis/school-supervisor/autonomous.yaml"
    if not candidate.is_absolute():
        candidate = root / candidate
    try:
        lexical = candidate.absolute().relative_to(root)
        resolved = candidate.resolve(strict=False)
        resolved.relative_to(root)
    except ValueError as exc:
        raise ConfigError("autonomous config escapes repository root") from exc
    if ".." in lexical.parts:
        raise ConfigError("autonomous config escapes repository root")
    cursor = root
    for part in lexical.parts:
        cursor /= part
        if cursor.is_symlink():
            raise ConfigError("autonomous config path may not contain symlinks")
    if not candidate.is_file():
        raise ConfigError("autonomous execution is disabled: local config is missing")
    try:
        data = yaml.safe_load(candidate.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise ConfigError(f"invalid autonomous config: {exc}") from exc
    if not isinstance(data, dict) or set(data) != FIELDS:
        raise ConfigError("autonomous config does not match the strict schema")
    if type(data["enabled"]) is not bool or type(data["kill_switch"]) is not bool:
        raise ConfigError("enabled and kill_switch must be booleans")
    if not data["enabled"] or data["kill_switch"] or os.environ.get("AIDEVSCHOOL_AUTONOMOUS_KILL") == "1":
        raise ConfigError("autonomous execution is disabled by configuration or kill switch")
    executable = Path(data["executable"]) if type(data["executable"]) is str else Path("")
    if not executable.is_absolute():
        executable = root / executable
    executable = executable.resolve(strict=True)
    if not executable.is_file() or not os.access(executable, os.X_OK):
        raise ConfigError("executable must resolve to a regular executable file")
    model = data["model"]
    if type(model) is not str or not model or len(model) > 100:
        raise ConfigError("model must be a bounded non-empty string")
    phases = frozenset(_strings(data, "allowed_phases"))
    roles = frozenset(_strings(data, "allowed_roles"))
    if not phases <= {"spec"}:
        raise ConfigError("Slice 3 autonomous execution is limited to the spec phase")
    if not roles <= ALLOWED_ROLES:
        raise ConfigError("allowed_roles contains an unknown role")
    producer_tools = _strings(data, "producer_allowed_tools")
    verifier_tools = _strings(data, "verifier_allowed_tools")
    if data["schema_version"] != 1:
        raise ConfigError("schema_version must be 1")
    if not set(producer_tools) <= {"Read", "Grep", "Glob", "EditProject"}:
        raise ConfigError("producer tools exceed the hard-coded capability ceiling")
    if not set(verifier_tools) <= {"Read", "Grep", "Glob"}:
        raise ConfigError("verifier tools exceed the hard-coded capability ceiling")
    environment = _strings(data, "environment_allowlist", nonempty=False)
    if not set(environment) <= {"PATH", "TMPDIR", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"}:
        raise ConfigError("environment allowlist exceeds the hard-coded ceiling")
    config = AutonomousConfig(
        data["schema_version"], data["enabled"], data["kill_switch"], executable, model,
        _integer(data, "max_concurrency", 1), phases, roles,
        data["permission_mode"], producer_tools, verifier_tools,
        _integer(data, "producer_max_turns", 1000), _integer(data, "verifier_max_turns", 1000),
        _money(data, "producer_max_budget_usd"), _money(data, "verifier_max_budget_usd"),
        _integer(data, "producer_timeout_seconds", 86400), _integer(data, "verifier_timeout_seconds", 86400),
        _money(data, "daily_usd_cap"),
        _money(data, "per_request_usd_cap"), _integer(data, "terminate_grace_seconds", 60),
        _integer(data, "stdout_byte_cap", 10_000_000),
        _integer(data, "stderr_byte_cap", 10_000_000),
        environment,
    )
    if config.permission_mode != "dontAsk":
        raise ConfigError("Slice 3 requires permission_mode dontAsk")
    combined = config.producer_max_budget_usd + config.verifier_max_budget_usd
    if combined > config.per_request_usd_cap or config.per_request_usd_cap > config.daily_usd_cap:
        raise ConfigError("budget maximums must not exceed request and daily caps")
    return config
