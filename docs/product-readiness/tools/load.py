from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import TypeAlias, TypeVar

import yaml

from .models import (
    Automation,
    DecisionOutcome,
    EntryPoint,
    EvidenceKind,
    ExecutionKind,
    FreshnessPolicy,
    ManualRefs,
    ProgressSemantics,
    ReadinessDomain,
    ReadinessPolicy,
    ReadinessTier,
    RepoPath,
    Scenario,
    ScenarioAssertion,
    ScenarioId,
    ScenarioKind,
    Severity,
    SeverityPolicy,
    TierPolicy,
    UseCase,
    UseCaseId,
)


JsonScalar: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]
EnumType = TypeVar("EnumType", bound=StrEnum)


@dataclass(frozen=True, slots=True)
class DomainParseError(Exception):
    path: str
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


def _mapping(value: JsonValue, path: str) -> dict[str, JsonValue]:
    if not isinstance(value, dict):
        raise DomainParseError(path, "expected a mapping")
    return value


def _sequence(value: JsonValue, path: str) -> list[JsonValue]:
    if not isinstance(value, list):
        raise DomainParseError(path, "expected a sequence")
    return value


def _text(value: JsonValue, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise DomainParseError(path, "expected a non-empty string")
    return value


def _integer(value: JsonValue, path: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise DomainParseError(path, "expected an integer")
    return value


def _boolean(value: JsonValue, path: str) -> bool:
    if not isinstance(value, bool):
        raise DomainParseError(path, "expected a boolean")
    return value


def _closed(raw: dict[str, JsonValue], required: set[str], path: str) -> None:
    missing = required - raw.keys()
    unknown = raw.keys() - required
    if missing:
        raise DomainParseError(path, f"missing fields: {', '.join(sorted(missing))}")
    if unknown:
        raise DomainParseError(path, f"unknown fields: {', '.join(sorted(unknown))}")


def _texts(value: JsonValue, path: str) -> tuple[str, ...]:
    return tuple(_text(item, f"{path}[{index}]") for index, item in enumerate(_sequence(value, path)))


def _enum_value(enum_type: type[EnumType], value: JsonValue, path: str) -> EnumType:
    text = _text(value, path)
    try:
        return enum_type(text)
    except ValueError as error:
        raise DomainParseError(path, f"unsupported value {text!r}") from error


def _load_yaml(path: Path) -> JsonValue:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise DomainParseError(str(path), "file does not exist") from error
    except yaml.YAMLError as error:
        raise DomainParseError(str(path), f"invalid YAML: {error}") from error


def _parse_policy(path: Path) -> ReadinessPolicy:
    raw = _mapping(_load_yaml(path), path.name)
    _closed(raw, {"schemaVersion", "policyVersion", "tiers", "severities", "outcomes", "freshness"}, path.name)
    tiers: list[TierPolicy] = []
    for tier_name, value in _mapping(raw["tiers"], "policy.tiers").items():
        item = _mapping(value, f"policy.tiers.{tier_name}")
        _closed(
            item,
            {"requiredScenarioKinds", "requiredEvidenceKinds", "requiredManuals"},
            f"policy.tiers.{tier_name}",
        )
        tiers.append(
            TierPolicy(
                tier=_enum_value(ReadinessTier, tier_name, f"policy.tiers.{tier_name}"),
                required_scenario_kinds=tuple(
                    _enum_value(ScenarioKind, entry, f"policy.tiers.{tier_name}.requiredScenarioKinds")
                    for entry in _sequence(item["requiredScenarioKinds"], f"policy.tiers.{tier_name}.requiredScenarioKinds")
                ),
                required_evidence_kinds=tuple(
                    _enum_value(EvidenceKind, entry, f"policy.tiers.{tier_name}.requiredEvidenceKinds")
                    for entry in _sequence(
                        item["requiredEvidenceKinds"], f"policy.tiers.{tier_name}.requiredEvidenceKinds"
                    )
                ),
                required_manuals=_texts(item["requiredManuals"], f"policy.tiers.{tier_name}.requiredManuals"),
            )
        )
    severities: list[SeverityPolicy] = []
    for severity_name, value in _mapping(raw["severities"], "policy.severities").items():
        item = _mapping(value, f"policy.severities.{severity_name}")
        _closed(item, {"treatment"}, f"policy.severities.{severity_name}")
        severities.append(
            SeverityPolicy(
                severity=_enum_value(Severity, severity_name, f"policy.severities.{severity_name}"),
                treatment=_text(item["treatment"], f"policy.severities.{severity_name}.treatment"),
            )
        )
    freshness = _mapping(raw["freshness"], "policy.freshness")
    _closed(freshness, {"requiresExplicitRevalidateBy", "invalidatingChanges"}, "policy.freshness")
    return ReadinessPolicy(
        schema_version=_integer(raw["schemaVersion"], "policy.schemaVersion"),
        policy_version=_integer(raw["policyVersion"], "policy.policyVersion"),
        tiers=tuple(tiers),
        severities=tuple(severities),
        outcomes=tuple(
            _enum_value(DecisionOutcome, item, "policy.outcomes")
            for item in _sequence(raw["outcomes"], "policy.outcomes")
        ),
        freshness=FreshnessPolicy(
            requires_explicit_revalidate_by=_boolean(
                freshness["requiresExplicitRevalidateBy"], "policy.freshness.requiresExplicitRevalidateBy"
            ),
            invalidating_changes=_texts(freshness["invalidatingChanges"], "policy.freshness.invalidatingChanges"),
        ),
    )


def _parse_use_case(value: JsonValue, index: int) -> UseCase:
    path = f"inventory.useCases[{index}]"
    raw = _mapping(value, path)
    _closed(
        raw,
        {
            "id", "surface", "audience", "intendedTier", "promise", "entry", "progressSemantics",
            "recovery", "nextAction", "scenarioIds", "manualRefs", "sourcePaths", "owner",
        },
        path,
    )
    entry = _mapping(raw["entry"], f"{path}.entry")
    _closed(entry, {"route", "prerequisites"}, f"{path}.entry")
    manuals = _mapping(raw["manualRefs"], f"{path}.manualRefs")
    _closed(manuals, {"student", "facilitator"}, f"{path}.manualRefs")
    return UseCase(
        id=UseCaseId(_text(raw["id"], f"{path}.id")),
        surface=_text(raw["surface"], f"{path}.surface"),
        audience=_text(raw["audience"], f"{path}.audience"),
        intended_tier=_enum_value(ReadinessTier, raw["intendedTier"], f"{path}.intendedTier"),
        promise=_text(raw["promise"], f"{path}.promise"),
        entry=EntryPoint(
            route=_text(entry["route"], f"{path}.entry.route"),
            prerequisites=_texts(entry["prerequisites"], f"{path}.entry.prerequisites"),
        ),
        progress_semantics=_enum_value(
            ProgressSemantics, raw["progressSemantics"], f"{path}.progressSemantics"
        ),
        recovery=_text(raw["recovery"], f"{path}.recovery"),
        next_action=_text(raw["nextAction"], f"{path}.nextAction"),
        scenario_ids=tuple(ScenarioId(item) for item in _texts(raw["scenarioIds"], f"{path}.scenarioIds")),
        manual_refs=ManualRefs(
            student=_text(manuals["student"], f"{path}.manualRefs.student"),
            facilitator=_text(manuals["facilitator"], f"{path}.manualRefs.facilitator"),
        ),
        source_paths=tuple(RepoPath(item) for item in _texts(raw["sourcePaths"], f"{path}.sourcePaths")),
        owner=_text(raw["owner"], f"{path}.owner"),
    )


def _parse_scenario(path: Path) -> Scenario:
    raw = _mapping(_load_yaml(path), path.name)
    required = {
        "schemaVersion", "id", "useCaseId", "kind", "execution", "startState", "steps",
        "assertions", "automation", "sourcePaths",
    }
    _closed(raw, required, path.name)
    assertions: list[ScenarioAssertion] = []
    for index, value in enumerate(_sequence(raw["assertions"], f"{path.name}.assertions")):
        item_path = f"{path.name}.assertions[{index}]"
        item = _mapping(value, item_path)
        _closed(item, {"id", "severity", "evidence", "claim"}, item_path)
        assertions.append(
            ScenarioAssertion(
                id=_text(item["id"], f"{item_path}.id"),
                severity=_enum_value(Severity, item["severity"], f"{item_path}.severity"),
                evidence=_enum_value(EvidenceKind, item["evidence"], f"{item_path}.evidence"),
                claim=_text(item["claim"], f"{item_path}.claim"),
            )
        )
    automation_raw = _mapping(raw["automation"], f"{path.name}.automation")
    _closed(automation_raw, {"workingDirectory", "argv"}, f"{path.name}.automation")
    return Scenario(
        schema_version=_integer(raw["schemaVersion"], f"{path.name}.schemaVersion"),
        id=ScenarioId(_text(raw["id"], f"{path.name}.id")),
        use_case_id=UseCaseId(_text(raw["useCaseId"], f"{path.name}.useCaseId")),
        kind=_enum_value(ScenarioKind, raw["kind"], f"{path.name}.kind"),
        execution=_enum_value(ExecutionKind, raw["execution"], f"{path.name}.execution"),
        start_state=_text(raw["startState"], f"{path.name}.startState"),
        steps=_texts(raw["steps"], f"{path.name}.steps"),
        assertions=tuple(assertions),
        automation=Automation(
            working_directory=RepoPath(
                _text(automation_raw["workingDirectory"], f"{path.name}.automation.workingDirectory")
            ),
            argv=_texts(automation_raw["argv"], f"{path.name}.automation.argv"),
        ),
        source_paths=tuple(RepoPath(item) for item in _texts(raw["sourcePaths"], f"{path.name}.sourcePaths")),
    )


def load_domain(readiness_root: Path) -> ReadinessDomain:
    inventory_path = readiness_root / "inventory.yaml"
    inventory = _mapping(_load_yaml(inventory_path), inventory_path.name)
    _closed(inventory, {"schemaVersion", "useCases"}, inventory_path.name)
    if _integer(inventory["schemaVersion"], "inventory.schemaVersion") != 1:
        raise DomainParseError("inventory.schemaVersion", "only schema version 1 is supported")
    use_cases = tuple(
        _parse_use_case(value, index)
        for index, value in enumerate(_sequence(inventory["useCases"], "inventory.useCases"))
    )
    scenarios = tuple(_parse_scenario(path) for path in sorted((readiness_root / "scenarios").glob("*.yaml")))
    return ReadinessDomain(
        root=str(readiness_root),
        policy=_parse_policy(readiness_root / "policy.yaml"),
        use_cases=use_cases,
        scenarios=scenarios,
    )
