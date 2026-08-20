from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import NewType


UseCaseId = NewType("UseCaseId", str)
ScenarioId = NewType("ScenarioId", str)
RepoPath = NewType("RepoPath", str)


class ReadinessTier(StrEnum):
    CUSTOMER_READY = "customer-ready"
    VALIDATED_JOURNEY = "validated-journey"
    EXPERIMENTAL = "experimental"


class Severity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DecisionOutcome(StrEnum):
    PASS = "pass"
    CONDITIONAL_FOLLOW_UP = "conditional-follow-up"
    DOWNGRADED = "downgraded"
    BLOCKED = "blocked"
    STALE = "stale"
    UNASSESSED = "unassessed"


class ProgressSemantics(StrEnum):
    LOCAL_COMPLETION = "local-completion"
    RAW_EVIDENCE = "raw-evidence"
    READ_ONLY = "read-only"
    EXPLORATION = "exploration"


class ScenarioKind(StrEnum):
    HAPPY_PATH = "happy-path"
    RECOVERY = "recovery"
    CONTINUITY = "continuity"


class ExecutionKind(StrEnum):
    AUTOMATED = "automated"
    OBSERVED = "observed"
    MIXED = "mixed"


class EvidenceKind(StrEnum):
    PLAYWRIGHT = "playwright"
    OBSERVATION = "observation"
    DOCUMENT_REVIEW = "document-review"


@dataclass(frozen=True, slots=True)
class TierPolicy:
    tier: ReadinessTier
    required_scenario_kinds: tuple[ScenarioKind, ...]
    required_evidence_kinds: tuple[EvidenceKind, ...]
    required_manuals: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class SeverityPolicy:
    severity: Severity
    treatment: str


@dataclass(frozen=True, slots=True)
class FreshnessPolicy:
    requires_explicit_revalidate_by: bool
    invalidating_changes: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ReadinessPolicy:
    schema_version: int
    policy_version: int
    tiers: tuple[TierPolicy, ...]
    severities: tuple[SeverityPolicy, ...]
    outcomes: tuple[DecisionOutcome, ...]
    freshness: FreshnessPolicy


@dataclass(frozen=True, slots=True)
class EntryPoint:
    route: str
    prerequisites: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ManualRefs:
    student: str
    facilitator: str


@dataclass(frozen=True, slots=True)
class UseCase:
    id: UseCaseId
    surface: str
    audience: str
    intended_tier: ReadinessTier
    promise: str
    entry: EntryPoint
    progress_semantics: ProgressSemantics
    recovery: str
    next_action: str
    scenario_ids: tuple[ScenarioId, ...]
    manual_refs: ManualRefs
    source_paths: tuple[RepoPath, ...]
    owner: str


@dataclass(frozen=True, slots=True)
class ScenarioAssertion:
    id: str
    severity: Severity
    evidence: EvidenceKind
    claim: str


@dataclass(frozen=True, slots=True)
class Automation:
    working_directory: RepoPath
    argv: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Scenario:
    schema_version: int
    id: ScenarioId
    use_case_id: UseCaseId
    kind: ScenarioKind
    execution: ExecutionKind
    start_state: str
    steps: tuple[str, ...]
    assertions: tuple[ScenarioAssertion, ...]
    automation: Automation | None
    source_paths: tuple[RepoPath, ...]


@dataclass(frozen=True, slots=True)
class ReadinessDomain:
    root: str
    policy: ReadinessPolicy
    use_cases: tuple[UseCase, ...]
    scenarios: tuple[Scenario, ...]
